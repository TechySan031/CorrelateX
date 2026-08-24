"""
Step 1 of the seed pipeline: Fetch ~1 year of daily closing prices via yfinance.

Uses a single batch yf.download() call (not per-ticker loops) to minimize
API roundtrips and avoid Yahoo Finance rate limiting.
"""

import yfinance as yf
import pandas as pd


# 20 stocks across 5 sectors — chosen for a mix of high and low intra-sector correlation.
STOCKS_BY_SECTOR: dict[str, list[str]] = {
    "Technology": ["AAPL", "MSFT", "GOOGL", "NVDA", "META", "AMZN"],
    "Finance": ["JPM", "BAC", "GS", "MS"],
    "Energy": ["XOM", "CVX", "COP"],
    "Healthcare": ["JNJ", "PFE", "UNH"],
    "Consumer": ["PG", "KO", "WMT", "MCD"],
}


def get_ticker_to_sector() -> dict[str, str]:
    """Build a flat ticker → sector mapping from the sector groups."""
    return {
        ticker: sector
        for sector, tickers in STOCKS_BY_SECTOR.items()
        for ticker in tickers
    }


def fetch_stock_data(period: str = "1y") -> tuple[pd.DataFrame, dict[str, str]]:
    """
    Fetch daily adjusted close prices for all stocks.

    Returns:
        prices: DataFrame indexed by date, one column per ticker
        ticker_to_sector: dict mapping ticker → sector (only tickers with data)
    """
    all_tickers = [t for tickers in STOCKS_BY_SECTOR.values() for t in tickers]
    ticker_to_sector = get_ticker_to_sector()

    print(f"Fetching {len(all_tickers)} tickers: {', '.join(all_tickers)}")
    print(f"Period: {period}")

    data = yf.download(all_tickers, period=period, auto_adjust=True, threads=True)

    # yf.download returns MultiIndex columns for multiple tickers; extract Close.
    if isinstance(data.columns, pd.MultiIndex):
        prices = data["Close"]
    else:
        # Single ticker edge case
        prices = data[["Close"]].rename(columns={"Close": all_tickers[0]})

    # Drop tickers that returned all NaN (failed downloads)
    prices = prices.dropna(axis=1, how="all")

    # Report results
    fetched = set(prices.columns)
    missing = set(all_tickers) - fetched
    if missing:
        print(f"[!] WARNING: Failed to fetch data for: {', '.join(sorted(missing))}")

    print(f"[OK] Date range: {prices.index[0].strftime('%Y-%m-%d')} -> {prices.index[-1].strftime('%Y-%m-%d')}")
    print(f"[OK] Trading days: {len(prices)}, Tickers fetched: {len(prices.columns)}")

    # Filter sector map to only include tickers we actually have data for
    ticker_to_sector = {t: s for t, s in ticker_to_sector.items() if t in fetched}

    return prices, ticker_to_sector


if __name__ == "__main__":
    prices, sectors = fetch_stock_data()
    print("\nSample prices (last 5 trading days):")
    print(prices.tail().to_string())
    print(f"\nSectors: {sectors}")
