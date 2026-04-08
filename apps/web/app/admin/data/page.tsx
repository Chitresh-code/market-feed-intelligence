import Link from "next/link"

import { RefreshCwIcon, SquareArrowOutUpRightIcon } from "lucide-react"

import { AdminPageShell } from "@/components/admin-page-shell"
import { CacheRefreshControl } from "@/components/cache-refresh-control"
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
import {
  getAvailableCacheDates,
  getDefaultCacheDate,
  readCorrelationMappings,
  readCorrelations,
  readRawMacro,
  readRawMarket,
  readRawNews,
} from "@/lib/poc-data"

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Unavailable"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  const day = String(parsed.getUTCDate()).padStart(2, "0")
  const month = parsed.toLocaleString("en-US", { month: "short", timeZone: "UTC" })
  const year = parsed.getUTCFullYear()
  const hours = String(parsed.getUTCHours()).padStart(2, "0")
  const minutes = String(parsed.getUTCMinutes()).padStart(2, "0")

  return `${day} ${month} ${year}, ${hours}:${minutes} UTC`
}

function formatSigned(value: number | null | undefined, suffix = ""): string {
  if (value === null || value === undefined) {
    return "—"
  }
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}${suffix}`
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const availableDates = await getAvailableCacheDates()
  const fallbackDate = availableDates.length > 0 ? await getDefaultCacheDate() : null
  const selectedDate =
    resolved?.date && availableDates.includes(resolved.date) ? resolved.date : fallbackDate

  const [rawMarket, rawMacro, rawNews, correlations, mappings] = await Promise.all([
    selectedDate ? readRawMarket(selectedDate) : Promise.resolve([]),
    selectedDate ? readRawMacro(selectedDate) : Promise.resolve([]),
    selectedDate ? readRawNews(selectedDate) : Promise.resolve([]),
    selectedDate ? readCorrelations(selectedDate) : Promise.resolve([]),
    readCorrelationMappings(),
  ])

  return (
    <AdminPageShell
      title="Manage Data"
      description="Review cache history, trigger refreshes, and inspect fetched raw records from the data service."
    >
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Cache Controls</CardTitle>
                <CardDescription>
                  Bootstrap and inspect multi-day history stored in Postgres.
                </CardDescription>
              </div>
              {selectedDate ? (
                <Badge variant="outline" className="shrink-0">
                  Viewing {selectedDate}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">Refresh selected date</p>
                  <p className="text-sm text-muted-foreground">
                    Re-ingests market, macro, and news data, then rebuilds normalized bundles and correlation records.
                  </p>
                </div>
                {selectedDate ? (
                  <CacheRefreshControl cacheDate={selectedDate} />
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCwIcon className="size-4" />
                    No cache history available yet.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Available cache dates</p>
              <div className="flex flex-wrap gap-2">
                {availableDates.length > 0 ? (
                  availableDates
                    .slice()
                    .reverse()
                    .map((date) => (
                      <Link
                        key={date}
                        href={`/admin/data?date=${date}`}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          date === selectedDate
                            ? "bg-foreground text-background"
                            : "text-foreground hover:bg-muted/60"
                        }`}
                      >
                        {date}
                      </Link>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground">Run bootstrap history to seed the database.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Raw Market Records</CardTitle>
            <CardDescription>Fetched market proxies stored for the selected cache date.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Close</TableHead>
                  <TableHead>1D</TableHead>
                  <TableHead>5D</TableHead>
                  <TableHead>As of</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawMarket.map((record) => (
                  <TableRow key={`${record.ticker}:${record.as_of}`}>
                    <TableCell className="font-medium">{record.label}</TableCell>
                    <TableCell>{record.ticker}</TableCell>
                    <TableCell>{record.close.toFixed(2)}</TableCell>
                    <TableCell>{formatSigned(record.delta_1d_pct, "%")}</TableCell>
                    <TableCell>{formatSigned(record.delta_5d_pct, "%")}</TableCell>
                    <TableCell>{formatDateTime(record.as_of)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Raw Macro Records</CardTitle>
            <CardDescription>Fetched macro series stored for the selected cache date.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Series</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>1D</TableHead>
                  <TableHead>90D</TableHead>
                  <TableHead>180D</TableHead>
                  <TableHead>As of</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawMacro.map((record) => (
                  <TableRow key={`${record.series_id}:${record.as_of}`}>
                    <TableCell className="font-medium">{record.label}</TableCell>
                    <TableCell>{record.series_id}</TableCell>
                    <TableCell>
                      {record.value.toFixed(2)} {record.unit}
                    </TableCell>
                    <TableCell>{formatSigned(record.delta_1d)}</TableCell>
                    <TableCell>{formatSigned(record.delta_90d)}</TableCell>
                    <TableCell>{formatSigned(record.delta_180d)}</TableCell>
                    <TableCell>{formatDateTime(record.as_of)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Raw News Records</CardTitle>
            <CardDescription>Fetched news headlines stored for the selected cache date.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Published</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Headline</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead>Link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rawNews.map((record) => (
                  <TableRow key={record.article_id}>
                    <TableCell>{formatDateTime(record.published_at)}</TableCell>
                    <TableCell>{record.source_name}</TableCell>
                    <TableCell className="max-w-[32rem]">
                      <p className="line-clamp-2">{record.headline}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {record.categories.map((category) => (
                          <Badge key={`${record.article_id}:${category}`} variant="secondary">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <a
                        href={record.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Open
                        <SquareArrowOutUpRightIcon className="size-3.5" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Correlation Records</CardTitle>
            <CardDescription>Resolved client-facing correlations for the selected cache date.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>R</TableHead>
                  <TableHead>Strength</TableHead>
                  <TableHead>Lookback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {correlations.map((record) => (
                  <TableRow key={`${record.customer_id}:${record.label}:${record.lookback_days}`}>
                    <TableCell>{record.customer_id}</TableCell>
                    <TableCell className="font-medium">{record.label}</TableCell>
                    <TableCell>
                      {record.source_signal} → {record.target_signal}
                    </TableCell>
                    <TableCell>{record.r_value.toFixed(2)}</TableCell>
                    <TableCell>{record.strength}</TableCell>
                    <TableCell>{record.lookback_days}d</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Correlation Mappings</CardTitle>
            <CardDescription>Active mapping rules used to produce correlation records.</CardDescription>
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
                    <TableCell>
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
