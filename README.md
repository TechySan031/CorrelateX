# CorrelateX — Stock Market Correlation Graph Engine

CorrelateX is a full-stack financial network intelligence platform that models stock market co-movements as a high-performance graph. By computing Pearson correlations over real historical equity returns, storing them in **CognoDB** (an openCypher-native graph database over Bolt), and providing interactive multi-hop graph visualizations and AI-narrated graph synthesis, CorrelateX helps investors and risk analysts discover hidden systemic linkages, contagion paths, and concentration cliques.

---

## 1. What is CorrelateX?

Modern financial markets are deeply interconnected. When analyzing risk, looking at individual stock metrics or simple correlation heatmaps fails to capture higher-order relationships such as:
- **Indirect Contagion:** If stock A correlates with B, and B correlates with C, how does shock in A propagate to C?
- **Hidden Portfolio Concentration:** An investor holding 3 stocks across seemingly distinct sectors might actually hold a tightly-knit triangle clique where all 3 equities move synchronously.
- **Shortest Transmission Paths:** What is the shortest chain of price dependency connecting a mega-cap tech company to an energy major?

CorrelateX calculates daily percentage return correlations using `yfinance` and `pandas`, loads the network into CognoDB as weighted undirected relationships, and exposes an exploratory UI with force-directed graphs, dynamic hop exploration, shortest-path calculation, and AI narrative generation via **Groq (LLaMA 3.3 70B)**.

---

## 2. Why a Graph Database?

Correlation is inherently **relational and multi-hop** — the most valuable market insights lie in traversals, paths, and subgraphs, not isolated records.

### Why Relational Databases (SQL) Struggle with Graph Traversals
In a relational database, finding a 2-hop or 3-hop relationship requires multiple recursive self-joins or complex Recursive Common Table Expressions (`WITH RECURSIVE`).

```sql
-- SQL: Finding stocks within 2 hops of AAPL with correlation >= 0.5
WITH RECURSIVE CorrelationPath AS (
    SELECT ticker_a, ticker_b, strength, 1 AS depth
    FROM correlations
    WHERE (ticker_a = 'AAPL' OR ticker_b = 'AAPL') AND strength >= 0.5
    
    UNION
    
    SELECT c.ticker_a, c.ticker_b, c.strength, cp.depth + 1
    FROM correlations c
    JOIN CorrelationPath cp ON (c.ticker_a = cp.ticker_b OR c.ticker_b = cp.ticker_a)
    WHERE cp.depth < 2 AND c.strength >= 0.5
)
SELECT DISTINCT CASE WHEN ticker_a = 'AAPL' THEN ticker_b ELSE ticker_a END AS correlated_stock
FROM CorrelationPath;
```

**Problems with the SQL approach:**
1. **Exponential Performance Degradation:** Each recursive join performs Cartesian product scans, resulting in severe latency as hops exceed 2.
2. **Path Explosion & Loop Handling:** Cycle prevention in SQL requires tracking visited node arrays (`VARCHAR[]`), adding massive overhead.
3. **Shortest Path Computation:** SQL has no native `shortestPath()` algorithm — finding the shortest path requires writing a custom BFS algorithm inside stored procedures or recursive CTEs with guessing limits.

### Why openCypher / CognoDB Wins
In CognoDB, the same multi-hop traversal is a concise, declarative, native graph operation optimized by index-free adjacency:

```cypher
// openCypher: Finding stocks within 2 hops with minimum hop distance
MATCH (start:Stock {ticker: 'AAPL'})
MATCH path = (start)-[:CORRELATED_WITH*1..2]-(s:Stock)
WHERE ALL(r IN relationships(path) WHERE r.strength >= 0.5)
RETURN s.ticker, s.sector, min(length(path)) AS hops
ORDER BY hops, s.ticker;
```

---

## 3. Data Model

CorrelateX uses an intuitive graph data model where stocks are vertices and correlations above the minimum threshold ($|r| \ge 0.5$) are undirected weighted edges.

```
       ┌────────────────────────┐
       │      (:Stock)          │
       ├────────────────────────┤
       │ ticker: "AAPL"         │
       │ sector: "Technology"   │
       └───────────┬────────────┘
                   │
                   │ [:CORRELATED_WITH {strength: 0.7842}]
                   │ (Undirected Pearson correlation)
                   │
       ┌───────────┴────────────┐
       │      (:Stock)          │
       ├────────────────────────┤
       │ ticker: "MSFT"         │
       │ sector: "Technology"   │
       └────────────────────────┘
```

- **Nodes (`Stock`):** `ticker` (string, unique), `sector` (string).
- **Relationships (`CORRELATED_WITH`):** `strength` (float, $-1.0 \le r \le 1.0$).

---

## 4. Architecture Overview

```
 ┌────────────────────────────────────────────────────────┐
 │                    Seed Pipeline                       │
 │  fetch_data.py  ──>  compute_correlations.py  ──>      │
 │    (yfinance)             (pandas pct_change)          │
 └───────────────────────────────┬────────────────────────┘
                                 │ load_graph.py (Bolt Driver)
                                 ▼
                   ┌───────────────────────────┐
                   │    CognoDB Graph DB       │
                   │ (Stock Nodes & Corr Edges)│
                   └─────────────┬─────────────┘
                                 │
                 FastAPI Backend │ (Neo4j Python Driver)
                                 ▼
 ┌────────────────────────────────────────────────────────┐
 │                 backend/app/main.py                    │
 │   - /health                      - /path               │
 │   - /stocks                      - /clusters           │
 │   - /stocks/{ticker}/network     - /ai-summary         │
 └───────────────────────────────┬────────────────────────┘
                                 │ JSON REST API
                                 ▼
 ┌────────────────────────────────────────────────────────┐
 │                 Next.js Frontend (App Router)          │
 │   - Force-Directed 2D Graph (react-force-graph-2d)     │
 │   - Shortest Path Visualizer (Hop-by-hop chains)       │
 │   - Triangle Clique Explorer (Concentration Risk)      │
 │   - AI Narrative Panel (Groq LLaMA 3.3 70B)            │
 └────────────────────────────────────────────────────────┘
```

---

## 5. Key Cypher Queries Explained

### 1. Fetch All Stocks
```cypher
MATCH (s:Stock)
RETURN s.ticker AS ticker, s.sector AS sector
ORDER BY s.sector, s.ticker
```
*Purpose:* Populates initial stock explorer directory and dropdown selectors.

---

### 2. Direct (1-Hop) Correlation
```cypher
MATCH (s:Stock {ticker: $ticker})-[r:CORRELATED_WITH]-(other:Stock)
WHERE r.strength >= $min_strength
RETURN other.ticker AS ticker, other.sector AS sector, r.strength AS strength
ORDER BY r.strength DESC
```
*Purpose:* Finds immediately coupled equities for the target stock.

---

### 3. Multi-Hop Network Traversal (2+ Hops)
```cypher
MATCH (start:Stock {ticker: $ticker})
MATCH path = (start)-[:CORRELATED_WITH*1..N]-(s:Stock)
WHERE s <> start
  AND ALL(r IN relationships(path) WHERE r.strength >= $min_strength)
WITH s.ticker AS ticker, s.sector AS sector, min(length(path)) AS hops
RETURN ticker, sector, hops
ORDER BY hops, ticker
```
*Design Note on Minimum Hop Distance:* Using `WITH s.ticker, s.sector, min(length(path)) AS hops` guarantees that if a stock is reachable via both a 1-hop and a 3-hop path, it appears **strictly once** in the returned network nodes at its shortest topological distance ($1$).
*Parameterization Note:* Variable-length relationship bounds (`*1..N`) cannot be parameterized in openCypher. The `hops` integer is strictly validated between 1 and 4 in the route handler before being interpolated.

---

### 4. Shortest Correlation Path (`shortestPath`)
```cypher
MATCH (a:Stock {ticker: $from_ticker}), (b:Stock {ticker: $to_ticker})
MATCH path = shortestPath((a)-[:CORRELATED_WITH*]-(b))
RETURN
  [n IN nodes(path) | {ticker: n.ticker, sector: n.sector}] AS path_nodes,
  [r IN relationships(path) | {
    source: startNode(r).ticker,
    target: endNode(r).ticker,
    strength: r.strength
  }] AS path_edges
```
*Why SQL finds this awkward:* Finding the shortest path in SQL requires either a BFS algorithm implemented in iterative procedural SQL or iterative recursive joins with cycle checking. In Cypher, `shortestPath()` evaluates natively via fast bidirectional graph traversal.

---

### 5. Triangle Cliques (Concentration Risk Clusters)
```cypher
MATCH (a:Stock)-[r1:CORRELATED_WITH]-(b:Stock)-[r2:CORRELATED_WITH]-(c:Stock)-[r3:CORRELATED_WITH]-(a)
WHERE a.ticker < b.ticker AND b.ticker < c.ticker
  AND r1.strength >= $min_strength
  AND r2.strength >= $min_strength
  AND r3.strength >= $min_strength
RETURN
  a.ticker AS ticker_a, a.sector AS sector_a,
  b.ticker AS ticker_b, b.sector AS sector_b,
  c.ticker AS ticker_c, c.sector AS sector_c,
  r1.strength AS strength_ab,
  r2.strength AS strength_bc,
  r3.strength AS strength_ac
ORDER BY (r1.strength + r2.strength + r3.strength) / 3.0 DESC
```
*Why `a.ticker < b.ticker AND b.ticker < c.ticker`:* Prevents returning 6 cyclic permutations of the exact same triangle.

---

## 6. Setup & Installation Instructions

### Step 1: Create Free CognoDB Instance
1. Go to [https://console.cognodb.com](https://console.cognodb.com) (or your CognoDB provider) and create a free account (no credit card required).
2. Create a new database instance (e.g. Free Tier `c0`).
3. Note your **Bolt URI**, **Username** (`neo4j`), and **Password**.

### Step 2: Configure Environment Variables

**Root `.env` / `backend/.env`:**
```bash
COGNODB_URI=bolt+s://your-instance.cognodb.example:7687
COGNODB_USER=neo4j
COGNODB_PASSWORD=your_database_password
GROQ_API_KEY=gsk_your_groq_api_key_here
```

**Frontend `frontend/.env.local`:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 3: Run the Seed Pipeline

From the `backend/` directory:
```bash
cd backend
pip install -r requirements.txt
python run_seed.py --threshold 0.5
```
*Output will print the date range, fetched rows, correlation matrix stats, and node/edge load status.*

### Step 4: Start the FastAPI Backend

```bash
# In backend/
uvicorn app.main:app --reload --port 8000
```
Interactive Swagger documentation is available at `http://localhost:8000/docs`.

### Step 5: Start the Next.js Frontend

```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 7. API Reference

All backend endpoints wrap database and AI operations with error isolation, returning clean 503s on connection loss rather than raw tracebacks.

| Method | Endpoint | Query / Path Params | Description |
|---|---|---|---|
| `GET` | `/health` | — | Health check & CognoDB connectivity status |
| `GET` | `/stocks` | — | List all stocks ordered by sector and ticker |
| `GET` | `/stocks/{ticker}/correlations` | `min_strength` (float, default 0.5) | Direct (1-hop) correlations for a stock |
| `GET` | `/stocks/{ticker}/network` | `hops` (int 1-4), `min_strength` (float) | Multi-hop network subgraph with deduplication |
| `GET` | `/path` | `from_ticker`, `to_ticker` | Shortest correlation path between two stocks |
| `GET` | `/clusters` | `min_strength` (float, default 0.5) | Triangle cliques ($A-B-C-A$) above threshold |
| `GET` | `/stocks/{ticker}/ai-summary` | `ticker` | Deterministic graph facts narrated via Groq LLaMA 3.3 |

---

## 8. Application UI Preview

### 1. Network Explorer (Home)
![Home Network Explorer](/docs/screenshots/home.png)
*Searchable equity cards color-coded by sector with live DB connection indicator.*

### 2. Interactive Force Graph & AI Narration (`/stocks/[ticker]`)
![Stock Detail Graph](/docs/screenshots/stock_detail.png)
*Dynamic force-directed graph with debounced hop depth (1–4) and correlation sliders.*

### 3. Shortest Path Visualizer (`/path-finder`)
![Path Finder](/docs/screenshots/path_finder.png)
*Linear step-by-step path rendering with exact correlation weights.*

### 4. Triangle Cliques (`/clusters`)
![Triangle Clusters](/docs/screenshots/clusters.png)
*Detection of 3-way mutual correlation triangles identifying systemic risk.*

---

## 9. Design Decisions & Tradeoffs

1. **Deterministic AI Facts vs. Open Prompting:**
   - *Decision:* The graph query executes first and produces structured facts (center stock, connected sectors, hop counts, strongest edges). Those facts are injected into the LLaMA 3.3 prompt with strict instructions: *"Use ONLY the facts given below, do not invent any relationship not listed."*
   - *Rationale:* Eliminates LLM hallucination of financial data while providing natural-language narration.

2. **Alphabetical Sorting of Edges Before MERGE:**
   - *Decision:* Before creating relationships in `load_graph.py`, `(ticker_a, ticker_b)` are sorted alphabetically (`a, b = sorted([ticker_a, ticker_b])`).
   - *Rationale:* openCypher `MERGE (a)-[r:CORRELATED_WITH]-(b)` maintains directionality internally. Alphabetical sorting ensures a single canonical edge is created regardless of the order pairs are supplied.

3. **Dynamic Import with `ssr: false` for `react-force-graph-2d`:**
   - *Decision:* Next.js App Router dynamically imports the HTML5 Canvas-based force graph component with SSR disabled.
   - *Rationale:* Prevents DOM/Canvas server-rendering crashes and ensures responsive client-side physics simulation.

4. **Debounced Sliders in Frontend:**
   - *Decision:* Sliders debounce API calls by 300ms.
   - *Rationale:* Prevents flooding the graph database with intermediate queries while users drag sliders across depth and correlation ranges.

---

## License
MIT License. Built for the CorrelateX Project.
