import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({
  customerName,
  persona,
  date,
}: {
  customerName: string
  persona: string
  date: string
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <div className="flex min-w-0 flex-1 items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-base font-medium">
              <span>{customerName}</span>
              <span className="ml-2 pl-2 text-xs font-normal text-muted-foreground">
                {persona} · briefing date {date}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
