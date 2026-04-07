"use client"

import Link from "next/link"
import { useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"

import {
  BriefcaseBusinessIcon,
  ChevronDownIcon,
  DatabaseIcon,
  ShieldUserIcon,
  UsersIcon,
} from "lucide-react"

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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

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
  selectedCustomerId?: string
}) {
  const pathname = usePathname()
  const [openGroup, setOpenGroup] = useState<"admin" | "clients" | null>(
    pathname.startsWith("/admin") ? "admin" : "clients"
  )

  function toggleGroup(group: "admin" | "clients") {
    setOpenGroup((current) => (current === group ? null : group))
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-auto flex-col items-center gap-1.5 px-3 py-3">
              <div className="flex h-7 w-24 items-center justify-center">
                <Image
                  src="https://www.qtsolv.com/wp-content/themes/qtsolvtheme/assets/images/svg/logo-black.svg"
                  alt="QTSolv"
                  width={96}
                  height={24}
                  className="block h-auto w-full dark:hidden"
                  unoptimized
                />
                <Image
                  src="https://www.qtsolv.com/wp-content/themes/qtsolvtheme/assets/images/svg/logo.svg"
                  alt="QTSolv"
                  width={96}
                  height={24}
                  className="hidden h-auto w-full dark:block"
                  unoptimized
                />
              </div>
              <span className="text-center text-[11px] text-muted-foreground">
                Market Feed Intelligence
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="justify-between px-3 py-2 font-medium"
                  onClick={() => toggleGroup("admin")}
                >
                  <span className="flex items-center gap-2">
                    <ShieldUserIcon className="size-4" />
                    <span>Admin</span>
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "size-4 transition-transform",
                      openGroup === "admin" ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </SidebarMenuButton>
                {openGroup === "admin" ? (
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === "/admin/clients"}>
                        <Link href="/admin/clients" className="flex items-center gap-2 text-muted-foreground">
                          <UsersIcon className="size-4" />
                          <span>Manage Clients</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === "/admin/personas"}>
                        <Link href="/admin/personas" className="flex items-center gap-2 text-muted-foreground">
                          <BriefcaseBusinessIcon className="size-4" />
                          <span>Manage Personas</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild isActive={pathname === "/admin/data"}>
                        <Link href="/admin/data" className="flex items-center gap-2 text-muted-foreground">
                          <DatabaseIcon className="size-4" />
                          <span>Manage Data</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="justify-between px-3 py-2 font-medium"
                  onClick={() => toggleGroup("clients")}
                >
                  <span className="flex items-center gap-2">
                    <UsersIcon className="size-4" />
                    <span>Clients</span>
                  </span>
                  <ChevronDownIcon
                    className={cn(
                      "size-4 transition-transform",
                      openGroup === "clients" ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </SidebarMenuButton>
                {openGroup === "clients" ? (
                  <SidebarMenuSub>
                    {customers.map((customer) => (
                      <SidebarMenuSubItem key={customer.id}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={customer.id === selectedCustomerId}
                          className="h-auto items-start py-2"
                        >
                          <Link href={`/dashboard?customer=${customer.id}`}>
                            <span className="font-medium">{customer.name}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
