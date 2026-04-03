import { spawn } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"

import { NextResponse } from "next/server"

import { getDefaultCacheDate } from "@/lib/poc-data"

type RefreshStatus = "idle" | "running" | "success" | "failed"

const globalState = globalThis as typeof globalThis & {
  __cacheRefreshState?: {
    status: RefreshStatus
    date: string | null
    startedAt: string | null
  }
}

function getRefreshState() {
  if (!globalState.__cacheRefreshState) {
    globalState.__cacheRefreshState = {
      status: "idle",
      date: null,
      startedAt: null,
    }
  }

  return globalState.__cacheRefreshState
}

async function loadServiceEnv(serviceDir: string) {
  const envPath = path.join(serviceDir, ".env")

  try {
    const contents = await fs.readFile(envPath, "utf8")
    return Object.fromEntries(
      contents
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=")
          const key = line.slice(0, index).trim()
          const value = line.slice(index + 1).trim()
          return [key, value]
        })
    )
  } catch {
    return {}
  }
}

function parseRequestBody(value: unknown): { date?: string } {
  if (!value || typeof value !== "object") {
    throw new Error("Request body must be a JSON object.")
  }

  const candidate = value as Record<string, unknown>
  if (candidate.date !== undefined && typeof candidate.date !== "string") {
    throw new Error("date must be a string when provided.")
  }

  return {
    date: candidate.date,
  }
}

export async function POST(request: Request) {
  const state = getRefreshState()
  if (state.status === "running") {
    return NextResponse.json(
      {
        status: "running",
        date: state.date,
        startedAt: state.startedAt,
        output: ["Cache refresh is already running."],
      },
      { status: 409 }
    )
  }

  try {
    const body = parseRequestBody(await request.json())
    const date = body.date ?? (await getDefaultCacheDate())
    const startedAt = new Date().toISOString()
    state.status = "running"
    state.date = date
    state.startedAt = startedAt

    const serviceDir = path.join(process.cwd(), "..", "service")
    const serviceEnv = await loadServiceEnv(serviceDir)
    const output = await new Promise<string[]>((resolve, reject) => {
      const child = spawn(
        "uv",
        ["run", "python", "-m", "jobs.refresh_cache", "--date", date],
        {
          cwd: serviceDir,
          env: { ...process.env, ...serviceEnv },
        }
      )

      const lines: string[] = []
      child.stdout.on("data", (chunk) => {
        lines.push(...String(chunk).split(/\r?\n/).filter(Boolean))
      })
      child.stderr.on("data", (chunk) => {
        lines.push(...String(chunk).split(/\r?\n/).filter(Boolean))
      })
      child.on("error", reject)
      child.on("close", (code) => {
        if (code === 0) {
          resolve(lines)
          return
        }
        reject(new Error(lines.join("\n") || `Refresh command failed with exit code ${code}`))
      })
    })

    state.status = "success"

    return NextResponse.json({
      status: "success",
      date,
      startedAt,
      finishedAt: new Date().toISOString(),
      output,
    })
  } catch (error) {
    state.status = "failed"
    const message = error instanceof Error ? error.message : "Cache refresh failed."
    const status =
      message === "Request body must be a JSON object." ||
      message === "date must be a string when provided."
        ? 400
        : 500
    return NextResponse.json(
      {
        status: "failed",
        date: state.date,
        startedAt: state.startedAt,
        finishedAt: new Date().toISOString(),
        output: [message],
      },
      { status }
    )
  } finally {
    if (state.status !== "running") {
      state.date = null
      state.startedAt = null
    }
  }
}
