"use client"

import { useEffect, useMemo, useState } from "react"

import { ChevronDownIcon, DownloadIcon, SparklesIcon } from "lucide-react"
import { Streamdown } from "streamdown"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { generateBriefingPdf } from "@/components/briefing-pdf"
import type { Customer, Signal } from "@/lib/poc-data"
import {
  type SectionCompletedEvent,
  type SectionFailedEvent,
  type SectionStartedEvent,
  type SummaryCompletedEvent,
  type SummaryRunState,
  type SummarySectionState,
  type SummaryStartedEvent,
  type SummaryStreamEvent,
  type SummaryTiming,
} from "@/lib/summary-stream"
import {
  SUMMARY_SECTION_DEFINITIONS,
  type SummarySectionId,
} from "@/lib/summary-sections"

type StoredBriefingState = {
  run: SummaryRunState
  sections: Record<SummarySectionId, SummarySectionState>
}

function storageKey(customerId: string, cacheDate: string): string {
  return `briefing:${customerId}:${cacheDate}`
}

function createEmptyTiming(): SummaryTiming {
  return {
    startedAt: null,
    firstTokenAt: null,
    completedAt: null,
    firstTokenLatencyMs: null,
    totalDurationMs: null,
  }
}

function createEmptySections(): Record<SummarySectionId, SummarySectionState> {
  return Object.fromEntries(
    SUMMARY_SECTION_DEFINITIONS.map((section) => [
      section.id,
      {
        sectionId: section.id,
        title: section.title,
        status: "idle",
        content: "",
        error: null,
        timing: createEmptyTiming(),
      },
    ])
  ) as Record<SummarySectionId, SummarySectionState>
}

function createEmptyRun(): SummaryRunState {
  return {
    requestId: null,
    status: "idle",
    startedAt: null,
    completedAt: null,
    totalDurationMs: null,
    error: null,
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function sanitizeFilenamePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}


function formatDuration(value: number | null): string {
  if (value === null) {
    return "Unavailable"
  }
  if (value < 1000) {
    return `${value} ms`
  }

  return `${(value / 1000).toFixed(1)} s`
}

function buildMarkdownExport(input: {
  customer: Customer
  displayedBriefingDate: string
  sections: SummarySectionState[]
  marketSignals: Signal[]
  sideSignals: Signal[]
  correlationSignals: Signal[]
  run: SummaryRunState
}): string {
  const allocationRows = input.customer.allocations
    .map((allocation) => `| ${allocation.sector} | ${formatPercent(allocation.weight)} |`)
    .join("\n")

  const signalBlock = (title: string, signals: Signal[]) => {
    if (signals.length === 0) {
      return `## ${title}\n\n_No signals available._`
    }

    return [
      `## ${title}`,
      "",
      ...signals.map(
        (signal) =>
          `- **${signal.label}** (${signal.source}, confidence ${formatPercent(signal.confidence)}): ${signal.narrative}`
      ),
    ].join("\n")
  }

  const timingBlock = [
    "---",
    `generated_at: ${input.run.completedAt ?? "pending"}`,
    `total_duration: ${formatDuration(input.run.totalDurationMs)}`,
    "section_timings:",
    ...input.sections.map(
      (section) =>
        `  - ${section.title}: ${formatDuration(section.timing.totalDurationMs)}`
    ),
    "---",
    "",
  ].join("\n")

  return [
    timingBlock,
    `# ${input.customer.name} Briefing`,
    "",
    `**Briefing date:** ${input.displayedBriefingDate}`,
    `**Persona:** ${input.customer.persona}`,
    `**Mandate:** ${input.customer.mandate}`,
    "",
    "## Client Profile",
    "",
    input.customer.client_profile,
    "",
    "## Allocation Profile",
    "",
    "| Sector | Weight |",
    "| --- | ---: |",
    allocationRows,
    "",
    "## Executive Brief",
    "",
    ...input.sections.flatMap((section) => [
      `### ${section.title}`,
      "",
      section.content || "_No content generated._",
      "",
    ]),
    signalBlock("Market Pulse Signals", input.marketSignals),
    "",
    signalBlock("Macro and Catalyst Signals", input.sideSignals),
    "",
    signalBlock("Correlation Signals", input.correlationSignals),
    "",
  ].join("\n")
}

async function downloadPdfExport(input: {
  customer: Customer
  displayedBriefingDate: string
  sections: SummarySectionState[]
  marketSignals: Signal[]
  sideSignals: Signal[]
  correlationSignals: Signal[]
  cacheDate: string
}) {
  const blob = await generateBriefingPdf(input)
  triggerDownload(blob, `${sanitizeFilenamePart(input.customer.name)}-${input.cacheDate}-briefing.pdf`)
}

function parseSseChunk(chunk: string): SummaryStreamEvent[] {
  return chunk
    .split("\n\n")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const lines = entry.split("\n")
      const eventType = lines.find((line) => line.startsWith("event: "))?.slice(7)
      const dataLine = lines.find((line) => line.startsWith("data: "))?.slice(6)
      if (!eventType || !dataLine) {
        return []
      }

      return [
        {
          type: eventType,
          data: JSON.parse(dataLine),
        } as SummaryStreamEvent,
      ]
    })
}

export function BriefingPanel({
  customerId,
  cacheDate,
  customer,
  displayedBriefingDate,
  marketSignals,
  sideSignals,
  correlationSignals,
}: {
  customerId: string
  cacheDate: string
  customer: Customer
  displayedBriefingDate: string
  marketSignals: Signal[]
  sideSignals: Signal[]
  correlationSignals: Signal[]
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)
  const [summaryRun, setSummaryRun] = useState<SummaryRunState>(createEmptyRun)
  const [sections, setSections] = useState<Record<SummarySectionId, SummarySectionState>>(
    createEmptySections
  )
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [isStorageReady, setIsStorageReady] = useState(false)

  const orderedSections = useMemo(
    () => SUMMARY_SECTION_DEFINITIONS.map((section) => sections[section.id]),
    [sections]
  )

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    setIsGenerating(false)
    setIsStorageReady(false)
    try {
      const stored = window.sessionStorage.getItem(storageKey(customerId, cacheDate))
      if (!stored) {
        setSummaryRun(createEmptyRun())
        setSections(createEmptySections())
        setSummaryError(null)
        setIsStorageReady(true)
        return
      }

      const parsed = JSON.parse(stored) as StoredBriefingState
      setSummaryRun(parsed.run ?? createEmptyRun())
      setSections(parsed.sections ?? createEmptySections())
      setSummaryError(parsed.run?.error ?? null)
      setIsStorageReady(true)
    } catch {
      setSummaryRun(createEmptyRun())
      setSections(createEmptySections())
      setSummaryError(null)
      setIsStorageReady(true)
    }
  }, [customerId, cacheDate])

  useEffect(() => {
    if (!isStorageReady) {
      return
    }

    const isEmpty =
      summaryRun.status === "idle" &&
      orderedSections.every(
        (section) => section.content.length === 0 && section.status === "idle" && !section.error
      )

    if (isEmpty) {
      window.sessionStorage.removeItem(storageKey(customerId, cacheDate))
      return
    }

    const payload: StoredBriefingState = {
      run: summaryRun,
      sections,
    }
    window.sessionStorage.setItem(storageKey(customerId, cacheDate), JSON.stringify(payload))
  }, [cacheDate, customerId, isStorageReady, orderedSections, sections, summaryRun])

  function resetGenerationState() {
    setSummaryRun({
      ...createEmptyRun(),
      status: "generating",
    })
    setSections(
      Object.fromEntries(
        SUMMARY_SECTION_DEFINITIONS.map((section) => [
          section.id,
          {
            sectionId: section.id,
            title: section.title,
            status: "idle",
            content: "",
            error: null,
            timing: createEmptyTiming(),
          },
        ])
      ) as Record<SummarySectionId, SummarySectionState>
    )
    setSummaryError(null)
  }

  function applyStreamEvent(event: SummaryStreamEvent) {
    if (event.type === "summary.started") {
      const payload = event.data as SummaryStartedEvent
      setSummaryRun({
        requestId: payload.requestId,
        status: "generating",
        startedAt: payload.startedAt,
        completedAt: null,
        totalDurationMs: null,
        error: null,
      })
      return
    }

    if (event.type === "summary.completed") {
      const payload = event.data as SummaryCompletedEvent
      setSummaryRun((current) => ({
        ...current,
        status: current.error ? "failed" : "completed",
        completedAt: payload.completedAt,
        totalDurationMs: payload.totalDurationMs,
      }))
      return
    }

    if (event.type === "section.started") {
      const payload = event.data as SectionStartedEvent
      setSections((current) => ({
        ...current,
        [payload.sectionId]: {
          ...current[payload.sectionId],
          title: payload.title,
          status: "generating",
          content: "",
          error: null,
          timing: {
            startedAt: payload.startedAt,
            firstTokenAt: null,
            completedAt: null,
            firstTokenLatencyMs: null,
            totalDurationMs: null,
          },
        },
      }))
      return
    }

    if (event.type === "section.delta") {
      const payload = event.data
      setSections((current) => {
        const previous = current[payload.sectionId]
        return {
          ...current,
          [payload.sectionId]: {
            ...previous,
            status: "generating",
            content: previous.content + payload.delta,
          },
        }
      })
      return
    }

    if (event.type === "section.completed") {
      const payload = event.data as SectionCompletedEvent
      setSections((current) => ({
        ...current,
        [payload.sectionId]: {
          ...current[payload.sectionId],
          title: payload.title,
          status: "completed",
          content: payload.content,
          error: null,
          timing: {
            startedAt: payload.startedAt,
            firstTokenAt: payload.firstTokenAt,
            completedAt: payload.completedAt,
            firstTokenLatencyMs: payload.firstTokenLatencyMs,
            totalDurationMs: payload.totalDurationMs,
          },
        },
      }))
      return
    }

    if (event.type === "section.failed") {
      const payload = event.data as SectionFailedEvent
      setSections((current) => ({
        ...current,
        [payload.sectionId]: {
          ...current[payload.sectionId],
          title: payload.title,
          status: "failed",
          error: payload.error,
          timing: {
            ...current[payload.sectionId].timing,
            startedAt: payload.startedAt,
            completedAt: payload.failedAt,
          },
        },
      }))
      setSummaryRun((current) => ({
        ...current,
        error: current.error ?? payload.error,
      }))
    }
  }

  async function handleGenerateBrief() {
    setIsGenerating(true)
    resetGenerationState()

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId,
          date: cacheDate,
        }),
      })

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? "Summary generation failed.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let buffer = ""

      while (!done) {
        const result = await reader.read()
        done = result.done
        if (!result.value) {
          continue
        }

        buffer += decoder.decode(result.value, { stream: !done })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""

        for (const event of parseSseChunk(parts.join("\n\n"))) {
          applyStreamEvent(event)
        }
      }

      if (buffer.trim()) {
        for (const event of parseSseChunk(buffer)) {
          applyStreamEvent(event)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Summary generation failed."
      setSummaryError(message)
      setSummaryRun((current) => ({
        ...current,
        status: "failed",
        error: message,
      }))
    } finally {
      setIsGenerating(false)
    }
  }

  function handleDownloadMarkdown() {
    const content = buildMarkdownExport({
      customer,
      displayedBriefingDate,
      sections: orderedSections,
      marketSignals,
      sideSignals,
      correlationSignals,
      run: summaryRun,
    })

    triggerDownload(
      new Blob([content], {
        type: "text/markdown;charset=utf-8",
      }),
      `${sanitizeFilenamePart(customer.name)}-${cacheDate}-briefing.md`
    )
  }

  const hasGeneratedContent = orderedSections.some((section) => section.content.trim().length > 0)
  const showSectionGrid =
    isGenerating || hasGeneratedContent || orderedSections.some((section) => section.error)

  return (
    <Card>
      <CardHeader>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Live Briefing Layer</CardTitle>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <Button onClick={handleGenerateBrief} disabled={isGenerating} size="sm">
                <SparklesIcon className="size-3.5" />
                {isGenerating ? "Generating..." : "Generate Brief"}
              </Button>
              {hasMounted ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!hasGeneratedContent || isGenerating}>
                      <DownloadIcon className="size-3.5" />
                      Download
                      <ChevronDownIcon className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadMarkdown}>
                      Export Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        void downloadPdfExport({
                          customer,
                          displayedBriefingDate,
                          sections: orderedSections,
                          marketSignals,
                          sideSignals,
                          correlationSignals,
                          cacheDate,
                        })
                      }
                    >
                      Export PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  <DownloadIcon className="size-3.5" />
                  Download
                  <ChevronDownIcon className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
          <CardDescription>
            Generate a grounded four-section brief from the cached evidence pack for the selected client.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {summaryError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {summaryError}
          </div>
        ) : null}

        {showSectionGrid ? (
          <div className="grid gap-4">
            {orderedSections.map((section) => (
              <div key={section.sectionId} className="min-w-0 rounded-xl border bg-muted/20 p-4">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {section.title}
                  </p>
                </div>

                {section.error ? (
                  <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {section.error}
                  </div>
                ) : null}

                <div className="mt-4">
                  {section.content ? (
                    <Streamdown>{section.content}</Streamdown>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {section.status === "generating"
                        ? "Generating..."
                        : "Awaiting content..."}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Generate a brief to render the streamed summary here.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
