"use client"

import { useState } from "react"

import { PencilIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react"

import { createCustomer, type CustomerDraft, updateCustomer } from "@/app/admin/clients/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import type { Customer, Persona } from "@/lib/poc-data"

type AllocRow = {
  _key: string
  sector: string
  ticker: string
  weight: string
  key_holdings: string
}

type ListRow = {
  _key: string
  value: string
}

type FormState = {
  name: string
  persona: string
  mandate: string
  client_profile: string
  risk_rating: string
  relationship_since: string
  last_meeting: string
  next_meeting: string
  meeting_context: string
  primary_objective: string
  communication_style: string
  decision_lens: string
  key_concerns: ListRow[]
  watchlist: ListRow[]
  rm_notes: string
  allocations: AllocRow[]
}

type SheetMode = "add" | "edit" | "generate"

let _allocKey = 0
function newKey() {
  return String(++_allocKey)
}

const RISK_RATINGS = [
  "Conservative",
  "Moderate",
  "Balanced",
  "Moderate-High",
  "High",
] as const

function emptyForm(): FormState {
  return {
    name: "",
    persona: "hni_equity",
    mandate: "",
    client_profile: "",
    risk_rating: "Moderate",
    relationship_since: "",
    last_meeting: "",
    next_meeting: "",
    meeting_context: "",
    primary_objective: "",
    communication_style: "",
    decision_lens: "",
    key_concerns: [{ _key: newKey(), value: "" }],
    watchlist: [{ _key: newKey(), value: "" }],
    rm_notes: "",
    allocations: [{ _key: newKey(), sector: "", ticker: "", weight: "", key_holdings: "" }],
  }
}

function toDateInputValue(value: string): string {
  const trimmed = value.trim()
  const isoDateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/)
  return isoDateMatch ? isoDateMatch[1] : trimmed
}

function fromCustomer(c: Customer): FormState {
  return {
    name: c.name,
    persona: c.persona,
    mandate: c.mandate,
    client_profile: c.client_profile,
    risk_rating: c.risk_rating,
    relationship_since: toDateInputValue(c.relationship_since),
    last_meeting: toDateInputValue(c.last_meeting),
    next_meeting: toDateInputValue(c.next_meeting),
    meeting_context: c.meeting_context,
    primary_objective: c.primary_objective,
    communication_style: c.communication_style,
    decision_lens: c.decision_lens,
    key_concerns:
      c.key_concerns.length > 0
        ? c.key_concerns.map((value) => ({ _key: newKey(), value }))
        : [{ _key: newKey(), value: "" }],
    watchlist:
      c.watchlist.length > 0
        ? c.watchlist.map((value) => ({ _key: newKey(), value }))
        : [{ _key: newKey(), value: "" }],
    rm_notes: c.rm_notes,
    allocations: c.allocations.map((a) => ({
      _key: newKey(),
      sector: a.sector,
      ticker: a.ticker ?? "",
      weight: String(a.weight),
      key_holdings: a.key_holdings.join(", "),
    })),
  }
}

function buildCustomerPayload(f: FormState): CustomerDraft {
  return {
    name: f.name.trim(),
    persona: f.persona as Customer["persona"],
    mandate: f.mandate.trim(),
    client_profile: f.client_profile.trim(),
    risk_rating: f.risk_rating.trim(),
    relationship_since: f.relationship_since.trim(),
    last_meeting: f.last_meeting.trim(),
    next_meeting: f.next_meeting.trim(),
    meeting_context: f.meeting_context.trim(),
    primary_objective: f.primary_objective.trim(),
    communication_style: f.communication_style.trim(),
    decision_lens: f.decision_lens.trim(),
    key_concerns: f.key_concerns.map((row) => row.value.trim()).filter(Boolean),
    watchlist: f.watchlist.map((row) => row.value.trim()).filter(Boolean),
    rm_notes: f.rm_notes.trim(),
    allocations: f.allocations.map((row) => ({
      sector: row.sector.trim(),
      ticker: row.ticker.trim() || null,
      weight: parseFloat(row.weight) || 0,
      key_holdings: row.key_holdings.split(",").map((s) => s.trim()).filter(Boolean),
    })),
  }
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

function isFormValid(form: FormState): boolean {
  const requiredTextFields = [
    form.name,
    form.persona,
    form.mandate,
    form.client_profile,
    form.risk_rating,
    form.relationship_since,
    form.last_meeting,
    form.next_meeting,
    form.meeting_context,
    form.primary_objective,
    form.communication_style,
    form.decision_lens,
    form.rm_notes,
  ]

  if (requiredTextFields.some((value) => value.trim().length === 0)) {
    return false
  }

  if (
    !isIsoDate(form.relationship_since) ||
    !isIsoDate(form.last_meeting) ||
    !isIsoDate(form.next_meeting)
  ) {
    return false
  }

  if (!form.key_concerns.some((row) => row.value.trim().length > 0)) {
    return false
  }

  if (!form.watchlist.some((row) => row.value.trim().length > 0)) {
    return false
  }

  if (
    form.allocations.length === 0 ||
    form.allocations.some(
      (row) => row.sector.trim().length === 0 || row.weight.trim().length === 0
    )
  ) {
    return false
  }

  const allocationTotal = form.allocations.reduce(
    (sum, row) => sum + (Number.parseFloat(row.weight) || 0),
    0
  )

  return allocationTotal.toFixed(2) === "1.00"
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  )
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  )
}

function ClientFormFields({
  form,
  onChange,
  personas,
}: {
  form: FormState
  onChange: (updates: Partial<FormState>) => void
  personas: Persona[]
}) {
  function updateAlloc(index: number, updates: Partial<AllocRow>) {
    const next = form.allocations.map((row, i) => (i === index ? { ...row, ...updates } : row))
    onChange({ allocations: next })
  }

  function addAlloc() {
    onChange({
      allocations: [
        ...form.allocations,
        { _key: newKey(), sector: "", ticker: "", weight: "", key_holdings: "" },
      ],
    })
  }

  function removeAlloc(index: number) {
    onChange({ allocations: form.allocations.filter((_, i) => i !== index) })
  }

  function updateList(
    field: "key_concerns" | "watchlist",
    index: number,
    value: string
  ) {
    onChange({
      [field]: form[field].map((row, i) => (i === index ? { ...row, value } : row)),
    } as Partial<FormState>)
  }

  function addListRow(field: "key_concerns" | "watchlist") {
    onChange({
      [field]: [...form[field], { _key: newKey(), value: "" }],
    } as Partial<FormState>)
  }

  function removeListRow(field: "key_concerns" | "watchlist", index: number) {
    onChange({
      [field]: form[field].filter((_, i) => i !== index),
    } as Partial<FormState>)
  }

  const allocTotal = form.allocations.reduce((sum, row) => sum + (parseFloat(row.weight) || 0), 0)
  const allocOk = allocTotal.toFixed(2) === "1.00"

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <SectionHeading>Identity</SectionHeading>
        <Field id="f-name" label="Full Name" required>
          <Input
            id="f-name"
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g. Rahul Sharma"
          />
        </Field>
        <Field id="f-persona" label="Persona" required>
          <Select value={form.persona} onValueChange={(v) => onChange({ persona: v })}>
            <SelectTrigger id="f-persona">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {personas.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="f-risk" label="Risk Rating" required>
          <Select value={form.risk_rating} onValueChange={(v) => onChange({ risk_rating: v })}>
            <SelectTrigger id="f-risk">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RISK_RATINGS.map((rating) => (
                <SelectItem key={rating} value={rating}>
                  {rating}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="f-mandate" label="Mandate" required>
          <Input
            id="f-mandate"
            value={form.mandate}
            onChange={(e) => onChange({ mandate: e.target.value })}
            placeholder="e.g. Equity-led wealth growth with sector conviction"
          />
        </Field>
      </div>

      {/* Profile */}
      <div className="space-y-4">
        <SectionHeading>Profile</SectionHeading>
        <Field id="f-profile" label="Client Profile" required>
          <Textarea
            id="f-profile"
            value={form.client_profile}
            onChange={(e) => onChange({ client_profile: e.target.value })}
            className="min-h-20"
            placeholder="2–3 sentences describing the client's background and financial posture."
          />
        </Field>
        <Field id="f-objective" label="Primary Objective" required>
          <Textarea
            id="f-objective"
            value={form.primary_objective}
            onChange={(e) => onChange({ primary_objective: e.target.value })}
            className="min-h-16"
            placeholder="e.g. Grow wealth through concentrated mid-cap equity positions over 5+ years."
          />
        </Field>
        <Field id="f-comm" label="Communication Style" required>
          <Textarea
            id="f-comm"
            value={form.communication_style}
            onChange={(e) => onChange({ communication_style: e.target.value })}
            className="min-h-16"
            placeholder="e.g. Prefers concise data-driven updates; no jargon."
          />
        </Field>
        <Field id="f-decision" label="Decision Lens" required>
          <Textarea
            id="f-decision"
            value={form.decision_lens}
            onChange={(e) => onChange({ decision_lens: e.target.value })}
            className="min-h-16"
            placeholder="e.g. Contrarian; focuses on valuation and long-term compounding."
          />
        </Field>
      </div>

      <div className="space-y-4">
        <SectionHeading>Relationship</SectionHeading>
        <Field id="f-since" label="Client Since" required>
          <Input
            id="f-since"
            type="date"
            value={form.relationship_since}
            onChange={(e) => onChange({ relationship_since: e.target.value })}
          />
        </Field>
        <Field id="f-last" label="Last Meeting" required>
          <Input
            id="f-last"
            type="date"
            value={form.last_meeting}
            onChange={(e) => onChange({ last_meeting: e.target.value })}
          />
        </Field>
        <Field id="f-next" label="Next Meeting" required>
          <Input
            id="f-next"
            type="date"
            value={form.next_meeting}
            onChange={(e) => onChange({ next_meeting: e.target.value })}
          />
        </Field>
        <Field id="f-meeting" label="Meeting Context" required>
          <Textarea
            id="f-meeting"
            value={form.meeting_context}
            onChange={(e) => onChange({ meeting_context: e.target.value })}
            className="min-h-16"
            placeholder="What is the purpose of the upcoming meeting?"
          />
        </Field>
      </div>

      <div className="space-y-4">
        <SectionHeading>Focus Areas</SectionHeading>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Key Concerns<span className="ml-0.5 text-destructive">*</span></Label>
            <Button type="button" variant="outline" size="sm" onClick={() => addListRow("key_concerns")}>
              <PlusIcon className="size-3" />
              Add Row
            </Button>
          </div>
          {form.key_concerns.map((row, index) => (
            <div key={row._key} className="flex items-center gap-2">
              <Input
                value={row.value}
                onChange={(e) => updateList("key_concerns", index, e.target.value)}
                placeholder="e.g. Rupee depreciation impact on IT earnings"
              />
              {form.key_concerns.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeListRow("key_concerns", index)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label>Watchlist<span className="ml-0.5 text-destructive">*</span></Label>
            <Button type="button" variant="outline" size="sm" onClick={() => addListRow("watchlist")}>
              <PlusIcon className="size-3" />
              Add Row
            </Button>
          </div>
          {form.watchlist.map((row, index) => (
            <div key={row._key} className="flex items-center gap-2">
              <Input
                value={row.value}
                onChange={(e) => updateList("watchlist", index, e.target.value)}
                placeholder="e.g. INFY.NS"
              />
              {form.watchlist.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeListRow("watchlist", index)}
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
        <Field id="f-rmnotes" label="RM Notes" required>
          <Textarea
            id="f-rmnotes"
            value={form.rm_notes}
            onChange={(e) => onChange({ rm_notes: e.target.value })}
            className="min-h-20"
            placeholder="Internal relationship manager commentary and current context."
          />
        </Field>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeading>Allocations</SectionHeading>
          <Button type="button" variant="outline" size="sm" onClick={addAlloc}>
            <PlusIcon className="size-3" />
            Add Row
          </Button>
        </div>

        <div className="space-y-3">
          {form.allocations.map((row, i) => (
            <div
              key={row._key}
              className="rounded-lg border bg-muted/10 p-3 space-y-3"
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sector</Label>
                <Input
                  value={row.sector}
                  onChange={(e) => updateAlloc(i, { sector: e.target.value })}
                  placeholder="e.g. Indian IT — Mid-cap"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Ticker</Label>
                <Input
                  value={row.ticker}
                  onChange={(e) => updateAlloc(i, { ticker: e.target.value })}
                  placeholder="^CNXIT"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Weight</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={row.weight}
                    onChange={(e) => updateAlloc(i, { weight: e.target.value })}
                    placeholder="0.30"
                  />
                  {form.allocations.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAlloc(i)}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Key Holdings (comma-separated)</Label>
                <Input
                  value={row.key_holdings}
                  onChange={(e) => updateAlloc(i, { key_holdings: e.target.value })}
                  placeholder="e.g. Infosys, TCS, Wipro"
                />
              </div>
            </div>
          ))}
        </div>

        <div
          className={
            allocOk
              ? "text-xs text-muted-foreground"
              : "rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-600 dark:text-amber-400"
          }
        >
          Total weight: {allocTotal.toFixed(2)}
          {allocOk ? " — looks good." : " — must equal exactly 1.00."}
        </div>
      </div>
    </div>
  )
}

type Props = {
  customers: Customer[]
  personas: Persona[]
}

export function ClientRegistry({ customers, personas }: Props) {
  const [mode, setMode] = useState<SheetMode | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [generateDescription, setGenerateDescription] = useState("")
  const [generateStep, setGenerateStep] = useState<"describe" | "review">("describe")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const personaLabelById = Object.fromEntries(personas.map((p) => [p.id, p.label]))

  function updateForm(updates: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  function openAdd() {
    setForm(emptyForm())
    setEditingId(null)
    setSaveError(null)
    setMode("add")
  }

  function openEdit(customer: Customer) {
    setForm(fromCustomer(customer))
    setEditingId(customer.id)
    setSaveError(null)
    setMode("edit")
  }

  function openGenerate() {
    setGenerateDescription("")
    setGenerateError(null)
    setGenerateStep("describe")
    setSaveError(null)
    setMode("generate")
  }

  function closeSheet() {
    setMode(null)
    setEditingId(null)
    setIsSaving(false)
    setSaveError(null)
  }

  async function handleSave() {
    if (!isFormValid(form)) {
      setSaveError("Complete all required fields and make sure allocation weights total exactly 1.00.")
      return
    }

    const payload = buildCustomerPayload(form)
    setIsSaving(true)
    setSaveError(null)
    try {
      if (mode === "edit" && editingId) {
        await updateCustomer(editingId, { ...payload, id: editingId })
      } else {
        await createCustomer(payload)
      }
      closeSheet()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed.")
      setIsSaving(false)
    }
  }

  async function handleGenerate() {
    if (!generateDescription.trim()) return
    setIsGenerating(true)
    setGenerateError(null)

    const personasContext = personas
      .map((p) => `${p.id}: ${p.label} — ${p.preferred_narrative_style}`)
      .join("\n")

    try {
      const response = await fetch("/api/admin/generate-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: generateDescription, personasContext }),
      })
      const data = (await response.json()) as { profile?: Customer; error?: string }
      if (!response.ok || data.error) {
        setGenerateError(data.error ?? "Generation failed.")
        return
      }
      setForm(fromCustomer(data.profile!))
      setSaveError(null)
      setGenerateStep("review")
    } catch {
      setGenerateError("Network error. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const sheetOpen = mode !== null
  const canSave = isFormValid(form)
  const sheetTitle =
    mode === "edit"
      ? `Edit — ${customers.find((c) => c.id === editingId)?.name ?? editingId}`
      : mode === "generate"
        ? "Generate Client Profile"
        : "Add New Client"
  const sheetDescription =
    mode === "generate" && generateStep === "describe"
      ? "Describe the client and their investment context. The model will build a complete profile."
      : mode === "generate"
        ? "Review the generated profile below. Edit any fields before saving."
        : "Fill in the client details. Fields marked with * are required."

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Client Registry</CardTitle>
              <CardDescription>
                Current customer profiles, mandates, personas, and allocation context.
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" onClick={openGenerate}>
                <SparklesIcon className="size-3.5" />
                Generate Client Profile
              </Button>
              <Button size="sm" onClick={openAdd}>
                <PlusIcon className="size-3.5" />
                Add New Client
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Persona</TableHead>
                <TableHead>Mandate</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Allocations</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>{personaLabelById[customer.persona] ?? customer.persona}</TableCell>
                  <TableCell className="max-w-56 truncate">{customer.mandate}</TableCell>
                  <TableCell>{customer.risk_rating}</TableCell>
                  <TableCell>{customer.allocations.length}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="size-8 p-0"
                      onClick={() => openEdit(customer)}
                    >
                      <PencilIcon className="size-3.5" />
                      <span className="sr-only">Edit {customer.name}</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet() }}>
        <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>{sheetDescription}</SheetDescription>
          </SheetHeader>

          {/* Generate: describe step */}
          {mode === "generate" && generateStep === "describe" ? (
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
              <div className="space-y-1.5">
                <Label htmlFor="gen-desc">Client Description</Label>
                <Textarea
                  id="gen-desc"
                  value={generateDescription}
                  onChange={(e) => setGenerateDescription(e.target.value)}
                  className="min-h-48"
                  placeholder="e.g. A 52-year-old entrepreneur based in Mumbai with a strong bias towards mid-cap and small-cap Indian equities. Recently sold a stake in a logistics company and wants to deploy INR 15 crore. Interested in domestic consumption, fintech, and infrastructure themes. Moderate risk appetite with a 5-year horizon."
                />
              </div>
              {generateError ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {generateError}
                </p>
              ) : null}
            </div>
          ) : (
            /* Add / Edit / Generate review: form fields */
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {mode === "generate" && generateStep === "review" ? (
                <div className="mb-6 flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Profile generated from your description. Review and edit before saving.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setGenerateStep("describe")}
                  >
                    Back
                  </Button>
                </div>
              ) : null}
              <ClientFormFields form={form} onChange={updateForm} personas={personas} />
            </div>
          )}

          <SheetFooter className="border-t sm:justify-between">
            {saveError ? (
              <p className="w-full rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {saveError}
              </p>
            ) : null}
            <div className="flex w-full items-center justify-end gap-2">
              <Button variant="outline" onClick={closeSheet} disabled={isSaving || isGenerating}>
                Cancel
              </Button>
              {mode === "generate" && generateStep === "describe" ? (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !generateDescription.trim()}
                >
                  <SparklesIcon className="size-3.5" />
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={isSaving || !canSave}>
                  {isSaving ? "Saving..." : "Save Client"}
                </Button>
              )}
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
