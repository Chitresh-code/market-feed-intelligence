import { AppSidebar } from "@/components/app-sidebar"
import { BriefingPanel } from "@/components/briefing-panel"
import { EvidenceSections } from "@/components/evidence-sections"
import { SiteHeader } from "@/components/site-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
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

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

const PERSONA_PROFILES: Record<string, string> = {
  hni_equity:
    "High Net Worth Individual focused on portfolio performance, sector rotation, and market timing. Expects the RM to know holdings intimately and surface relevant signals before they have seen them independently.",
  inst_fund:
    "Institutional fund reader focused on macro regime, asset allocation drift, mandate context, and cross-asset correlations. Less interested in individual stock moves than regime and flow dynamics.",
}

const DEFAULT_PERSONA_PROFILE =
  "Institutional fund reader focused on macro regime, asset allocation drift, mandate context, and cross-asset correlations. Less interested in individual stock moves than regime and flow dynamics."

function getPersonaProfile(personaId: string): string {
  return PERSONA_PROFILES[personaId] ?? DEFAULT_PERSONA_PROFILE
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ customer?: string }>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const view = await getDashboardView(resolved?.customer)

  if (!view.selectedCustomer || !view.persona || !view.cacheDate || !view.bundle) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" customers={view.customers} />
        <SidebarInset>
          <SiteHeader
            customerName="No clients available"
            persona="Client registry empty"
            date={view.date}
          />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <Card size="sm" className="min-w-0">
                    <CardContent className="space-y-3 pt-6 text-sm leading-6 text-muted-foreground">
                      <h2 className="text-xl font-semibold leading-8 text-foreground">
                        No client data loaded
                      </h2>
                      <p>
                        The dashboard cannot render until the service has seeded customers and
                        refresh data for at least one cache date.
                      </p>
                      <p>
                        Run <code>make bootstrap</code> and then <code>make refresh DATE=YYYY-MM-DD</code>{" "}
                        on the VM from the repository root.
                      </p>
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
                <div className="grid gap-4 px-0">
                  <Card
                    size="sm"
                    className="min-w-0"
                  >
                    <CardContent className="space-y-6 pt-6 text-sm leading-6 text-muted-foreground">
                      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.9fr]">
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <h2 className="text-xl font-semibold leading-8 text-foreground">
                              Client profile
                            </h2>
                            <p className="text-sm leading-7 text-foreground">
                              {view.selectedCustomer.client_profile}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <p className="text-sm leading-7 text-foreground">
                              {getPersonaProfile(view.selectedCustomer.persona)}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 border-t pt-4 md:flex-row md:items-center md:justify-between">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                Client mandate
                              </p>
                              <p className="text-base font-medium leading-7 text-foreground">
                                {view.selectedCustomer.mandate}
                              </p>
                            </div>
                            <Badge variant="outline" className="w-fit">
                              Risk {view.selectedCustomer.risk_rating}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-3 rounded-xl border bg-muted/10 p-4">
                          <p className="text-xs font-medium text-muted-foreground">
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
                      </div>

                      <details className="group flex flex-col items-end">
                        <summary className="ml-auto inline-flex w-fit cursor-pointer list-none items-center rounded-md border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/60">
                          <span className="group-open:hidden">Know more</span>
                          <span className="hidden group-open:inline">Hide</span>
                        </summary>
                        <div className="mt-3 rounded-xl border bg-muted/10 p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">
                                Primary objective
                              </p>
                              <p className="mt-1 text-sm leading-5 text-foreground">
                                {view.selectedCustomer.primary_objective}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">
                                Decision lens
                              </p>
                              <p className="mt-1 text-sm leading-5 text-foreground">
                                {view.selectedCustomer.decision_lens}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">
                                Relationship manager brief
                              </p>
                              <p className="mt-1 text-sm leading-5 text-foreground">
                                {view.selectedCustomer.rm_notes}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">
                                Key concerns
                              </p>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-5 text-foreground">
                                {view.selectedCustomer.key_concerns.map((concern) => (
                                  <li key={concern}>{concern}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">
                                Watchlist
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {view.selectedCustomer.watchlist.map((item) => (
                                  <Badge key={item} variant="secondary">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          </div>
                        </div>
                      </details>
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
                  persistedGeneration={view.persistedGeneration}
                  displayedBriefingDate={view.date}
                  marketSignals={view.marketSignals}
                  sideSignals={view.sideSignals}
                  correlationSignals={view.correlationSignals}
                />
              </div>
              <EvidenceSections
                marketSignals={view.marketSignals}
                sideSignals={view.sideSignals}
                correlationSignals={view.correlationSignals}
                bundleSignals={view.bundle.signals}
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
