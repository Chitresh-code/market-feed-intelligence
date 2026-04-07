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
import {
  getAvailableCacheDates,
  getDefaultCacheDate,
  readCorrelationMappings,
  readManifest,
} from "@/lib/poc-data"

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "Unavailable"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toISOString().replace("T", " ").replace(".000Z", " UTC")
}

export default async function Page() {
  const dates = await getAvailableCacheDates()
  const latestDate = dates.length > 0 ? await getDefaultCacheDate() : null
  const [manifests, mappings] = await Promise.all([
    Promise.all(dates.slice().reverse().map((date) => readManifest(date))),
    readCorrelationMappings(),
  ])
  const latestManifest = manifests[0] ?? null

  return (
    <AdminPageShell
      title="Manage Data"
      description="Review cache manifests and active correlation mappings from the data service."
    >
      <div className="grid gap-4 px-4 lg:grid-cols-[1.1fr_0.9fr] lg:px-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Cache Dates</CardTitle>
                <CardDescription>Latest successful cache snapshots available to the web app.</CardDescription>
              </div>
              {latestDate ? <Badge variant="outline">Latest {latestDate}</Badge> : null}
            </div>
          </CardHeader>
          <CardContent>
            {manifests.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead>Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manifests.map((manifest) => (
                    <TableRow key={manifest.date}>
                      <TableCell className="font-medium">{manifest.date}</TableCell>
                      <TableCell>{formatDateTime(manifest.generated_at)}</TableCell>
                      <TableCell>{manifest.mode}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No cache dates available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Freshness Summary</CardTitle>
            <CardDescription>Current freshness status for the latest cache date.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {latestManifest ? (
              Object.entries(latestManifest.freshness).map(([dataset, freshness]) => (
                <div key={dataset} className="rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{dataset}</p>
                    <Badge variant={freshness.status === "fresh" ? "secondary" : "outline"}>
                      {freshness.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    As of {formatDateTime(freshness.as_of)}
                  </p>
                  {freshness.notes[0] ? (
                    <p className="mt-2 text-sm leading-6 text-foreground">{freshness.notes[0]}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Refresh cache to populate operational data.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Correlation Mappings</CardTitle>
            <CardDescription>Active mapping rules currently stored in the data service.</CardDescription>
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
