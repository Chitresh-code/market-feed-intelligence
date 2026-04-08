export type PersonaId = string

export type CustomerAllocation = {
  sector: string
  ticker: string | null
  weight: number
  key_holdings: string[]
}

export type Customer = {
  id: string
  name: string
  persona: PersonaId
  mandate: string
  client_profile: string
  risk_rating: string
  relationship_since: string
  last_meeting: string
  next_meeting: string
  meeting_context: string
  primary_objective: string
  communication_style: string
  decision_lens: string
  key_concerns: string[]
  watchlist: string[]
  rm_notes: string
  allocations: CustomerAllocation[]
}

export type Persona = {
  id: PersonaId
  label: string
  section_order: string[]
  category_weights: Record<string, number>
  tone_rules: string[]
  preferred_narrative_style: string
  prohibited_claim_patterns: string[]
  fallback_rules: string[]
}

export type CorrelationMapping = {
  id: string
  label: string
  source_signal: string
  target_signal: string
  r_value: number
  direction: "positive" | "negative"
  strength: "strong" | "moderate" | "weak"
  lookback_days: number
  narrative: string
  scope_type: "allocation_ticker" | "persona" | "customer_id"
  scope_value: string
  active: boolean
  created_at?: string | null
  updated_at?: string | null
}

export type ManifestFreshness = {
  status: "fresh" | "stale" | "missing"
  as_of: string | null
  generated_at: string
  notes: string[]
}

export type CacheFileRef = {
  path: string
  record_count: number
  generated_at: string
  source: string
  date: string
}

export type RawMarketRecord = {
  ticker: string
  label: string
  category: "market_index" | "sector_proxy_market"
  currency: string
  open: number | null
  high: number | null
  low: number | null
  close: number
  volume: number | null
  delta_1d_pct: number | null
  delta_5d_pct: number | null
  source: "yfinance"
  as_of: string
}

export type RawMacroRecord = {
  series_id: string
  label: string
  value: number
  delta_1d: number | null
  delta_90d: number | null
  delta_180d: number | null
  unit: string
  source: "fredapi"
  as_of: string
}

export type RawNewsRecord = {
  article_id: string
  headline: string
  summary: string
  source_name: string
  published_at: string
  url: string
  categories: string[]
  related_symbols: string[]
  source: "finnhub"
}

export type Manifest = {
  manifest_id: string
  generated_at: string
  mode: string
  date: string
  raw_market: CacheFileRef | null
  raw_macro: CacheFileRef | null
  raw_news: CacheFileRef | null
  normalized_signals: CacheFileRef | null
  correlations: CacheFileRef | null
  freshness: Record<string, ManifestFreshness>
}

export type Signal = {
  signal_id: string
  category: string
  label: string
  source: string
  source_url?: string | null
  as_of: string
  customer_relevance: number
  persona_weight: number
  confidence: number
  narrative: string
  time_horizon: string
}

export type SignalBundle = {
  bundle_id: string
  customer_id: string
  persona_id: PersonaId
  date: string
  generated_at: string
  signals: Signal[]
}

export type CorrelationRecord = {
  customer_id: string
  label: string
  source_signal: string
  target_signal: string
  r_value: number
  direction: "positive" | "negative"
  strength: "strong" | "moderate" | "weak"
  lookback_days: number
  narrative: string
  source: string
  as_of: string
}

export type FreshnessCard = {
  label: string
  status: ManifestFreshness["status"]
  asOf: string
  note: string
}

export type EvidencePack = {
  customer: Customer
  persona: Persona
  manifest: Manifest
  cacheDate: string
  allocationAnchors: Array<{
    sector: string
    weight: number
    key_holdings: string[]
  }>
  marketSignals: Signal[]
  contextSignals: Signal[]
  correlationSignals: Signal[]
  longTermSignals: Signal[]
  freshnessNotes: Array<{
    dataset: string
    status: ManifestFreshness["status"]
    note: string
  }>
}

export type PersistedBriefingGeneration = {
  customer_id: string
  cache_date: string
  generated_at: string
  run: import("@/lib/summary-stream").SummaryRunState
  sections: import("@/lib/summary-stream").SummarySectionState[]
}

const serviceBaseUrl = process.env.SERVICE_BASE_URL?.replace(/\/+$/, "")
const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
const genericAllocationTerms = new Set([
  "nifty",
  "india",
  "sectoral",
  "equities",
  "equity",
  "fund",
  "funds",
  "growth",
  "strategic",
  "opportunities",
])

async function serviceFetch<T>(pathname: string): Promise<T> {
  if (!serviceBaseUrl) {
    throw new Error("SERVICE_BASE_URL is not configured.")
  }

  const response = await fetch(`${serviceBaseUrl}${pathname}`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(
      `Service request failed for ${pathname}: ${response.status} ${body || response.statusText}`
    )
  }

  return (await response.json()) as T
}

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  const day = String(parsed.getUTCDate()).padStart(2, "0")
  const month = monthLabels[parsed.getUTCMonth()]
  const year = parsed.getUTCFullYear()
  const hours = String(parsed.getUTCHours()).padStart(2, "0")
  const minutes = String(parsed.getUTCMinutes()).padStart(2, "0")

  return `${day} ${month} ${year}, ${hours}:${minutes} UTC`
}

function getPocBriefingDate(): string {
  const today = new Date()
  today.setDate(today.getDate() + 1)

  const day = String(today.getDate()).padStart(2, "0")
  const month = monthLabels[today.getMonth()]
  const year = today.getFullYear()

  return `${day} ${month} ${year}`
}

function summarizeFreshness(label: string, freshness: ManifestFreshness): FreshnessCard {
  return {
    label,
    status: freshness.status,
    asOf: formatDateTime(freshness.as_of) ?? "Unavailable",
    note: freshness.notes[0] ?? "No freshness caveats recorded.",
  }
}

export async function getAvailableCacheDates(): Promise<string[]> {
  const payload = await serviceFetch<{ dates: string[] }>("/cache/dates")
  return payload.dates
}

export async function getDefaultCacheDate(): Promise<string> {
  const payload = await serviceFetch<{ date: string }>("/cache/latest")
  return payload.date
}

export async function readCustomers(): Promise<Customer[]> {
  return serviceFetch<Customer[]>("/customers")
}

export async function readCustomer(customerId: string): Promise<Customer> {
  return serviceFetch<Customer>(`/customers/${customerId}`)
}

export async function readPersona(personaId: PersonaId): Promise<Persona> {
  return serviceFetch<Persona>(`/personas/${personaId}`)
}

export async function readPersonas(): Promise<Persona[]> {
  return serviceFetch<Persona[]>("/personas")
}

export async function readManifest(cacheDate: string): Promise<Manifest> {
  return serviceFetch<Manifest>(`/manifests/${cacheDate}`)
}

export async function readBundle(cacheDate: string, customerId: string): Promise<SignalBundle> {
  return serviceFetch<SignalBundle>(`/bundles/${cacheDate}/${customerId}`)
}

export async function readCorrelations(cacheDate: string): Promise<CorrelationRecord[]> {
  try {
    const payload = await serviceFetch<{ correlations: CorrelationRecord[] }>(
      `/correlations/${cacheDate}`
    )
    return payload.correlations
  } catch {
    return []
  }
}

export async function readCorrelationMappings(): Promise<CorrelationMapping[]> {
  return serviceFetch<CorrelationMapping[]>("/correlation-mappings")
}

export async function readRawMarket(cacheDate: string): Promise<RawMarketRecord[]> {
  const payload = await serviceFetch<{ records: RawMarketRecord[] }>(`/raw/market/${cacheDate}`)
  return payload.records
}

export async function readRawMacro(cacheDate: string): Promise<RawMacroRecord[]> {
  const payload = await serviceFetch<{ records: RawMacroRecord[] }>(`/raw/macro/${cacheDate}`)
  return payload.records
}

export async function readRawNews(cacheDate: string): Promise<RawNewsRecord[]> {
  const payload = await serviceFetch<{ records: RawNewsRecord[] }>(`/raw/news/${cacheDate}`)
  return payload.records
}

export async function readPersistedGeneration(
  cacheDate: string,
  customerId: string
): Promise<PersistedBriefingGeneration | null> {
  try {
    return await serviceFetch<PersistedBriefingGeneration>(`/generations/${cacheDate}/${customerId}`)
  } catch {
    return null
  }
}

function horizonMultiplier(horizon: string, personaId: PersonaId): number {
  if (personaId === "hni_equity") {
    return horizon === "short" ? 1.3 : horizon === "medium" ? 1.0 : 0.7
  }
  // inst_fund: weight medium and long higher, short is a tactical overlay
  return horizon === "short" ? 0.8 : horizon === "medium" ? 1.2 : 1.3
}

function sortSignals(signals: Signal[], personaId?: PersonaId): Signal[] {
  return [...signals].sort((left, right) => {
    const leftMultiplier = personaId ? horizonMultiplier(left.time_horizon, personaId) : 1.0
    const rightMultiplier = personaId ? horizonMultiplier(right.time_horizon, personaId) : 1.0
    const leftScore = left.customer_relevance * left.persona_weight * left.confidence * leftMultiplier
    const rightScore = right.customer_relevance * right.persona_weight * right.confidence * rightMultiplier
    return rightScore - leftScore
  })
}

function allocationTerms(allocation: CustomerAllocation): Set<string> {
  const baseTerms = allocation.sector
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((term) => term.length > 3 && !genericAllocationTerms.has(term))

  const expanded = new Set(baseTerms)

  if (baseTerms.includes("it")) {
    expanded.add("tech")
    expanded.add("technology")
  }
  if (baseTerms.includes("bank")) {
    expanded.add("financial")
    expanded.add("financials")
    expanded.add("banking")
  }
  if (baseTerms.includes("infra") || baseTerms.includes("infrastructure")) {
    expanded.add("capex")
  }
  if (baseTerms.includes("consumption")) {
    expanded.add("consumer")
    expanded.add("demand")
  }
  if (baseTerms.includes("midcap")) {
    expanded.add("mid cap")
    expanded.add("mid-cap")
  }
  if (baseTerms.includes("smallcap")) {
    expanded.add("small cap")
    expanded.add("small-cap")
  }
  if (baseTerms.includes("g") || baseTerms.includes("sec") || baseTerms.includes("sovereign")) {
    expanded.add("yield")
    expanded.add("duration")
    expanded.add("bond")
    expanded.add("bonds")
  }
  if (baseTerms.includes("commodities") || baseTerms.includes("commodity")) {
    expanded.add("gold")
    expanded.add("oil")
    expanded.add("metal")
  }

  if (allocation.ticker) {
    expanded.add(allocation.ticker.toLowerCase())
  }
  for (const holding of allocation.key_holdings) {
    expanded.add(holding.toLowerCase())
    expanded.add(holding.toLowerCase().replace(".ns", ""))
  }

  return expanded
}

function signalMatchesAllocation(signal: Signal, allocation: CustomerAllocation): boolean {
  const haystack = `${signal.label} ${signal.narrative} ${signal.source} ${signal.signal_id}`.toLowerCase()
  for (const term of allocationTerms(allocation)) {
    if (term.length > 3 && haystack.includes(term)) {
      return true
    }
  }
  return false
}

function selectMatchedSignals(
  signals: Signal[],
  allocations: CustomerAllocation[],
  limit: number,
  personaId?: PersonaId
): Signal[] {
  const ranked = sortSignals(signals, personaId)
  const selected: Signal[] = []
  const usedIds = new Set<string>()

  for (const allocation of [...allocations].sort((left, right) => right.weight - left.weight)) {
    const match = ranked.find(
      (signal) =>
        !usedIds.has(signal.signal_id) && signalMatchesAllocation(signal, allocation)
    )
    if (!match) {
      continue
    }
    selected.push(match)
    usedIds.add(match.signal_id)
    if (selected.length >= limit) {
      break
    }
  }

  return selected
}

function selectAllocationAnchoredSignals(
  signals: Signal[],
  allocations: CustomerAllocation[],
  limit: number,
  personaId?: PersonaId
): Signal[] {
  const ranked = sortSignals(signals, personaId)
  const selected: Signal[] = []
  const usedIds = new Set<string>()

  for (const allocation of [...allocations].sort((left, right) => right.weight - left.weight)) {
    const match = ranked.find(
      (signal) =>
        !usedIds.has(signal.signal_id) && signalMatchesAllocation(signal, allocation)
    )
    if (!match) {
      continue
    }
    selected.push(match)
    usedIds.add(match.signal_id)
    if (selected.length >= limit) {
      return selected
    }
  }

  for (const signal of ranked) {
    if (usedIds.has(signal.signal_id)) {
      continue
    }
    selected.push(signal)
    if (selected.length >= limit) {
      break
    }
  }

  return selected
}

export function buildEvidencePack(input: {
  customer: Customer
  persona: Persona
  manifest: Manifest
  bundle: SignalBundle
  correlationRecords: CorrelationRecord[]
  cacheDate: string
}): EvidencePack {
  const personaId = input.customer.persona

  const marketSignals = selectAllocationAnchoredSignals(
    input.bundle.signals.filter((signal) =>
      ["market_index", "sector_proxy_market"].includes(
        signal.category
      )
    ),
    input.customer.allocations,
    6,
    personaId
  )

  const macroSignals = sortSignals(
    input.bundle.signals.filter((signal) => signal.category === "macro_series"),
    personaId
  ).slice(0, input.customer.persona === "inst_fund" ? 4 : 2)

  const matchedNewsSignals = selectMatchedSignals(
    input.bundle.signals.filter((signal) => signal.category === "news_event_signal"),
    input.customer.allocations,
    input.customer.persona === "inst_fund" ? 4 : 3,
    personaId
  )

  const contextSignals = [...macroSignals, ...matchedNewsSignals].slice(0, 8)

  const correlationSignals = (() => {
    const matched = selectMatchedSignals(
      input.bundle.signals.filter(
        (signal) => signal.category === "correlation_signal" && signal.time_horizon !== "long"
      ),
      input.customer.allocations,
      4,
      personaId
    )

    if (matched.length > 0) {
      return matched
    }

    return selectAllocationAnchoredSignals(
      input.bundle.signals.filter(
        (signal) => signal.category === "correlation_signal" && signal.time_horizon !== "long"
      ),
      input.customer.allocations,
      3,
      personaId
    )
  })()

  const longTermSignals = (() => {
    const longCorrelations = selectMatchedSignals(
      input.bundle.signals.filter(
        (signal) => signal.category === "correlation_signal" && signal.time_horizon === "long"
      ),
      input.customer.allocations,
      3,
      personaId
    )
    const longMacro = sortSignals(
      input.bundle.signals.filter(
        (signal) => signal.category === "macro_series" && signal.time_horizon === "long"
      ),
      personaId
    ).slice(0, 2)
    return [...longCorrelations, ...longMacro]
  })()

  const freshnessNotes = [
    ["Market Cache", input.manifest.freshness.raw_market],
    ["Macro Cache", input.manifest.freshness.raw_macro],
    ["News Cache", input.manifest.freshness.raw_news],
  ]
    .filter((entry): entry is [string, ManifestFreshness] => Boolean(entry[1]))
    .map(([dataset, freshness]) => ({
      dataset,
      status: freshness.status,
      note: freshness.notes[0] ?? "No freshness caveats recorded.",
    }))

  return {
    customer: input.customer,
    persona: input.persona,
    manifest: input.manifest,
    cacheDate: input.cacheDate,
    allocationAnchors: [...input.customer.allocations]
      .sort((left, right) => right.weight - left.weight)
      .slice(0, 5)
      .map((allocation) => ({
        sector: allocation.sector,
        weight: allocation.weight,
        key_holdings: allocation.key_holdings,
      })),
    marketSignals,
    contextSignals,
    correlationSignals,
    longTermSignals,
    freshnessNotes,
  }
}

export async function getSummaryContext(customerId: string, requestedDate?: string) {
  const cacheDate = requestedDate ?? (await getDefaultCacheDate())
  const customer = await readCustomer(customerId)
  const [persona, manifest, bundle, correlationRecords] = await Promise.all([
    readPersona(customer.persona),
    readManifest(cacheDate),
    readBundle(cacheDate, customerId),
    readCorrelations(cacheDate),
  ])

  return {
    cacheDate,
    customer,
    persona,
    manifest,
    bundle,
    correlationRecords,
    evidencePack: buildEvidencePack({
      customer,
      persona,
      manifest,
      bundle,
      correlationRecords,
      cacheDate,
    }),
  }
}

export async function getDashboardView(selectedCustomerId?: string) {
  const customers = await readCustomers()
  const selectedCustomer =
    customers.find((customer) => customer.id === selectedCustomerId) ?? customers[0]
  const summaryContext = await getSummaryContext(selectedCustomer.id)
  const { cacheDate, customer, persona, manifest, bundle, evidencePack } = summaryContext
  const persistedGeneration = await readPersistedGeneration(cacheDate, customer.id)

  const allCorrelationSignals = sortSignals(
    bundle.signals.filter((signal) => signal.category === "correlation_signal")
  ).slice(0, 4)

  return {
    date: getPocBriefingDate(),
    cacheDate,
    customers: customers.map((entry) => ({
      id: entry.id,
      name: entry.name,
      persona: entry.persona,
      mandate: entry.mandate,
    })),
    selectedCustomer: customer,
    persona,
    persistedGeneration,
    manifest,
    bundle,
    marketSignals: sortSignals(
      bundle.signals.filter((signal) =>
        ["market_index", "sector_proxy_market"].includes(
          signal.category
        )
      )
    ).slice(0, 4),
    sideSignals: sortSignals(
      bundle.signals.filter((signal) => ["macro_series", "news_event_signal"].includes(signal.category))
    ).slice(0, 5),
    correlationSignals: allCorrelationSignals,
    evidencePack,
    freshnessCards: [
      summarizeFreshness("Market Cache", manifest.freshness.raw_market),
      summarizeFreshness("Macro Cache", manifest.freshness.raw_macro),
      summarizeFreshness("News Cache", manifest.freshness.raw_news),
      summarizeFreshness("Correlation Cache", manifest.freshness.correlations),
    ],
    refreshSummary: {
      manifestGeneratedAt: formatDateTime(manifest.generated_at) ?? "Unavailable",
      rawMarketAt: formatDateTime(manifest.raw_market?.generated_at),
      rawMacroAt: formatDateTime(manifest.raw_macro?.generated_at),
      rawNewsAt: formatDateTime(manifest.raw_news?.generated_at),
      normalizedAt: formatDateTime(manifest.normalized_signals?.generated_at),
      correlationsAt: formatDateTime(manifest.correlations?.generated_at),
    },
  }
}
