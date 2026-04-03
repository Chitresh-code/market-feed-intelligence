import "server-only"

import OpenAI from "openai"

import type { EvidencePack } from "@/lib/poc-data"

function formatSignalLines(signals: EvidencePack["marketSignals"]): string {
  return signals
    .map(
      (signal, index) =>
        `${index + 1}. ${signal.label} | ${signal.category} | source=${signal.source} | as_of=${signal.as_of} | relevance=${signal.customer_relevance.toFixed(2)} | confidence=${signal.confidence.toFixed(2)} | narrative=${signal.narrative}`
    )
    .join("\n")
}

export function buildEvidencePrompt(evidence: EvidencePack): string {
  const topAllocations = evidence.allocationAnchors
    .map(
      (allocation, index) =>
        `${index + 1}. ${allocation.sector} | weight=${(allocation.weight * 100).toFixed(0)}%`
    )
    .join("\n")

  const allocations = evidence.customer.allocations
    .map(
      (allocation) =>
        `- ${allocation.sector}: ${(allocation.weight * 100).toFixed(0)}%${allocation.ticker ? ` (${allocation.ticker})` : ""}`
    )
    .join("\n")

  const freshness = evidence.freshnessNotes
    .map((item) => `- ${item.dataset}: ${item.status}. ${item.note}`)
    .join("\n")

  return [
    "CLIENT CONTEXT",
    `Name: ${evidence.customer.name}`,
    `Persona: ${evidence.persona.label}`,
    `Client profile: ${evidence.customer.client_profile}`,
    `Mandate: ${evidence.customer.mandate}`,
    `Risk rating: ${evidence.customer.risk_rating}`,
    `Primary objective: ${evidence.customer.primary_objective}`,
    `Communication style: ${evidence.customer.communication_style}`,
    `Decision lens: ${evidence.customer.decision_lens}`,
    `Last meeting: ${evidence.customer.last_meeting}`,
    `Next meeting: ${evidence.customer.next_meeting}`,
    `Meeting context: ${evidence.customer.meeting_context}`,
    `Key concerns: ${evidence.customer.key_concerns.join(", ")}`,
    `Watchlist: ${evidence.customer.watchlist.join(", ")}`,
    `RM notes: ${evidence.customer.rm_notes}`,
    "TOP ALLOCATION ANCHORS",
    topAllocations,
    "",
    "Allocations:",
    allocations,
    "",
    "FRESHNESS",
    freshness,
    "",
    "ALLOCATION-FIRST INSTRUCTION",
    "Any interpretation about sector leadership, policy support, breadth, liquidity, or cross-asset implications must be tied back to the allocation anchors and the signal lines below. If there is no matching signal, do not make the claim.",
    "",
    "MARKET AND SECTOR SIGNALS",
    formatSignalLines(evidence.marketSignals),
    "",
    "MACRO AND CATALYST SIGNALS",
    formatSignalLines(evidence.contextSignals),
    "",
    "GLOBAL LINKAGES",
    formatSignalLines(evidence.correlationSignals),
  ].join("\n")
}

export function buildSystemPrompt(evidence: EvidencePack): string {
  const personaRules = [
    ...evidence.persona.tone_rules,
    ...evidence.persona.prohibited_claim_patterns,
    ...evidence.persona.fallback_rules,
  ]

  return [
    "You are writing a client briefing for a relationship manager.",
    "Write exactly four sections in this order: Market Pulse, Client-Relevant Signals, Global Linkages, Talking Points.",
    "Before each section body, emit a delimiter on its own line in the form [[SECTION:Section Name]].",
    "Write in markdown.",
    "Make the briefing detailed enough for a relationship manager to speak from directly, not a terse recap.",
    "Market Pulse, Client-Relevant Signals, and Global Linkages should each be 2-3 substantive paragraphs or one paragraph plus short supporting bullets when that improves readability.",
    "Talking Points should contain 3-5 concrete bullets the relationship manager can use in the conversation.",
    "Only use facts that are present in the provided evidence.",
    "Differentiate the brief based on this client's top sector allocations, mandate, RM notes, and meeting context.",
    "Treat the listed allocation anchors as the primary frame. If a signal does not map to a top allocation or explicit client concern, it should stay secondary or be omitted.",
    "Do not give the same generic market recap across clients if the evidence allows a more client-specific framing.",
    "Avoid repeating the same point across sections; each section should add a distinct angle.",
    "Prioritize interpretation and client relevance over restating raw data lines verbatim.",
    "Do not invent portfolio values, returns, holdings, exposures, or macro numbers.",
    "Do not make unsupported causal claims.",
    "Do not claim sector leadership, policy execution, breadth expansion, insulation, rebalancing need, or thesis validation unless that claim is directly supported by the evidence lines.",
    "If the evidence is missing for an allocation sleeve, say that the current cache has limited direct coverage for that sleeve and avoid filling the gap with generic commentary.",
    "Do not provide investment advice or tell the client to buy or sell.",
    "If freshness notes indicate stale or mixed timestamps and it affects interpretation, mention that limitation briefly.",
    `Preferred narrative style: ${evidence.persona.preferred_narrative_style}`,
    ...personaRules,
  ].join("\n")
}

export function createLlmClient(): OpenAI {
  const apiKey = process.env.LLM_API_KEY
  const baseURL = process.env.LLM_BASE_URL

  if (!apiKey) {
    throw new Error("LLM_API_KEY is not configured.")
  }

  return new OpenAI({
    apiKey,
    baseURL,
    timeout: 60_000,
  })
}

export function getConfiguredModel(): string {
  const model = process.env.LLM_MODEL
  if (!model) {
    throw new Error("LLM_MODEL is not configured.")
  }
  return model
}

export function getConfiguredProviderLabel(): string {
  const baseURL = process.env.LLM_BASE_URL
  if (!baseURL) {
    return "Unconfigured provider"
  }

  try {
    const url = new URL(baseURL)
    return url.host
  } catch {
    return baseURL
  }
}
