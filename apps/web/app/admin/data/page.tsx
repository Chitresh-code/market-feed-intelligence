import {
  ActivityIcon,
  BrainCircuitIcon,
  DatabaseIcon,
  GlobeIcon,
  LayersIcon,
  RefreshCwIcon,
  TrendingUpIcon,
} from "lucide-react"

import { AdminPageShell } from "@/components/admin-page-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CacheRefreshControl } from "@/components/cache-refresh-control"
import {
  getDefaultCacheDate,
  readCorrelationMappings,
} from "@/lib/poc-data"

const PIPELINE_STEPS = [
  {
    icon: GlobeIcon,
    label: "External Data Ingestion",
    sources: ["yFinance", "FRED API", "Finnhub"],
    detail:
      "On each refresh, the service fetches live market prices (NSE / US via yFinance), macroeconomic series (US 10Y yield, USD/INR spot rate via FRED), and financial news headlines (general + forex categories via Finnhub). Raw records are timestamped and stored in PostgreSQL.",
  },
  {
    icon: ActivityIcon,
    label: "Signal Normalisation",
    sources: ["Normalization Job"],
    detail:
      "Each raw record is scored per client using allocation-weighted relevance, persona category weights, and a confidence factor. Market signals match by ticker and sector keywords. News signals are keyword-filtered against the client's holdings, concerns, and watchlist. Macro signals receive persona-tuned relevance boosts.",
  },
  {
    icon: LayersIcon,
    label: "Correlation Resolution",
    sources: ["Precomputed Mapping Table"],
    detail:
      "Correlation signals are resolved from a persisted mapping table in the database — not computed live. Each mapping defines a signal pair (e.g. USD/INR ↔ IT sector), direction, strength, and lookback. The job matches mappings against active clients by persona or allocation ticker scope.",
  },
  {
    icon: BrainCircuitIcon,
    label: "LLM Briefing Generation",
    sources: ["Configured LLM Model"],
    detail:
      "The briefing layer is live: on each 'Generate Brief' request, the web app assembles a ranked evidence pack (market, macro, news, correlation signals) and dispatches four parallel LLM calls — one per briefing section. Prompts are loaded from YAML files in the repository and rendered with client-specific context.",
  },
  {
    icon: DatabaseIcon,
    label: "Storage & Serving",
    sources: ["PostgreSQL", "FastAPI"],
    detail:
      "All ingested data, normalised signal bundles, and correlation records are persisted in PostgreSQL via SQLAlchemy. The FastAPI service exposes typed REST endpoints consumed by this Next.js app. No data is static — every dashboard view reflects the most recent successful cache run.",
  },
]

export default async function Page() {
  const [latestDate, mappings] = await Promise.all([
    getDefaultCacheDate().catch(() => null),
    readCorrelationMappings(),
  ])

  return (
    <AdminPageShell
      title="Manage Data"
      description="Control the data pipeline, trigger cache refreshes, and inspect active correlation mappings."
    >
      {/* Cache Controls */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Cache Controls</CardTitle>
                <CardDescription>
                  Trigger a full pipeline run to ingest live data, normalise signals, and update
                  the signal bundles for all clients.
                </CardDescription>
              </div>
              {latestDate ? (
                <Badge variant="outline" className="shrink-0">
                  Latest cache: {latestDate}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">Refresh for today</p>
                  <p className="text-sm text-muted-foreground">
                    Fetches live market, macro, and news data, recomputes all client signal
                    bundles, and updates the database. Takes 15–45 seconds.
                  </p>
                </div>
                {latestDate ? (
                  <CacheRefreshControl cacheDate={latestDate} />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCwIcon className="size-4" />
                    No cache available — run a refresh to bootstrap.
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-muted/10 p-3">
                <p className="text-xs font-medium text-muted-foreground">Data sources</p>
                <p className="mt-1 text-sm font-medium text-foreground">yFinance · FRED · Finnhub</p>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3">
                <p className="text-xs font-medium text-muted-foreground">Processing</p>
                <p className="mt-1 text-sm font-medium text-foreground">Signal normalisation · Correlation resolution</p>
              </div>
              <div className="rounded-lg border bg-muted/10 p-3">
                <p className="text-xs font-medium text-muted-foreground">LLM briefing</p>
                <p className="mt-1 text-sm font-medium text-foreground">Live · 4 parallel section calls</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Pipeline Explanation */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>How the Data Pipeline Works</CardTitle>
            <CardDescription>
              End-to-end flow from live external data sources to the LLM-generated client briefing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {PIPELINE_STEPS.map((step, index) => {
                const Icon = step.icon
                return (
                  <div key={step.label} className="relative flex gap-4">
                    {/* Connector line */}
                    {index < PIPELINE_STEPS.length - 1 ? (
                      <div className="absolute left-5 top-10 h-full w-px bg-border" />
                    ) : null}
                    <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                    <div className="pb-8 pt-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{step.label}</p>
                        {step.sources.map((source) => (
                          <Badge key={source} variant="secondary" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{step.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Correlation Mappings */}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Correlation Mappings</CardTitle>
            <CardDescription>
              Active signal-pair correlation rules used during the normalisation step.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead>Lookback</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{mapping.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {mapping.source_signal} → {mapping.target_signal}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mapping.scope_type} · {mapping.scope_value}
                    </TableCell>
                    <TableCell>{mapping.direction}</TableCell>
                    <TableCell>{mapping.strength}</TableCell>
                    <TableCell>{mapping.lookback_days}d</TableCell>
                    <TableCell>
                      <Badge variant={mapping.active ? "secondary" : "outline"}>
                        {mapping.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  )
}
