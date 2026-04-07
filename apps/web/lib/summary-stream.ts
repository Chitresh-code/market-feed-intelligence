import type { SummarySectionId } from "@/lib/summary-sections"

export type SummaryTiming = {
  startedAt: string | null
  firstTokenAt: string | null
  completedAt: string | null
  firstTokenLatencyMs: number | null
  totalDurationMs: number | null
}

export type SummarySectionState = {
  sectionId: SummarySectionId
  title: string
  status: "idle" | "generating" | "completed" | "failed"
  content: string
  error: string | null
  timing: SummaryTiming
}

export type SummaryRunState = {
  requestId: string | null
  status: "idle" | "generating" | "completed" | "failed"
  startedAt: string | null
  completedAt: string | null
  totalDurationMs: number | null
  error: string | null
}

export type SummaryStartedEvent = {
  requestId: string
  customerId: string
  cacheDate: string
  startedAt: string
}

export type SectionStartedEvent = {
  sectionId: SummarySectionId
  title: string
  startedAt: string
}

export type SectionDeltaEvent = {
  sectionId: SummarySectionId
  delta: string
}

export type SectionCompletedEvent = {
  sectionId: SummarySectionId
  title: string
  content: string
  startedAt: string
  firstTokenAt: string | null
  completedAt: string
  firstTokenLatencyMs: number | null
  totalDurationMs: number
}

export type SectionFailedEvent = {
  sectionId: SummarySectionId
  title: string
  startedAt: string
  failedAt: string
  error: string
}

export type SummaryCompletedEvent = {
  requestId: string
  completedAt: string
  totalDurationMs: number
}

export type SummaryStreamEvent =
  | { type: "summary.started"; data: SummaryStartedEvent }
  | { type: "section.started"; data: SectionStartedEvent }
  | { type: "section.delta"; data: SectionDeltaEvent }
  | { type: "section.completed"; data: SectionCompletedEvent }
  | { type: "section.failed"; data: SectionFailedEvent }
  | { type: "summary.completed"; data: SummaryCompletedEvent }
