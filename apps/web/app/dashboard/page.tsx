import { AppSidebar } from "@/components/app-sidebar"
import { BriefingPanel } from "@/components/briefing-panel"
import { CacheRefreshControl } from "@/components/cache-refresh-control"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getDashboardView } from "@/lib/poc-data"

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatSignalTime(value: string): string {
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

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function getPersonaProfile(personaId: string): string {
  if (personaId === "hni_equity") {
    return "High Net Worth Individual focused on portfolio performance, sector rotation, and market timing. Expects the RM to know holdings intimately and surface relevant signals before they have seen them independently."
  }

  return "Institutional fund reader focused on macro regime, asset allocation drift, mandate context, and cross-asset correlations. Less interested in individual stock moves than regime and flow dynamics."
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ customer?: string }>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const view = await getDashboardView(resolved?.customer)

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        variant="inset"
        customers={view.customers}
        selectedCustomerId={view.selectedCustomer.id}
      />
      <SidebarInset>
        <SiteHeader
          customerName={view.selectedCustomer.name}
          persona={view.persona.label}
          date={view.date}
        />

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div
                    className="grid gap-4 px-0"
                    style={{ gridTemplateColumns: "5fr 5fr" }}
                  >
                  <Card
                    size="sm"
                    className="min-w-0"
                  >
                    <CardHeader className="pb-3">
                      <CardDescription>Client Mandate</CardDescription>
                      <CardTitle>{view.selectedCustomer.mandate}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
                      <p>{getPersonaProfile(view.selectedCustomer.persona)}</p>

                      <div className="mt-2 rounded-xl border bg-muted/20 p-3">
                        <p className="mb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Allocation profile
                        </p>
                        <Table className="table-fixed">
                          <colgroup>
                            <col className="w-[70%]" />
                            <col className="w-[30%]" />
                          </colgroup>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Sector</TableHead>
                              <TableHead style={{ textAlign: "right" }}>Weight</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {view.selectedCustomer.allocations.map((allocation) => (
                              <TableRow key={allocation.sector}>
                                <TableCell className="whitespace-normal font-medium text-foreground">
                                  {allocation.sector}
                                </TableCell>
                                <TableCell
                                  className="font-medium text-foreground tabular-nums"
                                  style={{ textAlign: "right" }}
                                >
                                  {formatPercent(allocation.weight)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    size="sm"
                    className="min-w-0"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-1">
                          <CardDescription>Cache Status</CardDescription>
                          <CardTitle className="text-base">
                            Latest fetched and generated timestamps for the current cache set.
                          </CardTitle>
                        </div>
                        <CacheRefreshControl cacheDate={view.cacheDate} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div
                        className="grid gap-3 text-sm leading-6 text-muted-foreground"
                        style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
                      >
                        <div className="rounded-xl border bg-muted/20 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Market last fetched
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {view.refreshSummary.rawMarketAt ?? "Unavailable"}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-muted/20 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Macro last fetched
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {view.refreshSummary.rawMacroAt ?? "Unavailable"}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-muted/20 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            News last fetched
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {view.refreshSummary.rawNewsAt ?? "Unavailable"}
                          </p>
                        </div>
                        <div className="rounded-xl border bg-muted/20 p-3">
                          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            Correlations last generated
                          </p>
                          <p className="mt-1 font-medium text-foreground">
                            {view.refreshSummary.correlationsAt ?? "Unavailable"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="px-4 lg:px-6">
                <BriefingPanel
                  key={`${view.selectedCustomer.id}:${view.cacheDate}`}
                  customerId={view.selectedCustomer.id}
                  cacheDate={view.cacheDate}
                  customer={view.selectedCustomer}
                  displayedBriefingDate={view.date}
                  marketSignals={view.marketSignals}
                  sideSignals={view.sideSignals}
                  correlationSignals={view.correlationSignals}
                />
              </div>

              <div className="grid gap-4 px-4 lg:grid-cols-[1.2fr_1fr] lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Market Pulse</CardTitle>
                    <CardDescription>
                      Cache-backed India and global proxy signals for the
                      selected client.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {view.marketSignals.map((signal) => (
                      <div
                        key={signal.signal_id}
                        className="rounded-xl border bg-muted/30 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium">{signal.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {signal.source} · {formatSignalTime(signal.as_of)}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline">
                              relevance {formatPercent(signal.customer_relevance)}
                            </Badge>
                            <Badge variant="secondary">
                              confidence {formatPercent(signal.confidence)}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {signal.narrative}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Macro and Catalysts</CardTitle>
                    <CardDescription>
                      Supporting macro context and event-like signals derived
                      from news.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {view.sideSignals.map((signal) => (
                      <div
                        key={signal.signal_id}
                        className="rounded-xl border bg-muted/30 p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="font-medium">{signal.label}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{signal.category}</Badge>
                            <Badge variant="outline">
                              confidence {formatPercent(signal.confidence)}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {signal.narrative}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Global Linkages</CardTitle>
                    <CardDescription>
                      Precomputed cross-market relationships attached to the
                      selected client.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {view.correlationSignals.map((signal) => (
                      <div
                        key={signal.signal_id}
                        className="rounded-xl border bg-muted/20 p-4"
                      >
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{signal.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatSignalTime(signal.as_of)}
                            </p>
                          </div>
                          <Badge variant="outline">
                            confidence {formatPercent(signal.confidence)}
                          </Badge>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {signal.narrative}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ranked Evidence Bundle</CardTitle>
                    <CardDescription>
                      Normalized signals assembled for the selected customer.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {view.bundle.signals.map((signal) => (
                        <div
                          key={signal.signal_id}
                          className="rounded-xl border bg-muted/20 p-4"
                        >
                          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{signal.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {signal.category} · {formatSignalTime(signal.as_of)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline">
                                relevance {formatPercent(signal.customer_relevance)}
                              </Badge>
                              <Badge variant="secondary">
                                weight {formatPercent(signal.persona_weight)}
                              </Badge>
                              <Badge variant="outline">
                                confidence {formatPercent(signal.confidence)}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {signal.narrative}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
