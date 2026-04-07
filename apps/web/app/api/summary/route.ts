import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"
import OpenAI from "openai"

import {
  buildPromptRenderContext,
  createLlmClient,
  getConfiguredModel,
  getLlmRequestOptions,
  loadPromptProfiles,
  renderPromptProfile,
} from "@/lib/briefing"
import { getSummaryContext } from "@/lib/poc-data"
import type {
  SectionCompletedEvent,
  SectionFailedEvent,
  SectionStartedEvent,
  SummaryCompletedEvent,
  SummaryStartedEvent,
  SummaryStreamEvent,
} from "@/lib/summary-stream"

function parseRequestBody(value: unknown): { customerId: string; date?: string } {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be a JSON object.")
  }

  const candidate = value as Record<string, unknown>
  if (typeof candidate.customerId !== "string" || candidate.customerId.trim().length === 0) {
    throw new Error("customerId is required.")
  }

  if (candidate.date !== undefined && typeof candidate.date !== "string") {
    throw new Error("date must be a string when provided.")
  }

  return {
    customerId: candidate.customerId,
    date: candidate.date,
  }
}

function encodeSseEvent(event: SummaryStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
}

function stripReasoningTags(raw: string): string {
  let sanitized = raw
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<\/?(thought|thinking|reasoning)>/gi, "")

  const openTags = ["<thought>", "<thinking>", "<reasoning>"]
  for (const tag of openTags) {
    const position = sanitized.toLowerCase().lastIndexOf(tag)
    if (position >= 0) {
      sanitized = sanitized.slice(0, position)
    }
  }

  return sanitized
}

function extractMessageText(
  content: OpenAI.Chat.Completions.ChatCompletionMessage["content"]
): string {
  if (typeof content === "string") {
    return content
  }

  const parts = Array.isArray(content) ? (content as Array<Record<string, unknown>>) : null
  if (!parts) {
    return ""
  }

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
}

function endsAbruptly(value: string): boolean {
  if (!value) {
    return true
  }

  return /[A-Za-z0-9,(]$/.test(value.trim())
}

function shouldRetryCompletion(value: string, finishReason: string | null): boolean {
  return finishReason === "length" || value.trim().length === 0 || endsAbruptly(value)
}

export async function POST(request: Request) {
  try {
    const body = parseRequestBody(await request.json())
    const summaryContext = await getSummaryContext(body.customerId, body.date)
    const profiles = await loadPromptProfiles()
    const client = createLlmClient()
    const model = getConfiguredModel()
    const llmRequestOptions = getLlmRequestOptions()
    const requestId = randomUUID()
    const summaryStartedAt = new Date().toISOString()

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: SummaryStreamEvent) => {
          controller.enqueue(encoder.encode(encodeSseEvent(event)))
        }

        send({
          type: "summary.started",
          data: {
            requestId,
            customerId: body.customerId,
            cacheDate: summaryContext.cacheDate,
            startedAt: summaryStartedAt,
          } satisfies SummaryStartedEvent,
        })

        const tasks = profiles.map(async (profile) => {
          const startedAt = new Date().toISOString()
          send({
            type: "section.started",
            data: {
              sectionId: profile.id,
              title: profile.section_title,
              startedAt,
            } satisfies SectionStartedEvent,
          })

          try {
            const renderContext = buildPromptRenderContext(summaryContext.evidencePack, profile.id)
            const prompts = renderPromptProfile(profile, renderContext)

            const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
              { role: "system", content: prompts.systemPrompt },
              { role: "user", content: prompts.userPrompt },
            ]

            const baseRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
              model,
              temperature: profile.temperature,
              stream: true,
              messages: baseMessages,
            }

            const completion = await client.chat.completions.create(
              llmRequestOptions.reasoningEffort
                ? {
                    ...baseRequest,
                    reasoning_effort: llmRequestOptions.reasoningEffort as
                      | "low"
                      | "medium"
                      | "high",
                }
                : baseRequest
            )

            let rawContent = ""
            let emittedContent = ""
            let firstTokenAt: string | null = null
            let lastFinishReason: string | null = null

            for await (const chunk of completion) {
              const choice = chunk.choices[0]
              const delta = choice?.delta?.content
              const deltaMetadata = choice?.delta as
                | ({ extra_content?: { google?: { thought?: boolean } } } & Record<string, unknown>)
                | undefined
              lastFinishReason = choice?.finish_reason ?? lastFinishReason

              if (deltaMetadata?.extra_content?.google?.thought === true) {
                continue
              }

              if (!delta) {
                continue
              }

              rawContent += delta
              const sanitizedContent = stripReasoningTags(rawContent)
              const sanitizedDelta = sanitizedContent.slice(emittedContent.length)

              if (!sanitizedDelta) {
                continue
              }

              emittedContent = sanitizedContent
              if (!firstTokenAt) {
                firstTokenAt = new Date().toISOString()
              }

              send({
                type: "section.delta",
                data: {
                  sectionId: profile.id,
                  delta: sanitizedDelta,
                },
              })
            }

            let finalContent = emittedContent.trim()

            if (shouldRetryCompletion(finalContent, lastFinishReason)) {
              const retryMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                { role: "system", content: prompts.systemPrompt },
                { role: "user", content: prompts.userPrompt },
              ]

              const retryBaseRequest: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
                model,
                temperature: profile.temperature,
                messages: retryMessages,
              }

              const retry = await client.chat.completions.create(
                llmRequestOptions.reasoningEffort
                  ? {
                      ...retryBaseRequest,
                      reasoning_effort: llmRequestOptions.reasoningEffort as
                        | "low"
                        | "medium"
                        | "high",
                    }
                  : retryBaseRequest
              )

              const retriedContent = stripReasoningTags(
                extractMessageText(retry.choices[0]?.message?.content).trim()
              ).trim()

              if (retriedContent.length > finalContent.length) {
                finalContent = retriedContent
              }
            }

            const completedAt = new Date().toISOString()
            const firstTokenLatencyMs = firstTokenAt
              ? new Date(firstTokenAt).getTime() - new Date(startedAt).getTime()
              : null
            const totalDurationMs =
              new Date(completedAt).getTime() - new Date(startedAt).getTime()

            send({
              type: "section.completed",
              data: {
                sectionId: profile.id,
                title: profile.section_title,
                content: finalContent,
                startedAt,
                firstTokenAt,
                completedAt,
                firstTokenLatencyMs,
                totalDurationMs,
              } satisfies SectionCompletedEvent,
            })
          } catch (error) {
            const failedAt = new Date().toISOString()
            const errorMessage = error instanceof Error ? error.message : "Section generation failed."
            console.error(
              `[summary] section "${profile.id}" failed requestId=${requestId} customerId=${body.customerId}`,
              error
            )
            send({
              type: "section.failed",
              data: {
                sectionId: profile.id,
                title: profile.section_title,
                startedAt,
                failedAt,
                error: errorMessage,
              } satisfies SectionFailedEvent,
            })
          }
        })

        await Promise.all(tasks)

        const completedAt = new Date().toISOString()
        send({
          type: "summary.completed",
          data: {
            requestId,
            completedAt,
            totalDurationMs:
              new Date(completedAt).getTime() - new Date(summaryStartedAt).getTime(),
          } satisfies SummaryCompletedEvent,
        })

        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("[summary] request failed", error)
    let message = error instanceof Error ? error.message : "Failed to generate summary."
    const status =
      message === "Request body must be a JSON object." ||
      message === "customerId is required." ||
      message === "date must be a string when provided."
        ? 400
        : 500

    if (error instanceof OpenAI.APIConnectionError) {
      message = "Unable to reach the configured LLM provider. Check LLM_BASE_URL and network access."
    } else if (error instanceof OpenAI.AuthenticationError) {
      message = "LLM authentication failed. Check LLM_API_KEY for the configured provider."
    } else if (error instanceof OpenAI.RateLimitError) {
      message = "The configured LLM provider rate-limited the request. Retry in a moment."
    } else if (error instanceof OpenAI.APIError) {
      message = `LLM provider error: ${error.message}`
    } else if (message.startsWith("LLM_")) {
      message = `LLM configuration error: ${message}`
    }

    return NextResponse.json({ error: message }, { status })
  }
}
