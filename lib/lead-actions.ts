"use server"

import { revalidatePath } from "next/cache"
import { queryOne, queryAll, execute } from "@/lib/db"
import { randomUUID } from "node:crypto"
import { getActor } from "@/lib/actor"

export type LeadStage =
  | "new" | "connected" | "pitched" | "interested" | "call_booked"
  | "proposal_needed" | "proposal_sent" | "negotiation" | "follow_up_later"
  | "won" | "lost"

export type Lead = {
  id: string
  name: string
  company: string
  email: string
  phone: string
  value: number
  stage: LeadStage
  source: string
  notes: string
  title: string
  linkedinUrl: string
  location: string
  industry: string
  companySize: string
  painPoint: string
  offerPitched: string
  resourceTypePitched: string
  lastContactedAt: string
  nextFollowUpAt: string
  customFields: Record<string, string>
  ownerId: string
  ownerName: string
  createdAt: string
  updatedAt: string
}

type LeadDbRow = Omit<Lead, "customFields"> & { customFields: string }

const LEAD_COLUMNS = `id, name, company, email, phone, value, stage, source, notes,
  title, "linkedinUrl", location, industry, "companySize", "painPoint", "offerPitched", "resourceTypePitched",
  "lastContactedAt", "nextFollowUpAt", "customFields", "ownerId", "ownerName", "createdAt", "updatedAt"`

function parseCustomFields(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw || "{}")
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export async function getLeads(): Promise<Lead[]> {
  const actor = await getActor()
  if (!actor) return []
  const rows = await queryAll<LeadDbRow>(
    `SELECT ${LEAD_COLUMNS} FROM "Lead" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC`,
    [actor.organizationId]
  )
  return rows.map(r => ({ ...r, customFields: parseCustomFields(r.customFields) }))
}

function revalidateBoard() {
  revalidatePath("/pipeline")
  revalidatePath("/employee/pipeline")
}

export type LeadInput = {
  name: string; company: string; email: string; phone: string
  value: number; stage: string; source: string; notes: string
  title?: string; linkedinUrl?: string; location?: string; industry?: string
  companySize?: string; painPoint?: string; offerPitched?: string; resourceTypePitched?: string
  lastContactedAt?: string; nextFollowUpAt?: string
  customFields?: Record<string, string>
}

export async function createLead(data: LeadInput) {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")
  if (!data.name.trim()) throw new Error("Name is required")
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "Lead" (id, "organizationId", name, company, email, phone, value, stage, source, notes,
       title, "linkedinUrl", location, industry, "companySize", "painPoint", "offerPitched", "resourceTypePitched",
       "lastContactedAt", "nextFollowUpAt", "customFields", "ownerId", "ownerName", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
    [
      randomUUID(), actor.organizationId, data.name.trim(), data.company.trim(), data.email.trim(), data.phone.trim(),
      data.value || 0, data.stage || "new", data.source.trim(), data.notes.trim(),
      (data.title ?? "").trim(), (data.linkedinUrl ?? "").trim(), (data.location ?? "").trim(), (data.industry ?? "").trim(),
      (data.companySize ?? "").trim(), (data.painPoint ?? "").trim(), (data.offerPitched ?? "").trim(), (data.resourceTypePitched ?? "").trim(),
      data.lastContactedAt ?? "", data.nextFollowUpAt ?? "",
      JSON.stringify(data.customFields ?? {}), actor.id, actor.name, now, now,
    ]
  )
  revalidateBoard()
}

export async function updateLead(id: string, data: Partial<LeadInput>) {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")

  const fields: string[] = []
  const values: unknown[] = []
  const setText = (col: string, v: string | undefined) => { if (v !== undefined) { fields.push(`"${col}" = $${values.length + 1}`); values.push(v.trim()) } }
  const setRaw = (col: string, v: string | undefined) => { if (v !== undefined) { fields.push(`"${col}" = $${values.length + 1}`); values.push(v) } }

  if (data.name !== undefined) { fields.push(`name = $${values.length + 1}`); values.push(data.name.trim()) }
  if (data.company !== undefined) { fields.push(`company = $${values.length + 1}`); values.push(data.company.trim()) }
  if (data.email !== undefined) { fields.push(`email = $${values.length + 1}`); values.push(data.email.trim()) }
  if (data.phone !== undefined) { fields.push(`phone = $${values.length + 1}`); values.push(data.phone.trim()) }
  if (data.value !== undefined) { fields.push(`value = $${values.length + 1}`); values.push(data.value) }
  if (data.stage !== undefined) { fields.push(`stage = $${values.length + 1}`); values.push(data.stage) }
  if (data.source !== undefined) { fields.push(`source = $${values.length + 1}`); values.push(data.source.trim()) }
  if (data.notes !== undefined) { fields.push(`notes = $${values.length + 1}`); values.push(data.notes.trim()) }
  setText("title", data.title)
  setText("linkedinUrl", data.linkedinUrl)
  setText("location", data.location)
  setText("industry", data.industry)
  setText("companySize", data.companySize)
  setText("painPoint", data.painPoint)
  setText("offerPitched", data.offerPitched)
  setText("resourceTypePitched", data.resourceTypePitched)
  setRaw("lastContactedAt", data.lastContactedAt)
  setRaw("nextFollowUpAt", data.nextFollowUpAt)
  if (data.customFields !== undefined) { fields.push(`"customFields" = $${values.length + 1}`); values.push(JSON.stringify(data.customFields)) }
  if (!fields.length) return

  fields.push(`"updatedAt" = $${values.length + 1}`)
  values.push(new Date().toISOString())
  values.push(id)
  await execute(`UPDATE "Lead" SET ${fields.join(", ")} WHERE id = $${values.length}`, values)
  revalidateBoard()
}

// Marks "touched today" — called whenever an owner logs contact with a lead,
// separate from a full field edit so the pipeline can surface who's overdue.
export async function markContacted(id: string) {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")
  await execute(
    `UPDATE "Lead" SET "lastContactedAt" = $1, "updatedAt" = $1 WHERE id = $2`,
    [new Date().toISOString(), id]
  )
  revalidateBoard()
}

const MAX_BULK_IMPORT = 500

// Bulk-inserts leads parsed from an uploaded Excel/CSV file (see lib/lead-import.ts).
// All imported rows are owned by whoever ran the import.
export async function bulkCreateLeads(rows: LeadInput[]): Promise<{ imported: number }> {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")
  const capped = rows.filter(r => r.name.trim()).slice(0, MAX_BULK_IMPORT)
  const now = new Date().toISOString()
  for (const r of capped) {
    await execute(
      `INSERT INTO "Lead" (id, "organizationId", name, company, email, phone, value, stage, source, notes,
         title, "linkedinUrl", location, industry, "companySize", "painPoint", "offerPitched", "resourceTypePitched",
         "lastContactedAt", "nextFollowUpAt", "customFields", "ownerId", "ownerName", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
      [
        randomUUID(), actor.organizationId, r.name.trim(), r.company.trim(), r.email.trim(), r.phone.trim(),
        r.value || 0, r.stage || "new", r.source.trim(), r.notes.trim(),
        (r.title ?? "").trim(), (r.linkedinUrl ?? "").trim(), (r.location ?? "").trim(), (r.industry ?? "").trim(),
        (r.companySize ?? "").trim(), (r.painPoint ?? "").trim(), (r.offerPitched ?? "").trim(), (r.resourceTypePitched ?? "").trim(),
        r.lastContactedAt ?? "", r.nextFollowUpAt ?? "",
        JSON.stringify(r.customFields ?? {}), actor.id, actor.name, now, now,
      ]
    )
  }
  revalidateBoard()
  return { imported: capped.length }
}

export async function deleteLead(id: string) {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")
  const lead = await queryOne<{ ownerId: string }>(`SELECT "ownerId" FROM "Lead" WHERE id = $1`, [id])
  if (!lead) return
  if (!actor.isAdmin && lead.ownerId !== actor.id) throw new Error("You can only delete leads you added")
  await execute(`DELETE FROM "Lead" WHERE id = $1`, [id])
  revalidateBoard()
}
