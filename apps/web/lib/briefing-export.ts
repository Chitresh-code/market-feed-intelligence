import type { Customer, Signal } from "@/lib/poc-data"
import type { SummaryRunState, SummarySectionState } from "@/lib/summary-stream"

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
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

export function buildBriefingMarkdown(input: {
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
