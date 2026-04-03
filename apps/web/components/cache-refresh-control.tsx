"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

import { RefreshCwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type RefreshResult = {
  status: "success" | "failed" | "running"
  date: string | null
  startedAt: string | null
  finishedAt?: string
  output: string[]
}

export function CacheRefreshControl({ cacheDate }: { cacheDate: string }) {
  const router = useRouter()
  const [isRefreshPending, startRefreshTransition] = useTransition()

  function handleRefreshCache() {
    startRefreshTransition(async () => {
      try {
        const response = await fetch("/api/cache/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ date: cacheDate }),
        })

        const payload = (await response.json()) as RefreshResult

        if (response.ok && payload.status === "success") {
          router.refresh()
        }
      } catch {}
    })
  }

  return (
    <Button onClick={handleRefreshCache} disabled={isRefreshPending} variant="outline" size="sm">
      <RefreshCwIcon className="size-3.5" />
      {isRefreshPending ? "Refreshing..." : "Refresh Cache"}
    </Button>
  )
}
