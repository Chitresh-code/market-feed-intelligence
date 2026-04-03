"use client"

import Link from "next/link"

import { BriefcaseBusinessIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type SidebarCustomer = {
  id: string
  name: string
  persona: string
  mandate: string
}

export function AppSidebar({
  customers,
  selectedCustomerId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  customers: SidebarCustomer[]
  selectedCustomerId: string
}) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto items-start gap-3 px-3 py-3">
              <div className="rounded-lg bg-sidebar-primary/15 p-2 text-sidebar-primary">
                <BriefcaseBusinessIcon className="size-4" />
              </div>
              <div className="grid gap-1 text-left">
                <span className="text-base font-semibold">Macquarie India</span>
                <span className="text-xs text-muted-foreground">
                  Personalized client summaries
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Clients</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {customers.map((customer) => (
                <SidebarMenuItem key={customer.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={customer.id === selectedCustomerId}
                    className="h-auto items-start px-3 py-3"
                  >
                    <Link href={`/dashboard?customer=${customer.id}`}>
                      <div className="grid gap-1 text-left">
                        <span className="font-medium">{customer.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {customer.persona} · {customer.mandate}
                        </span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
