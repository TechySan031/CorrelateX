"""
FastAPI application for CorrelateX — Stock Correlation Network API.

Provides endpoints for querying stock correlations, multi-hop networks,
shortest paths, triangle clusters, and AI-narrated network summaries.
All database access is managed via the Neo4j driver singleton with robust
error handling (clean 503s on DB failure, never leaking stack traces).
"""

from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, Path, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.db import db
from app import queries
from app.ai_summary import generate_ai_summary


# ── Lifespan Context Manager ──────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage database driver lifecycle across the application's lifetime."""
    db.connect()
    yield
    db.close()


# ── FastAPI App Setup ─────────────────────────────────────────────────

app = FastAPI(
    title="CorrelateX API",
    description=(
        "Stock Correlation Network API powered by CognoDB graph database "
        "and Groq AI narration."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend clients (Next.js development and production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://correlatex.vercel.app",
        "*",  # Permissive for demo/deployment flexibility
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic Response Models ──────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    database: str
    version: str = "1.0.0"


class StockItem(BaseModel):
    ticker: str
    sector: str


class CorrelationItem(BaseModel):
    ticker: str
    sector: str
    strength: float


class NetworkNode(BaseModel):
    ticker: str
    sector: str
    hops: int


class NetworkEdge(BaseModel):
    source: str
    target: str
    strength: float


class NetworkResponse(BaseModel):
    center: StockItem
    nodes: list[NetworkNode]
    edges: list[NetworkEdge]


class PathEdge(BaseModel):
    source: str
    target: str
    strength: float


class ShortestPathResponse(BaseModel):
    path: list[StockItem]
    edges: list[PathEdge]
    total_hops: int


class ClusterCorrelation(BaseModel):
    pair: list[str]
    strength: float


class ClusterItem(BaseModel):
    stocks: list[StockItem]
    correlations: list[ClusterCorrelation]
    avg_strength: float


class AiSummaryResponse(BaseModel):
    ticker: str
    summary: str


def _ensure_db():
    """Verify that the database driver is connected and healthy."""
    if db.driver is None:
        db.connect()
    if db.driver is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not initialized. Check COGNODB_URI and credentials.",
        )


def _execute_query(fn, *args, **kwargs):
    """Execute a query function with automatic retry on defunct or stale connections."""
    _ensure_db()
    try:
        return fn(db.driver, *args, **kwargs)
    except Exception as first_err:
        # If connection died or socket became defunct, reconnect and retry once
        try:
            db.connect()
            return fn(db.driver, *args, **kwargs)
        except Exception:
            raise first_err


# ── Endpoints ─────────────────────────────────────────────────────────

@app.get("/", tags=["System"])
async def root():
    """
    Root endpoint providing API metadata and quick links.
    """
    return {
        "name": "CorrelateX — Stock Market Correlation Graph Engine",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "stocks": "/stocks",
            "correlations": "/stocks/{ticker}/correlations",
            "network": "/stocks/{ticker}/network?hops=2&min_strength=0.5",
            "path": "/path?from_ticker=XOM&to_ticker=COP",
            "clusters": "/clusters?min_strength=0.5",
            "ai_summary": "/stocks/{ticker}/ai-summary",
        },
    }


@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Health check endpoint verifying API and CognoDB graph database connectivity.
    """
    db_status = "connected"
    try:
        if db.driver is None:
            db_status = "unreachable (driver uninitialized)"
        else:
            db.verify_connectivity()
            db_status = "connected"
    except Exception as e:
        db_status = f"unreachable: {str(e)[:80]}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "version": "1.0.0",
    }


@app.get("/stocks", response_model=list[StockItem], tags=["Stocks"])
async def list_stocks():
    """
    Retrieve all stock nodes in the correlation graph, ordered by sector and ticker.
    """
    try:
        stocks = _execute_query(queries.get_all_stocks)
        return stocks
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database query failed while fetching stocks: {str(e)[:120]}",
        )


@app.get(
    "/stocks/{ticker}/correlations",
    response_model=list[CorrelationItem],
    tags=["Stocks"],
)
async def get_stock_correlations(
    ticker: str = Path(..., description="Stock ticker symbol (e.g. AAPL)"),
    min_strength: float = Query(
        0.5, ge=-1.0, le=1.0, description="Minimum correlation strength filter"
    ),
):
    """
    Retrieve direct (1-hop) correlations for a specific stock above min_strength.
    Returns 404 if the requested stock is not found in the database.
    """
    ticker = ticker.upper()
    try:
        results = _execute_query(
            queries.get_correlations, ticker=ticker, min_strength=min_strength
        )
        if results is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Stock '{ticker}' not found in database.",
            )
        return results
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database query failed while fetching correlations for {ticker}: {str(e)[:120]}",
        )


@app.get(
    "/stocks/{ticker}/network",
    response_model=NetworkResponse,
    tags=["Network"],
)
async def get_stock_network(
    ticker: str = Path(..., description="Stock ticker symbol (e.g. AAPL)"),
    hops: int = Query(2, description="Multi-hop depth (must be between 1 and 4)"),
    min_strength: float = Query(
        0.5, ge=0.0, le=1.0, description="Minimum correlation strength filter"
    ),
):
    """
    Retrieve multi-hop correlation network around a central stock.
    Hops must be between 1 and 4. Rejects with HTTP 400 otherwise.
    """
    if hops < 1 or hops > 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Hops must be an integer between 1 and 4 inclusive. Received: {hops}",
        )

    ticker = ticker.upper()
    try:
        network = _execute_query(
            queries.get_network, ticker=ticker, hops=hops, min_strength=min_strength
        )
        if not network.get("nodes") and network.get("center", {}).get("sector") == "Unknown":
            stocks = _execute_query(queries.get_all_stocks)
            existing_tickers = {s["ticker"] for s in stocks}
            if ticker not in existing_tickers:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Stock '{ticker}' not found in database.",
                )
        return network
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database query failed while fetching network for {ticker}: {str(e)[:120]}",
        )


@app.get("/path", response_model=ShortestPathResponse, tags=["Path Finding"])
async def get_shortest_path(
    from_ticker: str = Query(..., description="Origin stock ticker symbol"),
    to_ticker: str = Query(..., description="Destination stock ticker symbol"),
):
    """
    Find the shortest correlation path between two stocks using openCypher shortestPath().
    Returns 404 if no path exists between the given stocks.
    """
    from_ticker = from_ticker.upper()
    to_ticker = to_ticker.upper()

    if from_ticker == to_ticker:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="from_ticker and to_ticker must be distinct stock symbols.",
        )

    try:
        path_result = _execute_query(
            queries.get_shortest_path, from_ticker=from_ticker, to_ticker=to_ticker
        )
        if path_result is None or not path_result.get("path"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No correlation path found between {from_ticker} and {to_ticker}.",
            )
        return path_result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database query failed while finding path from {from_ticker} to {to_ticker}: {str(e)[:120]}",
        )


@app.get("/clusters", response_model=list[ClusterItem], tags=["Clusters"])
async def get_correlation_clusters(
    min_strength: float = Query(
        0.5, ge=0.0, le=1.0, description="Minimum correlation threshold for triangle edges"
    ),
):
    """
    Find triangle cliques (3 mutually correlated stocks) indicating hidden concentration risk.
    """
    try:
        clusters = _execute_query(queries.get_clusters, min_strength=min_strength)
        return clusters
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database query failed while fetching clusters: {str(e)[:120]}",
        )


@app.get(
    "/stocks/{ticker}/ai-summary",
    response_model=AiSummaryResponse,
    tags=["AI Narration"],
)
async def get_stock_ai_summary(
    ticker: str = Path(..., description="Stock ticker symbol (e.g. AAPL)"),
):
    """
    Generate an AI-narrated summary of a stock's correlation network using Groq (llama-3.3-70b-versatile).
    Structured facts are queried from the graph database FIRST and injected into the prompt.
    """
    ticker = ticker.upper()
    try:
        network = _execute_query(
            queries.get_network, ticker=ticker, hops=2, min_strength=0.5
        )
        summary_text = await generate_ai_summary(ticker, network)
        return {"ticker": ticker, "summary": summary_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to generate summary for {ticker}: {str(e)[:120]}",
        )
