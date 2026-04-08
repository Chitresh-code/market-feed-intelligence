import { AdminPageShell } from "@/components/admin-page-shell"
import { PersonaManager } from "@/components/admin/persona-manager"
import { readPersonas } from "@/lib/poc-data"

export default async function Page() {
  const personas = await readPersonas()

  return (
    <AdminPageShell
      title="Manage Personas"
      description="Configure persona weighting, tone controls, and narrative defaults."
    >
      <PersonaManager personas={personas} />
    </AdminPageShell>
  )
}
