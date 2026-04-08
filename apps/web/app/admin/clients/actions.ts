"use server"

import { revalidatePath } from "next/cache"

import type { Customer } from "@/lib/poc-data"

export type CustomerDraft = Omit<Customer, "id">

const serviceBaseUrl = () => {
  const url = process.env.SERVICE_BASE_URL?.replace(/\/+$/, "")
  if (!url) throw new Error("SERVICE_BASE_URL is not configured.")
  return url
}

export async function createCustomer(payload: CustomerDraft): Promise<Customer> {
  const response = await fetch(`${serviceBaseUrl()}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const data = (await response.json()) as Customer & { detail?: string }
  if (!response.ok) {
    throw new Error(data.detail ?? `Failed to create customer (${response.status})`)
  }

  revalidatePath("/admin/clients")
  revalidatePath("/dashboard")
  return data
}

export async function updateCustomer(id: string, payload: Customer): Promise<Customer> {
  const response = await fetch(`${serviceBaseUrl()}/customers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  })

  const data = (await response.json()) as Customer & { detail?: string }
  if (!response.ok) {
    throw new Error(data.detail ?? `Failed to update customer (${response.status})`)
  }

  revalidatePath("/admin/clients")
  revalidatePath("/dashboard")
  return data
}
