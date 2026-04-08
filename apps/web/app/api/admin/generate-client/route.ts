import fs from "node:fs/promises"
import path from "node:path"

import { NextResponse } from "next/server"
import { parse as parseYaml } from "yaml"

import { createLlmClient, getConfiguredModel } from "@/lib/briefing"

const repoRoot = path.join(process.cwd(), "..", "..")
const promptsRoot = path.join(repoRoot, "apps", "web", "prompts")

type GeneratePrompt = {
  system_prompt_template: string
  user_prompt_template: string
  temperature: number
}

async function loadGeneratePrompt(name: string): Promise<GeneratePrompt> {
  const raw = await fs.readFile(path.join(promptsRoot, `${name}.yaml`), "utf8")
  const parsed = parseYaml(raw) as Record<string, unknown>
  return {
    system_prompt_template: parsed.system_prompt_template as string,
    user_prompt_template: parsed.user_prompt_template as string,
    temperature: parsed.temperature as number,
  }
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "")
}

function isTemperatureUnsupportedError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }

  return error.message.toLowerCase().includes("temperature")
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { description?: string; personasContext?: string }
    const { description, personasContext } = body

    if (!description?.trim()) {
      return NextResponse.json({ error: "description is required." }, { status: 400 })
    }

    const prompt = await loadGeneratePrompt("generate-client-profile")
    const client = createLlmClient()
    const model = getConfiguredModel()

    const systemPrompt = renderTemplate(prompt.system_prompt_template, {
      description,
      personas_context: personasContext ?? "",
    })
    const userPrompt = renderTemplate(prompt.user_prompt_template, {
      description,
      personas_context: personasContext ?? "",
    })

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ]

    let completion
    try {
      completion = await client.chat.completions.create({
        model,
        temperature: prompt.temperature,
        messages,
      })
    } catch (error) {
      if (!isTemperatureUnsupportedError(error)) {
        throw error
      }

      completion = await client.chat.completions.create({
        model,
        messages,
      })
    }

    const rawContent = completion.choices[0]?.message?.content?.trim() ?? ""
    const jsonContent = rawContent
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonContent)
    } catch {
      return NextResponse.json(
        { error: "LLM returned invalid JSON. Try a more specific description.", raw: rawContent },
        { status: 422 }
      )
    }

    return NextResponse.json({ profile: parsed })
  } catch (error) {
    console.error("[generate-client] failed", error)
    const message = error instanceof Error ? error.message : "Generation failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
