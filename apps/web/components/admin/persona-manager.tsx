"use client"

import { useState } from "react"

import { PencilIcon, PlusIcon, SparklesIcon } from "lucide-react"

import { createPersona, updatePersona } from "@/app/admin/personas/actions"
import { Badge } from "@/components/ui/badge"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import type { Persona } from "@/lib/poc-data"

type FormState = {
  id: string
  label: string
  preferred_narrative_style: string
  // category weights — all stored as strings for input binding
  w_sector_proxy_market: string
  w_market_index: string
  w_macro_series: string
  w_sector_proxy_fundamental: string
  w_news_event_signal: string
  w_correlation_signal: string
  // multi-line / comma lists stored as strings
  section_order: string
  tone_rules: string
  prohibited_claim_patterns: string
  fallback_rules: string
}

type SheetMode = "add" | "edit" | "generate"

const CATEGORY_WEIGHT_KEYS = [
  { key: "w_sector_proxy_market", label: "Sector Proxy — Market", field: "sector_proxy_market" },
  { key: "w_market_index", label: "Market Index", field: "market_index" },
  { key: "w_macro_series", label: "Macro Series", field: "macro_series" },
  { key: "w_sector_proxy_fundamental", label: "Sector Proxy — Fundamental", field: "sector_proxy_fundamental" },
  { key: "w_news_event_signal", label: "News Event Signal", field: "news_event_signal" },
  { key: "w_correlation_signal", label: "Correlation Signal", field: "correlation_signal" },
] as const

const DEFAULT_SECTION_ORDER = ["Market Pulse", "Client-Relevant Signals", "Global Linkages", "Talking Points"]

function emptyForm(): FormState {
  return {
    id: "",
    label: "",
    preferred_narrative_style: "",
    w_sector_proxy_market: "1.5",
    w_market_index: "1.0",
    w_macro_series: "0.8",
    w_sector_proxy_fundamental: "0.0",
    w_news_event_signal: "1.2",
    w_correlation_signal: "1.0",
    section_order: DEFAULT_SECTION_ORDER.join("\n"),
    tone_rules: "",
    prohibited_claim_patterns: "",
    fallback_rules: "",
  }
}

function fromPersona(p: Persona): FormState {
  const w = p.category_weights
  return {
    id: p.id,
    label: p.label,
    preferred_narrative_style: p.preferred_narrative_style,
    w_sector_proxy_market: String(w.sector_proxy_market ?? "1.5"),
    w_market_index: String(w.market_index ?? "1.0"),
    w_macro_series: String(w.macro_series ?? "0.8"),
    w_sector_proxy_fundamental: String(w.sector_proxy_fundamental ?? "0.0"),
    w_news_event_signal: String(w.news_event_signal ?? "1.2"),
    w_correlation_signal: String(w.correlation_signal ?? "1.0"),
    section_order: p.section_order.join("\n"),
    tone_rules: p.tone_rules.join("\n"),
    prohibited_claim_patterns: p.prohibited_claim_patterns.join("\n"),
    fallback_rules: p.fallback_rules.join("\n"),
  }
}

function toPersona(f: FormState): Persona {
  return {
    id: f.id.trim() as Persona["id"],
    label: f.label.trim(),
    preferred_narrative_style: f.preferred_narrative_style.trim(),
    category_weights: {
      sector_proxy_market: parseFloat(f.w_sector_proxy_market) || 0,
      market_index: parseFloat(f.w_market_index) || 0,
      macro_series: parseFloat(f.w_macro_series) || 0,
      sector_proxy_fundamental: parseFloat(f.w_sector_proxy_fundamental) || 0,
      news_event_signal: parseFloat(f.w_news_event_signal) || 0,
      correlation_signal: parseFloat(f.w_correlation_signal) || 0,
    },
    section_order: f.section_order.split("\n").map((s) => s.trim()).filter(Boolean),
    tone_rules: f.tone_rules.split("\n").map((s) => s.trim()).filter(Boolean),
    prohibited_claim_patterns: f.prohibited_claim_patterns.split("\n").map((s) => s.trim()).filter(Boolean),
    fallback_rules: f.fallback_rules.split("\n").map((s) => s.trim()).filter(Boolean),
  }
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
  hint,
  children,
}: {
  id: string
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

function PersonaFormFields({
  form,
  onChange,
}: {
  form: FormState
  onChange: (updates: Partial<FormState>) => void
}) {
  return (
    <div className="space-y-8">
      {/* Identity */}
      <div className="space-y-4">
        <SectionHeading>Identity</SectionHeading>
        <div className="grid grid-cols-2 gap-4">
          <Field id="pf-id" label="Persona ID" required>
            <Input
              id="pf-id"
              value={form.id}
              onChange={(e) => onChange({ id: e.target.value })}
              placeholder="e.g. hni_equity"
            />
          </Field>
          <Field id="pf-label" label="Display Label" required>
            <Input
              id="pf-label"
              value={form.label}
              onChange={(e) => onChange({ label: e.target.value })}
              placeholder="e.g. HNI Equity Client"
            />
          </Field>
        </div>
      </div>

      {/* Narrative */}
      <div className="space-y-4">
        <SectionHeading>Narrative</SectionHeading>
        <Field id="pf-style" label="Preferred Narrative Style">
          <Textarea
            id="pf-style"
            value={form.preferred_narrative_style}
            onChange={(e) => onChange({ preferred_narrative_style: e.target.value })}
            className="min-h-24"
            placeholder="e.g. Direct, data-driven commentary with clear sector-level implications. Use concrete percentages and avoid speculative language."
          />
        </Field>
        <Field
          id="pf-section-order"
          label="Section Order"
          hint="One section name per line. Controls the order sections appear in the briefing."
        >
          <Textarea
            id="pf-section-order"
            value={form.section_order}
            onChange={(e) => onChange({ section_order: e.target.value })}
            className="min-h-24 font-mono text-sm"
            placeholder={"Market Pulse\nClient-Relevant Signals\nGlobal Linkages\nTalking Points"}
          />
        </Field>
      </div>

      {/* Category Weights */}
      <div className="space-y-4">
        <SectionHeading>Category Weights</SectionHeading>
        <p className="text-xs text-muted-foreground">
          Multipliers applied to each signal category when scoring relevance for this persona. 0 = exclude, 1 = neutral, &gt;1 = amplify.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {CATEGORY_WEIGHT_KEYS.map(({ key, label }) => (
            <Field key={key} id={`pf-${key}`} label={label}>
              <Input
                id={`pf-${key}`}
                type="number"
                min={0}
                step={0.1}
                value={form[key as keyof FormState]}
                onChange={(e) => onChange({ [key]: e.target.value } as Partial<FormState>)}
                placeholder="1.0"
              />
            </Field>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="space-y-4">
        <SectionHeading>Rules</SectionHeading>
        <Field
          id="pf-tone"
          label="Tone Rules"
          hint="One rule per line."
        >
          <Textarea
            id="pf-tone"
            value={form.tone_rules}
            onChange={(e) => onChange({ tone_rules: e.target.value })}
            className="min-h-24"
            placeholder={"Always lead with portfolio-level impact.\nUse percentage moves, not direction words like 'up' or 'down'."}
          />
        </Field>
        <Field
          id="pf-prohibited"
          label="Prohibited Claim Patterns"
          hint="One pattern per line. These phrases are blocked from generated briefings."
        >
          <Textarea
            id="pf-prohibited"
            value={form.prohibited_claim_patterns}
            onChange={(e) => onChange({ prohibited_claim_patterns: e.target.value })}
            className="min-h-20"
            placeholder={"guaranteed returns\nyou should definitely buy"}
          />
        </Field>
        <Field
          id="pf-fallback"
          label="Fallback Rules"
          hint="One rule per line. Applied when signal data is sparse or unavailable."
        >
          <Textarea
            id="pf-fallback"
            value={form.fallback_rules}
            onChange={(e) => onChange({ fallback_rules: e.target.value })}
            className="min-h-20"
            placeholder={"Fall back to macro commentary if fewer than 3 market signals are available."}
          />
        </Field>
      </div>
    </div>
  )
}

type Props = {
  personas: Persona[]
}

export function PersonaManager({ personas: initialPersonas }: Props) {
  const [mode, setMode] = useState<SheetMode | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [generateDescription, setGenerateDescription] = useState("")
  const [generateStep, setGenerateStep] = useState<"describe" | "review">("describe")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  function updateForm(updates: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...updates }))
  }

  function openAdd() {
    setForm(emptyForm())
    setEditingId(null)
    setSaveError(null)
    setMode("add")
  }

  function openEdit(persona: Persona) {
    setForm(fromPersona(persona))
    setEditingId(persona.id)
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
    const payload = toPersona(form)
    setIsSaving(true)
    setSaveError(null)
    try {
      if (mode === "edit" && editingId) {
        await updatePersona(editingId, payload)
      } else {
        await createPersona(payload)
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
    try {
      const response = await fetch("/api/admin/generate-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: generateDescription }),
      })
      const data = (await response.json()) as { profile?: Persona; error?: string }
      if (!response.ok || data.error) {
        setGenerateError(data.error ?? "Generation failed.")
        return
      }
      setForm(fromPersona(data.profile!))
      setSaveError(null)
      setGenerateStep("review")
    } catch {
      setGenerateError("Network error. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const sheetOpen = mode !== null
  const sheetTitle =
    mode === "edit"
      ? `Edit — ${initialPersonas.find((p) => p.id === editingId)?.label ?? editingId}`
      : mode === "generate"
        ? "Generate Persona Profile"
        : "Add New Persona"
  const sheetDescription =
    mode === "generate" && generateStep === "describe"
      ? "Describe the client type, investment style, and communication preferences."
      : mode === "generate"
        ? "Review the generated persona. Edit any fields before saving."
        : "Configure this persona's weighting, tone, and narrative defaults."

  return (
    <>
      <div className="px-4 lg:px-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Persona Library</h2>
            <p className="text-sm text-muted-foreground">
              Briefing tone, weighting, and narrative defaults for each client type.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={openGenerate}>
              <SparklesIcon className="size-3.5" />
              Generate Persona Profile
            </Button>
            <Button size="sm" onClick={openAdd}>
              <PlusIcon className="size-3.5" />
              Add New Persona
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {initialPersonas.map((persona) => (
            <Card key={persona.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{persona.label}</CardTitle>
                    <CardDescription>{persona.id}</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-8 shrink-0 p-0"
                    onClick={() => openEdit(persona)}
                  >
                    <PencilIcon className="size-3.5" />
                    <span className="sr-only">Edit {persona.label}</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Section order</p>
                  <div className="flex flex-wrap gap-2">
                    {persona.section_order.map((section) => (
                      <Badge key={`${persona.id}:${section}`} variant="secondary">
                        {section}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Category weights</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(persona.category_weights).map(([key, value]) => (
                      <div key={`${persona.id}:${key}`} className="rounded-lg border bg-muted/20 p-3">
                        <p className="text-xs text-muted-foreground">{key}</p>
                        <p className="mt-1 font-medium text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Preferred narrative style</p>
                  <p className="text-sm leading-6 text-foreground">{persona.preferred_narrative_style}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Tone rules</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-foreground">
                    {persona.tone_rules.map((rule) => (
                      <li key={`${persona.id}:tone:${rule}`}>{rule}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Fallback rules</p>
                  <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-foreground">
                    {persona.fallback_rules.map((rule) => (
                      <li key={`${persona.id}:fallback:${rule}`}>{rule}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Prohibited claim patterns</p>
                  <div className="flex flex-wrap gap-2">
                    {persona.prohibited_claim_patterns.map((pattern) => (
                      <Badge key={`${persona.id}:pattern:${pattern}`} variant="outline">
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(open) => { if (!open) closeSheet() }}>
        <SheetContent className="flex w-full flex-col overflow-hidden sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>{sheetDescription}</SheetDescription>
          </SheetHeader>

          {/* Generate: describe step */}
          {mode === "generate" && generateStep === "describe" ? (
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
              <div className="space-y-1.5">
                <Label htmlFor="gen-desc">Persona Description</Label>
                <Textarea
                  id="gen-desc"
                  value={generateDescription}
                  onChange={(e) => setGenerateDescription(e.target.value)}
                  className="min-h-48"
                  placeholder="e.g. A family office managing multi-generational wealth with a strong preference for capital preservation. They prioritise macro-regime awareness, real asset allocation, and long-duration government bonds. Communication should be formal, analytical, and concise. They dislike speculative framing."
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
              <PersonaFormFields form={form} onChange={updateForm} />
            </div>
          )}

          <SheetFooter className="border-t">
            {saveError ? (
              <p className="w-full rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {saveError}
              </p>
            ) : null}
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
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Persona"}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
