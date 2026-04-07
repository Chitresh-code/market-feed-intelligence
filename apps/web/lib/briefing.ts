import "server-only"

import fs from "node:fs/promises"
import path from "node:path"

import OpenAI from "openai"
import { parse as parseYaml } from "yaml"

import type { EvidencePack, Signal } from "@/lib/poc-data"
import {
  SUMMARY_SECTION_DEFINITIONS,
  type SummarySectionId,
} from "@/lib/summary-sections"

type PromptProfile = {
  id: SummarySectionId
  section_title: string
  system_prompt_template: string
  user_prompt_template: string
  required_variables: string[]
  render_contract: string
  temperature: number
}

type PromptRenderContext = Record<string, string>
type LlmRequestOptions = {
  reasoningEffort?: string
}

const repoRoot = path.join(process.cwd(), "..", "..")
const promptsRoot = path.join(repoRoot, "apps", "web", "prompts")
const sharedOutputGuardrail = [
  "Return only the final answer content for this section.",
  "Do not emit chain-of-thought, scratchpad reasoning, hidden analysis, or self-reflection.",
  "Do not output <thought>, <thinking>, <reasoning>, or similar tags.",
  "Do not narrate your planning process.",
  "Every factual statement must be supported by the supplied evidence or client context.",
  "If evidence coverage is limited, say so explicitly instead of filling the gap with generic market commentary.",
  "Do not give investment advice, target prices, portfolio actions, or unsupported predictions.",
  "Write in the client's persona-appropriate tone: direct and numbers-forward for HNI equity, analytical and regime-aware for institutional mandates.",
].join(" ")

function formatSignalLine(signal: Signal, index: number): string {
  return `${index + 1}. ${signal.label} | ${signal.category} | source=${signal.source} | as_of=${signal.as_of} | relevance=${signal.customer_relevance.toFixed(2)} | confidence=${signal.confidence.toFixed(2)} | narrative=${signal.narrative}`
}

function formatSignalsByHorizon(signals: Signal[]): string {
  if (signals.length === 0) {
    return "No directly matched signals available."
  }

  const horizonOrder: Array<{ key: string; label: string }> = [
    { key: "short", label: "SHORT-TERM SIGNALS (days to 2 weeks)" },
    { key: "medium", label: "MEDIUM-TERM SIGNALS (2 weeks to 3 months)" },
    { key: "long", label: "LONG-TERM SIGNALS (3 months to 12+ months)" },
  ]

  const grouped: Record<string, Signal[]> = { short: [], medium: [], long: [] }
  for (const signal of signals) {
    const horizon = signal.time_horizon ?? "short"
    if (horizon in grouped) {
      grouped[horizon].push(signal)
    } else {
      grouped["short"].push(signal)
    }
  }

  const sections: string[] = []
  let globalIndex = 1

  for (const { key, label } of horizonOrder) {
    const group = grouped[key]
    if (key === "long" && group.length === 0) {
      sections.push(
        `${label}:\n[No long-term signals available in current data. Confine long-term observations to the trajectory implied by medium-term evidence and flag the limitation explicitly.]`
      )
      continue
    }
    if (group.length === 0) {
      continue
    }
    const lines = group.map((signal) => formatSignalLine(signal, globalIndex++))
    sections.push(`${label}:\n${lines.join("\n")}`)
  }

  return sections.join("\n\n")
}

function renderTemplate(template: string, context: PromptRenderContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in context)) {
      throw new Error(`Prompt variable is missing: ${key}`)
    }

    return context[key]
  })
}

function validatePromptProfile(value: unknown, fileName: string): PromptProfile {
  if (!value || typeof value !== "object") {
    throw new Error(`Prompt profile ${fileName} must be a YAML object.`)
  }

  const candidate = value as Record<string, unknown>
  const requiredKeys = [
    "id",
    "section_title",
    "system_prompt_template",
    "user_prompt_template",
    "required_variables",
    "render_contract",
    "temperature",
  ]

  for (const key of requiredKeys) {
    if (!(key in candidate)) {
      throw new Error(`Prompt profile ${fileName} is missing required key: ${key}`)
    }
  }

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.section_title !== "string" ||
    typeof candidate.system_prompt_template !== "string" ||
    typeof candidate.user_prompt_template !== "string" ||
    typeof candidate.render_contract !== "string" ||
    typeof candidate.temperature !== "number" ||
    !Array.isArray(candidate.required_variables) ||
    !candidate.required_variables.every((item) => typeof item === "string")
  ) {
    throw new Error(`Prompt profile ${fileName} has invalid field types.`)
  }

  return {
    id: candidate.id as SummarySectionId,
    section_title: candidate.section_title,
    system_prompt_template: candidate.system_prompt_template,
    user_prompt_template: candidate.user_prompt_template,
    required_variables: candidate.required_variables,
    render_contract: candidate.render_contract,
    temperature: candidate.temperature,
  }
}

async function readPromptProfile(sectionId: SummarySectionId): Promise<PromptProfile> {
  const filePath = path.join(promptsRoot, `${sectionId}.yaml`)
  let raw: string

  try {
    raw = await fs.readFile(filePath, "utf8")
  } catch {
    throw new Error(`Prompt profile file is missing: ${filePath}`)
  }

  return validatePromptProfile(parseYaml(raw), path.basename(filePath))
}

export async function loadPromptProfiles(): Promise<PromptProfile[]> {
  return Promise.all(
    SUMMARY_SECTION_DEFINITIONS.map((section) => readPromptProfile(section.id))
  )
}

function buildClientContext(evidence: EvidencePack): string {
  const holdingsSummary = evidence.customer.allocations
    .filter((allocation) => allocation.key_holdings.length > 0)
    .map((allocation) => `${allocation.sector}: ${allocation.key_holdings.join(", ")}`)
    .join(" | ")

  return [
    `Name: ${evidence.customer.name}`,
    `Persona: ${evidence.persona.label}`,
    `Mandate: ${evidence.customer.mandate}`,
    `Client profile: ${evidence.customer.client_profile}`,
    `Risk rating: ${evidence.customer.risk_rating}`,
    `Relationship since: ${evidence.customer.relationship_since}`,
    `Last meeting: ${evidence.customer.last_meeting}`,
    `Next meeting: ${evidence.customer.next_meeting}`,
    `Primary objective: ${evidence.customer.primary_objective}`,
    `Communication style: ${evidence.customer.communication_style}`,
    `Decision lens: ${evidence.customer.decision_lens}`,
    `Meeting context: ${evidence.customer.meeting_context}`,
    `Key concerns: ${evidence.customer.key_concerns.join(", ")}`,
    `Watchlist: ${evidence.customer.watchlist.join(", ")}`,
    holdingsSummary ? `Key holdings by sleeve: ${holdingsSummary}` : null,
    `RM notes: ${evidence.customer.rm_notes}`,
    `Preferred narrative style: ${evidence.persona.preferred_narrative_style}`,
  ]
    .filter(Boolean)
    .join("\n")
}

function buildTopAllocations(evidence: EvidencePack): string {
  return evidence.allocationAnchors
    .map((allocation, index) => {
      const holdingsStr =
        allocation.key_holdings.length > 0
          ? ` | holdings=${allocation.key_holdings.join(", ")}`
          : ""
      return `${index + 1}. ${allocation.sector} | weight=${(allocation.weight * 100).toFixed(0)}%${holdingsStr}`
    })
    .join("\n")
}

function buildClientObjectives(evidence: EvidencePack): string {
  return [
    `Primary objective: ${evidence.customer.primary_objective}`,
    `Decision lens: ${evidence.customer.decision_lens}`,
    `Key concerns: ${evidence.customer.key_concerns.join(", ")}`,
    `RM notes: ${evidence.customer.rm_notes}`,
  ].join("\n")
}

function buildConversationPriorities(evidence: EvidencePack): string {
  return [
    `Meeting context: ${evidence.customer.meeting_context}`,
    `Primary objective: ${evidence.customer.primary_objective}`,
    `Key concerns: ${evidence.customer.key_concerns.join(", ")}`,
    `RM focus: ${evidence.customer.rm_notes}`,
    `Communication style: ${evidence.customer.communication_style}`,
  ].join("\n")
}

function buildHorizonPriority(evidence: EvidencePack): string {
  if (evidence.customer.persona === "hni_equity") {
    return (
      "Horizon priority for this persona: SHORT-TERM is primary — emphasize immediate portfolio impact " +
      "and this-week catalysts first. MEDIUM-TERM provides supporting context for trend sustainability " +
      "and earnings cycle positioning. LONG-TERM should only appear if it directly affects current " +
      "holdings or mandate — do not pad with generic structural commentary."
    )
  }
  // inst_fund
  return (
    "Horizon priority for this persona: MEDIUM-TERM is primary — focus on allocation adjustments, " +
    "earnings cycle, and policy lag effects. LONG-TERM is equally important — cover structural " +
    "positioning, mandate compliance, and cross-market linkage durability. SHORT-TERM is a tactical " +
    "overlay — mention only when it materially affects the medium or long-term thesis."
  )
}

function buildFreshnessNotes(evidence: EvidencePack): string {
  if (evidence.freshnessNotes.length === 0) {
    return "No freshness caveats recorded."
  }

  return evidence.freshnessNotes
    .map((item) => `- ${item.dataset}: ${item.status}. ${item.note}`)
    .join("\n")
}

function getSectionSignals(evidence: EvidencePack, sectionId: SummarySectionId): Signal[] {
  switch (sectionId) {
    case "market-pulse":
      return [
        ...evidence.marketSignals,
        ...evidence.longTermSignals,
      ]
    case "client-relevant-signals":
      return [
        ...evidence.marketSignals,
        ...evidence.contextSignals,
        ...evidence.longTermSignals,
      ]
    case "global-linkages":
      return [
        ...evidence.correlationSignals,
        ...evidence.contextSignals.filter((signal) => signal.category === "macro_series"),
        ...evidence.contextSignals.filter((signal) => signal.category === "news_event_signal").slice(0, 2),
        ...evidence.longTermSignals,
      ]
    case "talking-points":
      return [
        ...evidence.marketSignals,
        ...evidence.contextSignals,
        ...evidence.correlationSignals,
        ...evidence.longTermSignals,
      ]
    default:
      return []
  }
}

export function buildPromptRenderContext(
  evidence: EvidencePack,
  sectionId: SummarySectionId
): PromptRenderContext {
  return {
    client_context: buildClientContext(evidence),
    top_allocations: buildTopAllocations(evidence),
    client_objectives: buildClientObjectives(evidence),
    conversation_priorities: buildConversationPriorities(evidence),
    freshness_notes: buildFreshnessNotes(evidence),
    section_signals: formatSignalsByHorizon(getSectionSignals(evidence, sectionId)),
    horizon_priority: buildHorizonPriority(evidence),
  }
}

export function renderPromptProfile(
  profile: PromptProfile,
  context: PromptRenderContext
): {
  systemPrompt: string
  userPrompt: string
} {
  for (const variableName of profile.required_variables) {
    if (!(variableName in context)) {
      throw new Error(`Prompt profile ${profile.id} requires missing variable: ${variableName}`)
    }
  }

  return {
    systemPrompt: [
      renderTemplate(profile.system_prompt_template, context),
      `Output contract: ${profile.render_contract}`,
      sharedOutputGuardrail,
    ].join("\n\n"),
    userPrompt: renderTemplate(profile.user_prompt_template, context),
  }
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

export function getLlmRequestOptions(): LlmRequestOptions {
  const configuredEffort = process.env.LLM_REASONING_EFFORT?.trim()
  const baseURL = process.env.LLM_BASE_URL ?? ""

  if (baseURL.includes("generativelanguage.googleapis.com")) {
    return {}
  }

  if (configuredEffort) {
    return {
      reasoningEffort: configuredEffort,
    }
  }

  return {}
}
