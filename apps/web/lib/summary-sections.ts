export const SUMMARY_SECTIONS = [
  "Market Pulse",
  "Client-Relevant Signals",
  "Global Linkages",
  "Talking Points",
] as const

export type SummarySection = (typeof SUMMARY_SECTIONS)[number]
