"""
Step 2 of the seed pipeline: Compute pairwise Pearson correlations.

Converts daily closing prices to daily % returns (prices.pct_change()),
computes the full correlation matrix (returns.corr()), then flattens to
an edge list keeping only pairs with |correlation| >= threshold.
"""

import pandas as pd


def compute_correlations(
    prices: pd.DataFrame,
    threshold: float = 0.5,
) -> list[tuple[str, str, float]]:
    """
    Compute pairwise Pearson correlations from daily closing prices.

    Args:
        prices: DataFrame of daily closing prices (date × ticker)
        threshold: Minimum |correlation| to include in the edge list

    Returns:
        List of (ticker_a, ticker_b, correlation) tuples, sorted alphabetically
        by ticker pair to ensure a canonical ordering.
    """
    # Convert prices to daily % returns; drop the first row (NaN from pct_change)
    returns = prices.pct_change().dropna()

    print(f"Computing correlations for {len(returns.columns)} stocks "
          f"over {len(returns)} trading days")

    corr_matrix = returns.corr()

    # Flatten the upper triangle of the correlation matrix to an edge list.
    # We only take the upper triangle (i < j) to avoid duplicate pairs,
    # and sort tickers alphabetically within each pair for a canonical key.
    edges: list[tuple[str, str, float]] = []
    tickers = sorted(corr_matrix.columns.tolist())

    for i in range(len(tickers)):
        for j in range(i + 1, len(tickers)):
            corr_value = corr_matrix.loc[tickers[i], tickers[j]]
            if pd.notna(corr_value) and abs(corr_value) >= threshold:
                # Alphabetical sort is guaranteed by iteration order (i < j on sorted list),
                # but we make it explicit for clarity.
                a, b = sorted([tickers[i], tickers[j]])
                edges.append((a, b, round(float(corr_value), 4)))

    # Summary stats
    total_pairs = len(tickers) * (len(tickers) - 1) // 2
    print(f"\n[OK] Correlation threshold: |r| >= {threshold}")
    print(f"  Total possible pairs: {total_pairs}")
    print(f"  Edges above threshold: {len(edges)}")

    if edges:
        print("\n  Top 10 strongest correlations:")
        for a, b, c in sorted(edges, key=lambda x: abs(x[2]), reverse=True)[:10]:
            print(f"    {a:5s} <-> {b:5s}  r = {c:+.4f}")

    return edges


if __name__ == "__main__":
    from fetch_data import fetch_stock_data

    prices, _ = fetch_stock_data()
    edges = compute_correlations(prices, threshold=0.5)
    print(f"\nTotal edges to load: {len(edges)}")
