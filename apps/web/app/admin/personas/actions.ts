"use server"

import { revalidatePath } from "next/cache"

import type { Persona } from "@/lib/poc-data"

const serviceBaseUrl = () => {
  const url = process.env.SERVICE_BASE_URL?.replace(/\/+$/, "")
  if (!url) throw new Error("SERVICE_BASE_URL is not configured.")
  return url
}

export async function createPersona(payload: Persona): Promise<Persona> {
  const response = await fetch(`${serviceBaseUrl()}/personas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const data = (await response.json()) as Persona & { detail?: string }
  if (!response.ok) {
    throw new Error(data.detail ?? `Failed to create persona (${response.status})`)
  }

  revalidatePath("/admin/personas")
  revalidatePath("/dashboard")
  return data
}

export async function updatePersona(id: string, payload: Persona): Promise<Persona> {
  const response = await fetch(`${serviceBaseUrl()}/personas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const data = (await response.json()) as Persona & { detail?: string }
  if (!response.ok) {
    throw new Error(data.detail ?? `Failed to update persona (${response.status})`)
  }

  revalidatePath("/admin/personas")
  revalidatePath("/dashboard")
  return data
}
