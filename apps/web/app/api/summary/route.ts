import { NextResponse } from "next/server"
import OpenAI from "openai"

import {
  buildEvidencePrompt,
  buildSystemPrompt,
  createLlmClient,
  getConfiguredModel,
} from "@/lib/briefing"
import { getSummaryContext } from "@/lib/poc-data"

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

export async function POST(request: Request) {
  try {
    const body = parseRequestBody(await request.json())
    const summaryContext = await getSummaryContext(body.customerId, body.date)
    const client = createLlmClient()
    const model = getConfiguredModel()
    const systemPrompt = buildSystemPrompt(summaryContext.evidencePack)
    const userPrompt = buildEvidencePrompt(summaryContext.evidencePack)

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    })

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content
            if (content) {
              controller.enqueue(encoder.encode(content))
            }
          }
          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
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
