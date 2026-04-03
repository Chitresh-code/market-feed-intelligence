"use client"

import { useEffect, useMemo, useState } from "react"

import { ChevronDownIcon, DownloadIcon, SparklesIcon } from "lucide-react"
import ReactMarkdown from "react-markdown"

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
import type {
  Customer,
  Signal,
} from "@/lib/poc-data"
import { SUMMARY_SECTIONS } from "@/lib/summary-sections"

type StoredBriefingState = {
  summaryText: string
  summaryError: string | null
}

function storageKey(customerId: string, cacheDate: string): string {
  return `briefing:${customerId}:${cacheDate}`
}

function parseSections(text: string) {
  return SUMMARY_SECTIONS.map((section, index) => {
    const marker = `[[SECTION:${section}]]`
    const start = text.indexOf(marker)
    if (start === -1) {
      return { title: section, content: "" }
    }

    const contentStart = start + marker.length
    const nextMarkers = SUMMARY_SECTIONS.slice(index + 1)
      .map((name) => text.indexOf(`[[SECTION:${name}]]`, contentStart))
      .filter((position) => position >= 0)
    const contentEnd = nextMarkers.length > 0 ? Math.min(...nextMarkers) : text.length

    return {
      title: section,
      content: text.slice(contentStart, contentEnd).trim(),
    }
  })
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

function markdownToPlainText(value: string): string {
  return value
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .trim()
}

function buildMarkdownExport(input: {
  customer: Customer
  displayedBriefingDate: string
  sections: Array<{ title: string; content: string }>
  marketSignals: Signal[]
  sideSignals: Signal[]
  correlationSignals: Signal[]
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

  return [
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
  sections: Array<{ title: string; content: string }>
  marketSignals: Signal[]
  sideSignals: Signal[]
  correlationSignals: Signal[]
  cacheDate: string
}) {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF({
    unit: "pt",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 48
  const marginTop = 54
  const contentWidth = pageWidth - marginX * 2
  let cursorY = marginTop

  const ensureSpace = (heightNeeded: number) => {
    if (cursorY + heightNeeded <= pageHeight - 48) {
      return
    }
    doc.addPage()
    cursorY = marginTop
  }

  const drawParagraph = (text: string, fontSize = 11, color = "#1f2937") => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(fontSize)
    doc.setTextColor(color)
    const lines = doc.splitTextToSize(text, contentWidth)
    const height = lines.length * (fontSize + 4)
    ensureSpace(height + 8)
    doc.text(lines, marginX, cursorY)
    cursorY += height + 8
  }

  const drawHeading = (text: string, level: 1 | 2 | 3) => {
    const size = level === 1 ? 22 : level === 2 ? 15 : 12
    const color = level === 1 ? "#111827" : "#0f172a"
    ensureSpace(size + 12)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(size)
    doc.setTextColor(color)
    doc.text(text, marginX, cursorY)
    cursorY += size + 6
    if (level <= 2) {
      doc.setDrawColor("#d1d5db")
      doc.line(marginX, cursorY, marginX + contentWidth, cursorY)
      cursorY += 12
    }
  }

  const drawBulletList = (items: string[]) => {
    for (const item of items) {
      const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 8)
      const height = lines.length * 15
      ensureSpace(height + 4)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      doc.setTextColor("#1f2937")
      doc.text(lines, marginX + 4, cursorY)
      cursorY += height + 4
    }
    cursorY += 4
  }

  drawHeading(`${input.customer.name} Briefing`, 1)
  drawParagraph(
    `Briefing date: ${input.displayedBriefingDate}    Mandate: ${input.customer.mandate}    Persona: ${input.customer.persona}`,
    11,
    "#475569"
  )

  drawHeading("Client Profile", 2)
  drawParagraph(input.customer.client_profile)

  drawHeading("Allocation Profile", 2)
  drawBulletList(
    input.customer.allocations.map(
      (allocation) => `${allocation.sector}: ${formatPercent(allocation.weight)}`
    )
  )

  drawHeading("Executive Brief", 2)
  for (const section of input.sections) {
    drawHeading(section.title, 3)
    drawParagraph(markdownToPlainText(section.content || "No content generated."))
  }

  const exportSignals = (title: string, signals: Signal[]) => {
    drawHeading(title, 2)
    if (signals.length === 0) {
      drawParagraph("No signals available.")
      return
    }
    drawBulletList(
      signals.map(
        (signal) =>
          `${signal.label} (${signal.source}, confidence ${formatPercent(signal.confidence)}): ${signal.narrative}`
      )
    )
  }

  exportSignals("Market Pulse Signals", input.marketSignals)
  exportSignals("Macro and Catalyst Signals", input.sideSignals)
  exportSignals("Correlation Signals", input.correlationSignals)

  doc.save(
    `${sanitizeFilenamePart(input.customer.name)}-${input.cacheDate}-briefing.pdf`
  )
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
  const [summaryText, setSummaryText] = useState("")
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [isStorageReady, setIsStorageReady] = useState(false)

  const sections = useMemo(() => parseSections(summaryText), [summaryText])

  useEffect(() => {
    setIsGenerating(false)
    setIsStorageReady(false)
    try {
      const stored = window.sessionStorage.getItem(storageKey(customerId, cacheDate))
      if (!stored) {
        setSummaryText("")
        setSummaryError(null)
        setIsStorageReady(true)
        return
      }

      const parsed = JSON.parse(stored) as StoredBriefingState
      setSummaryText(parsed.summaryText ?? "")
      setSummaryError(parsed.summaryError ?? null)
      setIsStorageReady(true)
    } catch {
      setSummaryText("")
      setSummaryError(null)
      setIsStorageReady(true)
    }
  }, [customerId, cacheDate])

  useEffect(() => {
    if (!isStorageReady) {
      return
    }

    if (!summaryText && !summaryError) {
      window.sessionStorage.removeItem(storageKey(customerId, cacheDate))
      return
    }

    const payload: StoredBriefingState = {
      summaryText,
      summaryError,
    }
    window.sessionStorage.setItem(storageKey(customerId, cacheDate), JSON.stringify(payload))
  }, [cacheDate, customerId, isStorageReady, summaryError, summaryText])

  async function handleGenerateBrief() {
    setIsGenerating(true)
    setSummaryText("")
    setSummaryError(null)

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

      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) {
          setSummaryText((current) => current + decoder.decode(result.value, { stream: !done }))
        }
      }
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : "Summary generation failed.")
    } finally {
      setIsGenerating(false)
    }
  }

  function handleDownloadMarkdown() {
    const content = buildMarkdownExport({
      customer,
      displayedBriefingDate,
      sections,
      marketSignals,
      sideSignals,
      correlationSignals,
    })

    triggerDownload(
      new Blob([content], {
        type: "text/markdown;charset=utf-8",
      }),
      `${sanitizeFilenamePart(customer.name)}-${cacheDate}-briefing.md`
    )
  }

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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!summaryText || isGenerating}
                  >
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
                        sections,
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
            </div>
          </div>
          <CardDescription>
            Generate a grounded four-section brief from the cached evidence pack for the selected client.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaryError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {summaryError}
          </div>
        ) : null}

        {summaryText ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {sections.map((section) => (
              <div key={section.title} className="rounded-xl border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {section.title}
                </p>
                <div className="prose prose-sm mt-3 max-w-none text-foreground dark:prose-invert">
                  {section.content ? (
                    <ReactMarkdown>{section.content}</ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                      {isGenerating ? "Generating..." : "Awaiting content..."}
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
