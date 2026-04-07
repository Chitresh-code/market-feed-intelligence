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

    const serviceBaseUrl = process.env.SERVICE_BASE_URL?.replace(/\/+$/, "")
    if (!serviceBaseUrl) {
      throw new Error("SERVICE_BASE_URL is not configured.")
    }

    const serviceResponse = await fetch(`${serviceBaseUrl}/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({ date }),
    })

    const payload = (await serviceResponse.json().catch(() => null)) as
      | {
          status?: string
          date?: string
          startedAt?: string
          finishedAt?: string
          output?: string[]
          detail?: string
        }
      | null

    if (!serviceResponse.ok) {
      throw new Error(
        payload?.detail ??
          payload?.output?.join("\n") ??
          `Refresh request failed with status ${serviceResponse.status}.`
      )
    }

    state.status = "success"

    return NextResponse.json({
      status: "success",
      date,
      startedAt: payload?.startedAt ?? startedAt,
      finishedAt: payload?.finishedAt ?? new Date().toISOString(),
      output: payload?.output ?? [],
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
