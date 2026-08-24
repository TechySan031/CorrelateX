"""
Step 3 of the seed pipeline: Load stock nodes and correlation edges into CognoDB.

Uses MERGE (not CREATE) for idempotent re-runs — safe to run multiple times
without creating duplicate nodes or relationships.

Connection details are read from environment variables ONLY (never hardcoded).
Fails gracefully with a clear message if credentials are missing or DB is unreachable.
"""

import os
import sys

from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError
from dotenv import load_dotenv

load_dotenv()


# ── Transaction functions ──────────────────────────────────────────────
# Defined at module level so they can be passed to session.execute_write()
# without lambda-in-a-loop closure issues.

def _merge_stock_node(tx, ticker: str, sector: str):
    """Create or update a Stock node. MERGE ensures idempotency."""
    tx.run(
        "MERGE (s:Stock {ticker: $ticker}) SET s.sector = $sector",
        ticker=ticker,
        sector=sector,
    )


def _merge_correlation_edge(tx, ticker_a: str, ticker_b: str, strength: float):
    """Create or update a CORRELATED_WITH relationship. MERGE ensures idempotency."""
    tx.run(
        """
        MATCH (a:Stock {ticker: $ticker_a}), (b:Stock {ticker: $ticker_b})
        MERGE (a)-[r:CORRELATED_WITH]-(b)
        SET r.strength = $strength
        """,
        ticker_a=ticker_a,
        ticker_b=ticker_b,
        strength=strength,
    )


# ── Main loader ───────────────────────────────────────────────────────

def load_graph(
    ticker_to_sector: dict[str, str],
    edges: list[tuple[str, str, float]],
) -> None:
    """
    Load stock nodes and correlation edges into CognoDB.

    Args:
        ticker_to_sector: Mapping of ticker → sector for node creation
        edges: List of (ticker_a, ticker_b, correlation) tuples
    """
    # ── 1. Validate environment variables ──
    uri = os.getenv("COGNODB_URI")
    user = os.getenv("COGNODB_USER")
    password = os.getenv("COGNODB_PASSWORD")

    missing = []
    if not uri:
        missing.append("COGNODB_URI")
    if not user:
        missing.append("COGNODB_USER")
    if not password:
        missing.append("COGNODB_PASSWORD")

    if missing:
        print(f"[ERROR] Missing required environment variables: {', '.join(missing)}")
        print("  Please set them in your .env file. See .env.example for reference.")
        sys.exit(1)

    # ── 2. Connect to CognoDB ──
    try:
        driver = GraphDatabase.driver(uri, auth=(user, password))
        driver.verify_connectivity()
        print(f"[OK] Connected to CognoDB at {uri}")
    except ServiceUnavailable as e:
        print(f"[ERROR] CognoDB is unreachable at {uri}")
        print(f"  Details: {e}")
        print("  Please verify the URI and ensure the database is running.")
        sys.exit(1)
    except AuthError as e:
        print(f"[ERROR] Authentication failed for CognoDB at {uri}")
        print(f"  Details: {e}")
        print("  Please check COGNODB_USER and COGNODB_PASSWORD.")
        sys.exit(1)

    # ── 3. Load nodes and edges ──
    try:
        with driver.session() as session:
            # Create stock nodes
            node_count = 0
            for ticker, sector in ticker_to_sector.items():
                session.execute_write(_merge_stock_node, ticker, sector)
                node_count += 1
            print(f"[OK] Loaded {node_count} stock nodes")

            # Create correlation edges
            edge_count = 0
            for ticker_a, ticker_b, strength in edges:
                # EDGE DEDUPLICATION: Sort tickers alphabetically before MERGE.
                #
                # Even though compute_correlations.py already sorts pairs, we
                # sort again here as a safety measure. MERGE on an undirected
                # pattern like (a)-[r:CORRELATED_WITH]-(b) still considers the
                # direction of the match internally. If the same pair were ever
                # passed in different orders (e.g., (MSFT, AAPL) vs (AAPL, MSFT)),
                # MERGE could create two separate relationships. Sorting here
                # guarantees a single canonical direction: the alphabetically-first
                # ticker is always node (a).
                a, b = sorted([ticker_a, ticker_b])
                session.execute_write(_merge_correlation_edge, a, b, strength)
                edge_count += 1

            print(f"[OK] Loaded {edge_count} correlation edges")

    finally:
        driver.close()
        print("[OK] CognoDB connection closed")


if __name__ == "__main__":
    from fetch_data import fetch_stock_data
    from compute_correlations import compute_correlations

    prices, sectors = fetch_stock_data()
    edges = compute_correlations(prices)
    load_graph(sectors, edges)
