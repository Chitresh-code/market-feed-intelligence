from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from adapters.base import AdapterError, FetchWindow
from adapters.finnhub_adapter import FinnhubNewsAdapter, FinnhubRequestSpec
from adapters.fred_adapter import FredMacroAdapter, MacroSeriesSpec
from adapters.yfinance_adapter import MarketTickerSpec, YFinanceMarketAdapter
from config import load_settings
from domain.models import CacheFileRef, CacheManifest, FreshnessMetadata, RawDatasetEnvelope


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


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
        description="Fetch external provider data and write raw cache artifacts."
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


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf8")


def build_file_ref(
    repo_root: Path,
    file_path: Path,
    envelope: RawDatasetEnvelope,
) -> CacheFileRef:
    return CacheFileRef(
        path=str(file_path.relative_to(repo_root)),
        record_count=len(envelope.records),
        generated_at=envelope.generated_at,
        source=envelope.source,
        date=envelope.date,
    )


def build_missing_freshness(generated_at: str, note: str) -> FreshnessMetadata:
    return FreshnessMetadata(
        status="missing",
        generated_at=generated_at,
        notes=[note],
    )


def build_fresh_freshness(envelope: RawDatasetEnvelope) -> FreshnessMetadata:
    as_of: str | None = None
    if envelope.records:
        last_record = envelope.records[0]
        as_of = (
            last_record.get("as_of")
            or last_record.get("published_at")
            or envelope.generated_at
        )

    return FreshnessMetadata(
        status="fresh",
        as_of=as_of,
        generated_at=envelope.generated_at,
        notes=envelope.notes,
    )


def fetch_market_dataset(window: FetchWindow) -> RawDatasetEnvelope:
    adapter = YFinanceMarketAdapter()
    return adapter.fetch(default_market_specs(), window)


def fetch_macro_dataset(window: FetchWindow, api_key: str) -> RawDatasetEnvelope:
    adapter = FredMacroAdapter(api_key=api_key)
    return adapter.fetch(default_macro_specs(), window)


def fetch_news_dataset(window: FetchWindow, api_key: str) -> RawDatasetEnvelope:
    adapter = FinnhubNewsAdapter(api_key=api_key)
    return adapter.fetch(default_news_specs(), window)


def run_ingest(cache_date: str, lookback_days: int) -> CacheManifest:
    settings = load_settings()
    run_at = datetime.now(timezone.utc).isoformat()
    window = FetchWindow(date=cache_date, lookback_days=lookback_days)

    for path in (
        settings.raw_cache_root,
        settings.normalized_cache_root,
        settings.correlation_cache_root,
        settings.manifest_cache_root,
    ):
        ensure_directory(path)

    raw_market_ref: CacheFileRef | None = None
    raw_macro_ref: CacheFileRef | None = None
    raw_news_ref: CacheFileRef | None = None
    freshness: dict[str, FreshnessMetadata] = {}

    try:
        market = fetch_market_dataset(window)
        market_path = settings.raw_cache_root / "market" / f"{cache_date}.json"
        write_json(market_path, market.model_dump(mode="json"))
        raw_market_ref = build_file_ref(settings.repo_root, market_path, market)
        freshness["raw_market"] = build_fresh_freshness(market)
    except AdapterError as exc:
        freshness["raw_market"] = build_missing_freshness(run_at, str(exc))

    try:
        macro = fetch_macro_dataset(window, settings.fred_api_key)
        macro_path = settings.raw_cache_root / "macro" / f"{cache_date}.json"
        write_json(macro_path, macro.model_dump(mode="json"))
        raw_macro_ref = build_file_ref(settings.repo_root, macro_path, macro)
        freshness["raw_macro"] = build_fresh_freshness(macro)
    except AdapterError as exc:
        freshness["raw_macro"] = build_missing_freshness(run_at, str(exc))

    try:
        news = fetch_news_dataset(window, settings.finnhub_api_key)
        news_path = settings.raw_cache_root / "news" / f"{cache_date}.json"
        write_json(news_path, news.model_dump(mode="json"))
        raw_news_ref = build_file_ref(settings.repo_root, news_path, news)
        freshness["raw_news"] = build_fresh_freshness(news)
    except AdapterError as exc:
        freshness["raw_news"] = build_missing_freshness(run_at, str(exc))

    manifest = CacheManifest(
        manifest_id=f"manifest-{cache_date}",
        date=cache_date,
        mode="cached_external_live_llm",
        generated_at=run_at,
        raw_market=raw_market_ref,
        raw_macro=raw_macro_ref,
        raw_news=raw_news_ref,
        freshness=freshness,
    )
    manifest_path = settings.manifest_cache_root / f"{cache_date}.json"
    write_json(manifest_path, manifest.model_dump(mode="json"))

    return manifest


def main() -> None:
    args = parse_args()
    settings = load_settings()
    manifest = run_ingest(cache_date=args.date, lookback_days=args.lookback_days)
    manifest_path = settings.manifest_cache_root / f"{args.date}.json"

    print(f"Wrote manifest: {manifest_path}")
    for dataset, metadata in manifest.freshness.items():
        print(f"{dataset}: {metadata.status}")
        for note in metadata.notes:
            print(f"  note: {note}")


if __name__ == "__main__":
    main()
