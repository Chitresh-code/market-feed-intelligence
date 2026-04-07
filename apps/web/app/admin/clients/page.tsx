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
import { readCustomers, readPersonas } from "@/lib/poc-data"

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

export default async function Page() {
  const [customers, personas] = await Promise.all([readCustomers(), readPersonas()])
  const personaLabelById = Object.fromEntries(personas.map((persona) => [persona.id, persona.label]))

  return (
    <AdminPageShell
      title="Manage Clients"
      description="Review live client records loaded from the data service."
    >
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Client Registry</CardTitle>
            <CardDescription>
              Current customer profiles, mandates, personas, and allocation context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Persona</TableHead>
                  <TableHead>Mandate</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Allocations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">{customer.id}</p>
                      </div>
                    </TableCell>
                    <TableCell>{personaLabelById[customer.persona] ?? customer.persona}</TableCell>
                    <TableCell>{customer.mandate}</TableCell>
                    <TableCell>{customer.risk_rating}</TableCell>
                    <TableCell>{customer.allocations.length}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 px-4 lg:grid-cols-2 lg:px-6">
        {customers.map((customer) => (
          <Card key={customer.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{customer.name}</CardTitle>
                  <CardDescription>
                    {personaLabelById[customer.persona] ?? customer.persona} · {customer.mandate}
                  </CardDescription>
                </div>
                <Badge variant="outline">Risk {customer.risk_rating}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">{customer.client_profile}</p>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Primary objective</p>
                <p className="text-sm leading-6 text-foreground">{customer.primary_objective}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Allocation profile</p>
                <div className="flex flex-wrap gap-2">
                  {customer.allocations.map((allocation) => (
                    <Badge key={`${customer.id}:${allocation.sector}`} variant="secondary">
                      {allocation.sector} · {formatPercent(allocation.weight)}
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
