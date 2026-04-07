export const SUMMARY_SECTION_DEFINITIONS = [
  { id: "market-pulse", title: "Market Pulse" },
  { id: "client-relevant-signals", title: "Client-Relevant Signals" },
  { id: "global-linkages", title: "Global Linkages" },
  { id: "talking-points", title: "Talking Points" },
] as const

export const SUMMARY_SECTIONS = SUMMARY_SECTION_DEFINITIONS.map((section) => section.title)

export type SummarySectionId = (typeof SUMMARY_SECTION_DEFINITIONS)[number]["id"]
export type SummarySection = (typeof SUMMARY_SECTION_DEFINITIONS)[number]["title"]

export function getSectionTitle(sectionId: SummarySectionId): SummarySection {
  const match = SUMMARY_SECTION_DEFINITIONS.find((section) => section.id === sectionId)
  if (!match) {
    throw new Error(`Unknown summary section id: ${sectionId}`)
  }

  return match.title
}
