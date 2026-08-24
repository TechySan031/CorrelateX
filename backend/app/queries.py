"""
All Cypher queries for the CorrelateX API — one function per query.

PARAMETERIZATION RULE:
Every query uses parameterized values via the Neo4j driver ($param syntax).
This prevents injection and is required by the assignment spec.

EXCEPTION — variable-length path bounds:
Cypher does not support parameterizing variable-length relationship bounds.
The expression *1..N must be a literal integer at parse time, not a $parameter.
For the get_network() query, the `hops` value is therefore interpolated via
f-string. This is safe because:
  1. The route handler validates hops as an integer between 1 and 4 (inclusive)
  2. Only the validated integer is interpolated, never user-supplied strings
This is the ONE necessary exception to our "always parameterize" rule.
"""


def get_all_stocks(driver) -> list[dict]:
    """Return all stock nodes ordered by sector then ticker."""
    query = """
    MATCH (s:Stock)
    RETURN s.ticker AS ticker, s.sector AS sector
    ORDER BY s.sector, s.ticker
    """
    with driver.session() as session:
        records = session.execute_read(
            lambda tx: [record.data() for record in tx.run(query)]
        )
    return records


def get_correlations(driver, ticker: str, min_strength: float) -> list[dict] | None:
    """
    Return direct (1-hop) correlations for a stock, filtered by minimum strength.
    Returns None if the stock doesn't exist (so the route can return 404).
    """
    exists_query = "MATCH (s:Stock {ticker: $ticker}) RETURN s LIMIT 1"
    corr_query = """
    MATCH (s:Stock {ticker: $ticker})-[r:CORRELATED_WITH]-(other:Stock)
    WHERE r.strength >= $min_strength
    RETURN other.ticker AS ticker, other.sector AS sector, r.strength AS strength
    ORDER BY r.strength DESC
    """
    with driver.session() as session:
        exists = session.execute_read(
            lambda tx: tx.run(exists_query, ticker=ticker).single()
        )
        if exists is None:
            return None

        records = session.execute_read(
            lambda tx: [
                record.data()
                for record in tx.run(corr_query, ticker=ticker, min_strength=min_strength)
            ]
        )
    return records


def get_network(driver, ticker: str, hops: int, min_strength: float) -> dict:
    """
    Multi-hop network traversal around a stock.

    Returns {center, nodes, edges} where:
      - center: the origin stock's ticker + sector
      - nodes:  every DISTINCT stock reachable within `hops` hops, each with its
                MINIMUM hop distance (so a stock reachable via multiple paths
                appears exactly once, at the shortest distance)
      - edges:  every CORRELATED_WITH relationship between any two stocks in the
                discovered network, deduplicated by a.ticker < b.ticker

    The query uses two steps:
      Query 1 – Discover reachable nodes:
        MATCH variable-length paths from the center, filter by min_strength on
        ALL relationships in each path, then GROUP BY ticker+sector and take
        min(length(path)) to keep only the shortest distance.

      Query 2 – Collect edges:
        MATCH all CORRELATED_WITH relationships between nodes in the network
        (including the center), with a.ticker < b.ticker to avoid returning
        each undirected edge twice.

    NOTE: `hops` is interpolated via f-string — see module docstring for why.
    The caller MUST validate that hops is an integer between 1 and 4.
    """
    # ── Query 1: Discover reachable nodes with minimum hop distance ──
    #
    # The WITH clause aggregates by (s.ticker, s.sector) and applies min(length(path)).
    # This naturally produces one row per distinct stock, with its shortest hop count.
    # No explicit DISTINCT is needed because the GROUP BY aggregation already
    # collapses multiple paths to the same stock into a single row.
    nodes_query = f"""
    MATCH (start:Stock {{ticker: $ticker}})
    MATCH path = (start)-[:CORRELATED_WITH*1..{hops}]-(s:Stock)
    WHERE s <> start
      AND ALL(r IN relationships(path) WHERE r.strength >= $min_strength)
    WITH s.ticker AS ticker, s.sector AS sector, min(length(path)) AS hops
    RETURN ticker, sector, hops
    ORDER BY hops, ticker
    """

    # ── Query 2: Collect all edges between network members ──
    #
    # a.ticker < b.ticker ensures each undirected edge appears exactly once.
    edges_query = """
    MATCH (a:Stock)-[r:CORRELATED_WITH]-(b:Stock)
    WHERE a.ticker IN $tickers AND b.ticker IN $tickers
      AND a.ticker < b.ticker
      AND r.strength >= $min_strength
    RETURN a.ticker AS source, b.ticker AS target, r.strength AS strength
    ORDER BY r.strength DESC
    """

    with driver.session() as session:
        # Get center node info
        center = session.execute_read(
            lambda tx: tx.run(
                "MATCH (s:Stock {ticker: $ticker}) RETURN s.ticker AS ticker, s.sector AS sector",
                ticker=ticker,
            ).single()
        )
        if center is None:
            return {
                "center": {"ticker": ticker, "sector": "Unknown"},
                "nodes": [],
                "edges": [],
            }

        center_data = center.data()

        # Get reachable nodes
        nodes = session.execute_read(
            lambda tx: [
                record.data()
                for record in tx.run(nodes_query, ticker=ticker, min_strength=min_strength)
            ]
        )

        # Collect all tickers in the network for the edge query
        all_tickers = [ticker] + [n["ticker"] for n in nodes]

        # Get edges between all network members
        edges = session.execute_read(
            lambda tx: [
                record.data()
                for record in tx.run(
                    edges_query, tickers=all_tickers, min_strength=min_strength
                )
            ]
        )

    return {
        "center": center_data,
        "nodes": nodes,
        "edges": edges,
    }


def get_shortest_path(driver, from_ticker: str, to_ticker: str) -> dict | None:
    """
    Find the shortest correlation path between two stocks.

    Uses Cypher's built-in shortestPath() — a natural graph traversal that
    would require a recursive CTE with a guessed max-depth in SQL. In Cypher,
    it's a single declarative query regardless of how many intermediate hops
    the path turns out to have.

    Returns None if no path exists (the route returns 404).
    """
    query = """
    MATCH (a:Stock {ticker: $from_ticker}), (b:Stock {ticker: $to_ticker})
    MATCH path = shortestPath((a)-[:CORRELATED_WITH*]-(b))
    RETURN
      [n IN nodes(path) | {ticker: n.ticker, sector: n.sector}] AS path_nodes,
      [r IN relationships(path) | {
        source: startNode(r).ticker,
        target: endNode(r).ticker,
        strength: r.strength
      }] AS path_edges
    """
    with driver.session() as session:
        record = session.execute_read(
            lambda tx: tx.run(
                query, from_ticker=from_ticker, to_ticker=to_ticker
            ).single()
        )

    if record is None:
        return None

    return {
        "path": record["path_nodes"],
        "edges": record["path_edges"],
        "total_hops": len(record["path_edges"]),
    }


def get_clusters(driver, min_strength: float) -> list[dict]:
    """
    Find triangle cliques — groups of 3 stocks that are all mutually correlated
    above the given threshold.

    These clusters reveal hidden concentration risk: stocks that all move
    together despite appearing diversified across different names.

    The WHERE a.ticker < b.ticker < c.ticker constraint ensures each triangle
    is returned exactly once (not 6 times for each permutation of 3 nodes).
    """
    query = """
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
    """
    with driver.session() as session:
        records = session.execute_read(
            lambda tx: [record.data() for record in tx.run(query, min_strength=min_strength)]
        )

    clusters = []
    for r in records:
        avg = round(
            (r["strength_ab"] + r["strength_bc"] + r["strength_ac"]) / 3, 4
        )
        clusters.append(
            {
                "stocks": [
                    {"ticker": r["ticker_a"], "sector": r["sector_a"]},
                    {"ticker": r["ticker_b"], "sector": r["sector_b"]},
                    {"ticker": r["ticker_c"], "sector": r["sector_c"]},
                ],
                "correlations": [
                    {"pair": [r["ticker_a"], r["ticker_b"]], "strength": r["strength_ab"]},
                    {"pair": [r["ticker_b"], r["ticker_c"]], "strength": r["strength_bc"]},
                    {"pair": [r["ticker_a"], r["ticker_c"]], "strength": r["strength_ac"]},
                ],
                "avg_strength": avg,
            }
        )

    return clusters
