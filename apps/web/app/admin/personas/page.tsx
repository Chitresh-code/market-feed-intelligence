import { AdminPageShell } from "@/components/admin-page-shell"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { readPersonas } from "@/lib/poc-data"

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export default async function Page() {
  const personas = await readPersonas()

  return (
    <AdminPageShell
      title="Manage Personas"
      description="Inspect persona weighting, tone controls, and narrative defaults from the data service."
    >
      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        {personas.map((persona) => (
          <Card key={persona.id}>
            <CardHeader>
              <CardTitle>{persona.label}</CardTitle>
              <CardDescription>{persona.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Section order</p>
                <div className="flex flex-wrap gap-2">
                  {persona.section_order.map((section) => (
                    <Badge key={`${persona.id}:${section}`} variant="secondary">
                      {section}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Category weights</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(persona.category_weights).map(([key, value]) => (
                    <div key={`${persona.id}:${key}`} className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">{key}</p>
                      <p className="mt-1 font-medium text-foreground">{formatPercent(value)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Preferred narrative style</p>
                <p className="text-sm leading-6 text-foreground">{persona.preferred_narrative_style}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Tone rules</p>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-foreground">
                  {persona.tone_rules.map((rule) => (
                    <li key={`${persona.id}:tone:${rule}`}>{rule}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Fallback rules</p>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-foreground">
                  {persona.fallback_rules.map((rule) => (
                    <li key={`${persona.id}:fallback:${rule}`}>{rule}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Prohibited claim patterns</p>
                <div className="flex flex-wrap gap-2">
                  {persona.prohibited_claim_patterns.map((pattern) => (
                    <Badge key={`${persona.id}:pattern:${pattern}`} variant="outline">
                      {pattern}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminPageShell>
  )
}
