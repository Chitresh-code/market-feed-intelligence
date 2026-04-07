"use client"

import { useState } from "react"

import { ChevronDownIcon, SquareArrowOutUpRightIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Signal } from "@/lib/poc-data"
import { cn } from "@/lib/utils"

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

type EvidenceSectionId =
  | "market-pulse"
  | "macro-and-catalysts"
  | "global-linkages"
  | "ranked-evidence"

function formatSignalTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  const day = String(parsed.getUTCDate()).padStart(2, "0")
  const month = monthLabels[parsed.getUTCMonth()]
  const year = parsed.getUTCFullYear()
  const hours = String(parsed.getUTCHours()).padStart(2, "0")
  const minutes = String(parsed.getUTCMinutes()).padStart(2, "0")

  return `${day} ${month} ${year}, ${hours}:${minutes} UTC`
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function renderSourceLink(signal: { source_url?: string | null }) {
  if (!signal.source_url) {
    return null
  }

  return (
    <a
      href={signal.source_url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex size-4 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Open source"
      title="Open source"
    >
      <SquareArrowOutUpRightIcon className="size-3.5" />
    </a>
  )
}

function SectionCard({
  id,
  title,
  description,
  isOpen,
  onToggle,
  children,
}: {
  id: EvidenceSectionId
  title: string
  description: string
  isOpen: boolean
  onToggle: (id: EvidenceSectionId) => void
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="flex w-full items-start justify-between gap-3 text-left"
        >
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <ChevronDownIcon
            className={cn("mt-1 size-4 shrink-0 transition-transform", isOpen ? "rotate-180" : "rotate-0")}
          />
        </button>
      </CardHeader>
      {isOpen ? <CardContent>{children}</CardContent> : null}
    </Card>
  )
}

export function EvidenceSections({
  marketSignals,
  sideSignals,
  correlationSignals,
  bundleSignals,
}: {
  marketSignals: Signal[]
  sideSignals: Signal[]
  correlationSignals: Signal[]
  bundleSignals: Signal[]
}) {
  const [openSectionId, setOpenSectionId] = useState<EvidenceSectionId | null>(null)

  function toggleSection(sectionId: EvidenceSectionId) {
    setOpenSectionId((current) => (current === sectionId ? null : sectionId))
  }

  return (
    <div className="grid gap-4 px-4 lg:px-6">
      <SectionCard
        id="market-pulse"
        title="Market Pulse"
        description="Cache-backed India and global proxy signals for the selected client."
        isOpen={openSectionId === "market-pulse"}
        onToggle={toggleSection}
      >
        <div className="grid gap-3">
          {marketSignals.map((signal) => (
            <div key={signal.signal_id} className="rounded-xl border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{signal.label}</p>
                    {renderSourceLink(signal)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {signal.source} · {formatSignalTime(signal.as_of)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">relevance {formatPercent(signal.customer_relevance)}</Badge>
                  <Badge variant="secondary">confidence {formatPercent(signal.confidence)}</Badge>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{signal.narrative}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="macro-and-catalysts"
        title="Macro and Catalysts"
        description="Supporting macro context and event-like signals derived from news."
        isOpen={openSectionId === "macro-and-catalysts"}
        onToggle={toggleSection}
      >
        <div className="grid gap-3">
          {sideSignals.map((signal) => (
            <div key={signal.signal_id} className="rounded-xl border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="font-medium">{signal.label}</p>
                  {renderSourceLink(signal)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{signal.category}</Badge>
                  <Badge variant="outline">confidence {formatPercent(signal.confidence)}</Badge>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{signal.narrative}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="global-linkages"
        title="Global Linkages"
        description="Precomputed cross-market relationships attached to the selected client."
        isOpen={openSectionId === "global-linkages"}
        onToggle={toggleSection}
      >
        <div className="grid gap-3">
          {correlationSignals.map((signal) => (
            <div key={signal.signal_id} className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{signal.label}</p>
                  <p className="text-xs text-muted-foreground">{formatSignalTime(signal.as_of)}</p>
                </div>
                <Badge variant="outline">confidence {formatPercent(signal.confidence)}</Badge>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{signal.narrative}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="ranked-evidence"
        title="Ranked Evidence Bundle"
        description="Normalized signals assembled for the selected customer."
        isOpen={openSectionId === "ranked-evidence"}
        onToggle={toggleSection}
      >
        <div className="grid gap-3">
          {bundleSignals.map((signal) => (
            <div key={signal.signal_id} className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{signal.label}</p>
                    {renderSourceLink(signal)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {signal.category} · {formatSignalTime(signal.as_of)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">relevance {formatPercent(signal.customer_relevance)}</Badge>
                  <Badge variant="secondary">weight {formatPercent(signal.persona_weight)}</Badge>
                  <Badge variant="outline">confidence {formatPercent(signal.confidence)}</Badge>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{signal.narrative}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}
