"use client"

import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer"

import type { Customer, Signal } from "@/lib/poc-data"
import type { SummarySectionState } from "@/lib/summary-stream"

Font.register({
  family: "Helvetica",
  fonts: [],
})

const C = {
  navy: "#0c1a2e",
  navyMid: "#1e3a5f",
  navyLight: "#2d5282",
  accent: "#c9a84c",
  accentLight: "#f6e8a8",
  accentBg: "#fdfaef",
  white: "#ffffff",
  offWhite: "#f8fafc",
  bodyText: "#1e293b",
  mutedText: "#64748b",
  lightText: "#94a3b8",
  border: "#e2e8f0",
  borderMid: "#cbd5e1",
  greenBg: "#dcfce7",
  greenText: "#15803d",
  amberBg: "#fef9c3",
  amberText: "#92400e",
  redBg: "#fee2e2",
  redText: "#b91c1c",
  sectionBg: "#f1f5f9",
}

const S = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    fontSize: 9,
    color: C.bodyText,
    paddingBottom: 52,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  headerBand: {
    backgroundColor: C.navy,
    paddingTop: 32,
    paddingHorizontal: 44,
    paddingBottom: 0,
  },
  headerEyebrow: {
    fontSize: 7,
    color: C.accent,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 8,
    fontFamily: "Helvetica-Bold",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    marginBottom: 14,
    letterSpacing: 0.4,
  },
  headerMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 0,
  },
  headerMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
    marginBottom: 4,
  },
  headerMetaLabel: {
    fontSize: 7,
    color: "#64748b",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginRight: 4,
    fontFamily: "Helvetica-Bold",
  },
  headerMetaValue: {
    fontSize: 8.5,
    color: "#e2e8f0",
  },
  accentBar: {
    height: 3,
    backgroundColor: C.accent,
  },

  // ── Body ────────────────────────────────────────────────────────────────
  body: {
    paddingHorizontal: 44,
    paddingTop: 22,
  },

  // ── Section ─────────────────────────────────────────────────────────────
  section: {
    marginBottom: 18,
  },
  sectionHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionAccentPill: {
    width: 4,
    height: 14,
    backgroundColor: C.accent,
    borderRadius: 2,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
    letterSpacing: 0.3,
    flex: 1,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 10,
    marginLeft: 12,
    flex: 1,
    alignSelf: "center",
  },

  // ── Sub-section ─────────────────────────────────────────────────────────
  subSectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: C.navyMid,
    marginBottom: 4,
    marginTop: 10,
  },

  // ── Text ────────────────────────────────────────────────────────────────
  paragraph: {
    fontSize: 9,
    color: C.bodyText,
    lineHeight: 1.65,
    marginBottom: 6,
  },

  // ── Client Profile ──────────────────────────────────────────────────────
  profileCard: {
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: "10 12",
    marginBottom: 6,
  },
  profileRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  profileChip: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.borderMid,
    borderRadius: 3,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  profileChipLabel: {
    fontSize: 7,
    color: C.mutedText,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  profileChipValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
  },
  profileText: {
    fontSize: 8.5,
    color: C.bodyText,
    lineHeight: 1.6,
  },

  // ── Allocation grid ─────────────────────────────────────────────────────
  allocGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  allocCard: {
    width: "30.5%",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    padding: "6 8",
  },
  allocBar: {
    height: 2,
    backgroundColor: C.accent,
    borderRadius: 1,
    marginBottom: 5,
  },
  allocSector: {
    fontSize: 7.5,
    color: C.mutedText,
    marginBottom: 2,
    lineHeight: 1.3,
  },
  allocWeight: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
  },

  // ── Signal card ─────────────────────────────────────────────────────────
  signalCard: {
    backgroundColor: C.offWhite,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  signalLeft: {
    flex: 1,
  },
  signalRight: {
    width: 52,
    alignItems: "flex-end",
    paddingLeft: 6,
    paddingTop: 1,
  },
  signalLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
    marginBottom: 3,
  },
  signalNarrative: {
    fontSize: 8,
    color: C.bodyText,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  signalTagRow: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
  },
  signalTag: {
    fontSize: 6.5,
    color: C.mutedText,
    backgroundColor: C.sectionBg,
    borderWidth: 1,
    borderColor: C.borderMid,
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  badgeHigh: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.greenText,
    backgroundColor: C.greenBg,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
    textAlign: "center",
  },
  badgeMed: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.amberText,
    backgroundColor: C.amberBg,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
    textAlign: "center",
  },
  badgeLow: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.redText,
    backgroundColor: C.redBg,
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 5,
    textAlign: "center",
  },

  // ── Executive brief items ────────────────────────────────────────────────
  briefSection: {
    marginBottom: 10,
  },
  briefSectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: C.navyLight,
    marginBottom: 3,
    borderLeftWidth: 2,
    borderLeftColor: C.accent,
    paddingLeft: 7,
  },
  briefBody: {
    fontSize: 8.5,
    color: C.bodyText,
    lineHeight: 1.65,
    paddingLeft: 9,
  },

  // ── Footer ──────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 18,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 7,
  },
  footerLeft: {
    fontSize: 7,
    color: C.lightText,
  },
  footerRight: {
    fontSize: 7,
    color: C.lightText,
  },

  // ── Empty state ─────────────────────────────────────────────────────────
  emptyState: {
    fontSize: 8.5,
    color: C.mutedText,
    fontStyle: "italic",
    paddingLeft: 4,
  },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function confidenceBadge(confidence: number) {
  const label = pct(confidence)
  if (confidence >= 0.7) {
    return <Text style={S.badgeHigh}>{label}</Text>
  }
  if (confidence >= 0.4) {
    return <Text style={S.badgeMed}>{label}</Text>
  }
  return <Text style={S.badgeLow}>{label}</Text>
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function stripMarkdown(value: string): string {
  return value
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^[-*]\s+/gm, "\u2022 ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={S.sectionHeadRow}>
      <View style={S.sectionAccentPill} />
      <Text style={S.sectionTitle}>{title}</Text>
      <View style={S.sectionDivider} />
    </View>
  )
}

function AllocationGrid({ allocations }: { allocations: Customer["allocations"] }) {
  const sorted = [...allocations].sort((a, b) => b.weight - a.weight)
  return (
    <View style={S.allocGrid}>
      {sorted.map((a) => (
        <View key={a.sector} style={S.allocCard}>
          <View style={[S.allocBar, { width: `${Math.round(a.weight * 100)}%` }]} />
          <Text style={S.allocSector}>{a.sector}</Text>
          <Text style={S.allocWeight}>{pct(a.weight)}</Text>
        </View>
      ))}
    </View>
  )
}

function SignalList({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) {
    return <Text style={S.emptyState}>No signals available.</Text>
  }
  return (
    <View>
      {signals.map((signal) => (
        <View key={signal.signal_id} style={S.signalCard}>
          <View style={S.signalLeft}>
            <Text style={S.signalLabel}>{signal.label}</Text>
            <Text style={S.signalNarrative}>{signal.narrative}</Text>
            <View style={S.signalTagRow}>
              <Text style={S.signalTag}>{signal.source}</Text>
              <Text style={S.signalTag}>{capitalize(signal.time_horizon)} horizon</Text>
            </View>
          </View>
          <View style={S.signalRight}>{confidenceBadge(signal.confidence)}</View>
        </View>
      ))}
    </View>
  )
}

function ExecutiveBrief({ sections }: { sections: SummarySectionState[] }) {
  const ready = sections.filter((s) => s.content && s.content.trim().length > 0)
  if (ready.length === 0) {
    return <Text style={S.emptyState}>No brief content generated.</Text>
  }
  return (
    <View>
      {ready.map((section) => (
        <View key={section.sectionId} style={S.briefSection}>
          <Text style={S.briefSectionTitle}>{section.title}</Text>
          <Text style={S.briefBody}>{stripMarkdown(section.content ?? "")}</Text>
        </View>
      ))}
    </View>
  )
}

// ── Document ─────────────────────────────────────────────────────────────────

type BriefingPdfProps = {
  customer: Customer
  displayedBriefingDate: string
  sections: SummarySectionState[]
  marketSignals: Signal[]
  sideSignals: Signal[]
  correlationSignals: Signal[]
  cacheDate: string
}

function BriefingDocument({
  customer,
  displayedBriefingDate,
  sections,
  marketSignals,
  sideSignals,
  correlationSignals,
}: BriefingPdfProps) {
  const personaLabel =
    customer.persona === "hni_equity" ? "HNI Equity" : "Institutional Fund"

  return (
    <Document
      title={`${customer.name} — Client Briefing`}
      author="Macquire"
      subject="Client Investment Briefing"
    >
      <Page size="A4" style={S.page}>
        {/* Header */}
        <View style={S.headerBand} fixed>
          <Text style={S.headerEyebrow}>Client Investment Briefing</Text>
          <Text style={S.headerTitle}>{customer.name}</Text>
          <View style={S.headerMetaRow}>
            <View style={S.headerMetaChip}>
              <Text style={S.headerMetaLabel}>Date</Text>
              <Text style={S.headerMetaValue}>{displayedBriefingDate}</Text>
            </View>
            <View style={S.headerMetaChip}>
              <Text style={S.headerMetaLabel}>Mandate</Text>
              <Text style={S.headerMetaValue}>{customer.mandate}</Text>
            </View>
            <View style={S.headerMetaChip}>
              <Text style={S.headerMetaLabel}>Persona</Text>
              <Text style={S.headerMetaValue}>{personaLabel}</Text>
            </View>
            <View style={S.headerMetaChip}>
              <Text style={S.headerMetaLabel}>Risk</Text>
              <Text style={S.headerMetaValue}>{customer.risk_rating}</Text>
            </View>
          </View>
        </View>
        <View style={S.accentBar} fixed />

        {/* Body */}
        <View style={S.body}>
          {/* Client Profile */}
          <View style={S.section}>
            <SectionHeader title="Client Profile" />
            <View style={S.profileCard}>
              <View style={S.profileRow}>
                {customer.relationship_since ? (
                  <View style={S.profileChip}>
                    <Text style={S.profileChipLabel}>Client Since</Text>
                    <Text style={S.profileChipValue}>{customer.relationship_since}</Text>
                  </View>
                ) : null}
                {customer.primary_objective ? (
                  <View style={S.profileChip}>
                    <Text style={S.profileChipLabel}>Objective</Text>
                    <Text style={S.profileChipValue}>{customer.primary_objective}</Text>
                  </View>
                ) : null}
                {customer.communication_style ? (
                  <View style={S.profileChip}>
                    <Text style={S.profileChipLabel}>Communication</Text>
                    <Text style={S.profileChipValue}>{customer.communication_style}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={S.profileText}>{customer.client_profile}</Text>
            </View>
          </View>

          {/* Allocation Profile */}
          <View style={S.section}>
            <SectionHeader title="Allocation Profile" />
            <AllocationGrid allocations={customer.allocations} />
          </View>

          {/* Executive Brief */}
          <View style={S.section}>
            <SectionHeader title="Executive Brief" />
            <ExecutiveBrief sections={sections} />
          </View>

          {/* Market Pulse Signals */}
          <View style={S.section}>
            <SectionHeader title="Market Pulse Signals" />
            <SignalList signals={marketSignals} />
          </View>

          {/* Macro and Catalyst Signals */}
          <View style={S.section}>
            <SectionHeader title="Macro and Catalyst Signals" />
            <SignalList signals={sideSignals} />
          </View>

          {/* Correlation Signals */}
          <View style={S.section}>
            <SectionHeader title="Correlation Signals" />
            <SignalList signals={correlationSignals} />
          </View>
        </View>

        {/* Footer */}
        <View style={S.footer} fixed>
          <Text style={S.footerLeft}>
            {customer.name} — Confidential Client Briefing
          </Text>
          <Text
            style={S.footerRight}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}

// ── Public export ─────────────────────────────────────────────────────────────

export async function generateBriefingPdf(props: BriefingPdfProps): Promise<Blob> {
  const blob = await pdf(<BriefingDocument {...props} />).toBlob()
  return blob
}
