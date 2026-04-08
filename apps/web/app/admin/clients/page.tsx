import { AdminPageShell } from "@/components/admin-page-shell"
import { ClientRegistry } from "@/components/admin/client-registry"
import { readCustomers, readPersonas } from "@/lib/poc-data"

export default async function Page() {
  const [customers, personas] = await Promise.all([readCustomers(), readPersonas()])

  return (
    <AdminPageShell
      title="Manage Clients"
      description="Review, add, and edit client profiles loaded from the data service."
    >
      <div className="px-4 lg:px-6">
        <ClientRegistry customers={customers} personas={personas} />
      </div>
    </AdminPageShell>
  )
}
