#!/usr/bin/env python3
"""
Seed pipeline entry point — orchestrates the full data pipeline:
  1. Fetch historical stock prices (yfinance)
  2. Compute pairwise correlations
  3. Load nodes and edges into CognoDB

Run from the backend/ directory:
  python run_seed.py [--threshold 0.5]
"""

import argparse
import sys

from seed.fetch_data import fetch_stock_data
from seed.compute_correlations import compute_correlations
from seed.load_graph import load_graph


def main():
    parser = argparse.ArgumentParser(description="CorrelateX seed pipeline")
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.5,
        help="Minimum |correlation| to include as an edge (default: 0.5)",
    )
    parser.add_argument(
        "--period",
        type=str,
        default="1y",
        help="yfinance period string, e.g. '1y', '6mo', '2y' (default: 1y)",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("  CorrelateX — Seed Pipeline")
    print("=" * 60)

    # Step 1: Fetch data
    print("\n-- Step 1: Fetching historical prices --")
    prices, ticker_to_sector = fetch_stock_data(period=args.period)

    if prices.empty:
        print("[ERROR] No price data fetched. Aborting.")
        sys.exit(1)

    # Step 2: Compute correlations
    print("\n-- Step 2: Computing pairwise correlations --")
    edges = compute_correlations(prices, threshold=args.threshold)

    if not edges:
        print(f"[!] No edges above threshold {args.threshold}. "
              "Consider lowering --threshold.")

    # Step 3: Load into CognoDB
    print("\n-- Step 3: Loading graph into CognoDB --")
    load_graph(ticker_to_sector, edges)

    print("\n" + "=" * 60)
    print("  [OK] Seed pipeline complete!")
    print(f"    Stocks: {len(ticker_to_sector)}")
    print(f"    Correlation edges: {len(edges)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
