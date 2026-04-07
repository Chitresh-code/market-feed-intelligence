from __future__ import annotations

import argparse
from datetime import datetime, timezone

from adapters.base import FetchWindow
from adapters.finnhub_adapter import FinnhubNewsAdapter, FinnhubRequestSpec
from adapters.fred_adapter import FredMacroAdapter, MacroSeriesSpec
from adapters.yfinance_adapter import MarketTickerSpec, YFinanceMarketAdapter
from db.session import init_db, session_scope
from domain.models import RawDatasetEnvelope


def default_market_specs() -> list[MarketTickerSpec]:
    return [
        MarketTickerSpec("^NSEI", "Nifty 50", "market_index", "INR"),
        MarketTickerSpec("^NSEBANK", "Nifty Bank", "sector_proxy_market", "INR"),
        MarketTickerSpec("HINDUNILVR.NS", "FMCG proxy (Hindustan Unilever)", "sector_proxy_market", "INR"),
        MarketTickerSpec("^CNXIT", "Nifty IT", "sector_proxy_market", "INR"),
        MarketTickerSpec("MID150BEES.NS", "Midcap 150 ETF proxy", "sector_proxy_market", "INR"),
        MarketTickerSpec("SMALLCAP.NS", "Small-cap proxy", "sector_proxy_market", "INR"),
        MarketTickerSpec("MARUTI.NS", "Auto proxy (Maruti Suzuki)", "sector_proxy_market", "INR"),
        MarketTickerSpec("LT.NS", "Infrastructure proxy (Larsen & Toubro)", "sector_proxy_market", "INR"),
        MarketTickerSpec("SBIN.NS", "PSU Bank proxy (State Bank of India)", "sector_proxy_market", "INR"),
        MarketTickerSpec("TITAN.NS", "Consumption proxy (Titan)", "sector_proxy_market", "INR"),
        MarketTickerSpec("SUNPHARMA.NS", "Pharma proxy (Sun Pharma)", "sector_proxy_market", "INR"),
        MarketTickerSpec("GILT5YBEES.NS", "Government bond ETF proxy", "sector_proxy_market", "INR"),
        MarketTickerSpec("EBBETF0430.NS", "Corporate bond ETF proxy", "sector_proxy_market", "INR"),
        MarketTickerSpec("LIQUIDBEES.NS", "Liquid fund proxy", "sector_proxy_market", "INR"),
        MarketTickerSpec("GC=F", "Gold Futures", "sector_proxy_market", "USD"),
        MarketTickerSpec("XLK", "Technology Select Sector SPDR", "sector_proxy_market", "USD"),
    ]


def default_macro_specs() -> list[MacroSeriesSpec]:
    return [
        MacroSeriesSpec("DGS10", "US 10-Year Treasury Yield", "%"),
        MacroSeriesSpec("DEXINUS", "Indian Rupees to USD Spot Rate", "INR per USD"),
    ]


def default_news_specs() -> list[FinnhubRequestSpec]:
    return [
        FinnhubRequestSpec(category="general"),
        FinnhubRequestSpec(category="forex"),
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compatibility entrypoint for the DB-backed refresh pipeline."
    )
    parser.add_argument(
        "--date",
        default=datetime.now(timezone.utc).date().isoformat(),
        help="Cache date in YYYY-MM-DD format.",
    )
    parser.add_argument(
        "--lookback-days",
        type=int,
        default=5,
        help="Lookback window used by adapters that need recent history.",
    )
    return parser.parse_args()

def fetch_market_dataset(window: FetchWindow) -> RawDatasetEnvelope:
    adapter = YFinanceMarketAdapter()
    return adapter.fetch(default_market_specs(), window)


def fetch_macro_dataset(window: FetchWindow, api_key: str) -> RawDatasetEnvelope:
    adapter = FredMacroAdapter(api_key=api_key)
    return adapter.fetch(default_macro_specs(), window)


def fetch_news_dataset(window: FetchWindow, api_key: str) -> RawDatasetEnvelope:
    adapter = FinnhubNewsAdapter(api_key=api_key)
    return adapter.fetch(default_news_specs(), window)


def main() -> None:
    from services.refresh_orchestrator import RefreshOrchestrator

    args = parse_args()
    init_db()
    with session_scope() as session:
        result = RefreshOrchestrator(session).refresh_cache(
            cache_date=args.date,
            lookback_days=args.lookback_days,
        )

    print("Standalone raw-ingest mode has been folded into the DB-backed refresh pipeline.")
    print(f"Refresh completed for {args.date}")
    for dataset, metadata in result["manifest"]["freshness"].items():
        print(f"{dataset}: {metadata['status']}")
        for note in metadata["notes"]:
            print(f"  note: {note}")


if __name__ == "__main__":
    main()
