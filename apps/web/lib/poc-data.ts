import fs from "node:fs/promises"
import path from "node:path"

export type PersonaId = "hni_equity" | "inst_fund"

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
  as_of: string
  customer_relevance: number
  persona_weight: number
  confidence: number
  narrative: string
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

type CorrelationBundle = {
  bundle_id: string
  date: string
  generated_at: string
  correlations: CorrelationRecord[]
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
  }>
  marketSignals: Signal[]
  contextSignals: Signal[]
  correlationSignals: Signal[]
  freshnessNotes: Array<{
    dataset: string
    status: ManifestFreshness["status"]
    note: string
  }>
}

const repoRoot = path.join(process.cwd(), "..", "..")
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

async function readJson<T>(filePath: string): Promise<T> {
  const value = await fs.readFile(filePath, "utf8")
  return JSON.parse(value) as T
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
  const manifestDir = path.join(repoRoot, "data", "cache", "manifests")
  const files = (await fs.readdir(manifestDir))
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => entry.replace(/\.json$/, ""))
    .sort()

  return files
}

export async function getDefaultCacheDate(): Promise<string> {
  const dates = await getAvailableCacheDates()
  const latest = dates.at(-1)
  if (!latest) {
    throw new Error("No cache manifests available.")
  }
  return latest
}

export async function readCustomers(): Promise<Customer[]> {
  const dir = path.join(repoRoot, "data", "customers")
  const files = (await fs.readdir(dir)).filter((entry) => entry.endsWith(".json")).sort()
  return Promise.all(files.map((file) => readJson<Customer>(path.join(dir, file))))
}

export async function readCustomer(customerId: string): Promise<Customer> {
  const customers = await readCustomers()
  const customer = customers.find((entry) => entry.id === customerId)
  if (!customer) {
    throw new Error(`Unknown customer: ${customerId}`)
  }
  return customer
}

export async function readPersona(personaId: PersonaId): Promise<Persona> {
  return readJson<Persona>(path.join(repoRoot, "data", "personas", `${personaId}.json`))
}

export async function readManifest(cacheDate: string): Promise<Manifest> {
  return readJson<Manifest>(
    path.join(repoRoot, "data", "cache", "manifests", `${cacheDate}.json`)
  )
}

export async function readBundle(cacheDate: string, customerId: string): Promise<SignalBundle> {
  return readJson<SignalBundle>(
    path.join(
      repoRoot,
      "data",
      "cache",
      "normalized",
      "signals",
      `${cacheDate}--${customerId}.json`
    )
  )
}

export async function readCorrelations(cacheDate: string): Promise<CorrelationRecord[]> {
  const filePath = path.join(repoRoot, "data", "cache", "correlations", `${cacheDate}.json`)
  try {
    const bundle = await readJson<CorrelationBundle>(filePath)
    return bundle.correlations
  } catch {
    return []
  }
}

function sortSignals(signals: Signal[]): Signal[] {
  return [...signals].sort((left, right) => {
    const leftScore = left.customer_relevance * left.persona_weight * left.confidence
    const rightScore = right.customer_relevance * right.persona_weight * right.confidence
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
  limit: number
): Signal[] {
  const ranked = sortSignals(signals)
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
  limit: number
): Signal[] {
  const ranked = sortSignals(signals)
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
  const marketSignals = selectAllocationAnchoredSignals(
    input.bundle.signals.filter((signal) =>
      ["market_index", "sector_proxy_market", "sector_proxy_fundamental"].includes(
        signal.category
      )
    ),
    input.customer.allocations,
    4
  )

  const macroSignals = sortSignals(
    input.bundle.signals.filter((signal) => signal.category === "macro_series")
  ).slice(0, input.customer.persona === "inst_fund" ? 2 : 1)

  const matchedNewsSignals = selectMatchedSignals(
    input.bundle.signals.filter((signal) => signal.category === "news_event_signal"),
    input.customer.allocations,
    2
  )

  const contextSignals = [...macroSignals, ...matchedNewsSignals].slice(0, 4)

  const correlationSignals = (() => {
    const matched = selectMatchedSignals(
      input.bundle.signals.filter((signal) => signal.category === "correlation_signal"),
      input.customer.allocations,
      3
    )

    if (matched.length > 0) {
      return matched
    }

    return selectAllocationAnchoredSignals(
      input.bundle.signals.filter((signal) => signal.category === "correlation_signal"),
      input.customer.allocations,
      2
    )
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
      .slice(0, 4)
      .map((allocation) => ({
        sector: allocation.sector,
        weight: allocation.weight,
      })),
    marketSignals,
    contextSignals,
    correlationSignals,
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
    manifest,
    bundle,
    marketSignals: sortSignals(
      bundle.signals.filter((signal) =>
        ["market_index", "sector_proxy_market", "sector_proxy_fundamental"].includes(
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
