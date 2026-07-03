"use server"

import { revalidatePath } from "next/cache"
import { queryOne, queryAll, execute } from "@/lib/db"
import { randomUUID } from "node:crypto"
import { getAdminSession } from "@/lib/admin-auth"
import { getEmployeeSession } from "@/lib/employee-auth"

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost"

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
  ownerId: string
  ownerName: string
  createdAt: string
  updatedAt: string
}

type Actor = { id: string; name: string; organizationId: string; isAdmin: boolean }

// The pipeline is shared between admins and employees — whoever is logged in
// (either session type) can see and work the same org-wide board.
async function getActor(): Promise<Actor | null> {
  const admin = await getAdminSession()
  if (admin) return { id: admin.id, name: admin.name, organizationId: admin.organizationId, isAdmin: true }
  const emp = await getEmployeeSession()
  if (emp) return { id: emp.id, name: emp.name, organizationId: emp.organizationId, isAdmin: false }
  return null
}

export async function getLeads(): Promise<Lead[]> {
  const actor = await getActor()
  if (!actor) return []
  return queryAll<Lead>(
    `SELECT id, name, company, email, phone, value, stage, source, notes, "ownerId", "ownerName", "createdAt", "updatedAt"
     FROM "Lead" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC`,
    [actor.organizationId]
  )
}

function revalidateBoard() {
  revalidatePath("/pipeline")
  revalidatePath("/employee/pipeline")
}

export async function createLead(data: {
  name: string; company: string; email: string; phone: string
  value: number; stage: string; source: string; notes: string
}) {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")
  if (!data.name.trim()) throw new Error("Name is required")
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "Lead" (id, "organizationId", name, company, email, phone, value, stage, source, notes, "ownerId", "ownerName", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [
      randomUUID(), actor.organizationId, data.name.trim(), data.company.trim(), data.email.trim(), data.phone.trim(),
      data.value || 0, data.stage || "new", data.source.trim(), data.notes.trim(), actor.id, actor.name, now, now,
    ]
  )
  revalidateBoard()
}

export async function updateLead(id: string, data: {
  name?: string; company?: string; email?: string; phone?: string
  value?: number; stage?: string; source?: string; notes?: string
}) {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")

  const fields: string[] = []
  const values: unknown[] = []
  if (data.name !== undefined) { fields.push(`name = $${values.length + 1}`); values.push(data.name.trim()) }
  if (data.company !== undefined) { fields.push(`company = $${values.length + 1}`); values.push(data.company.trim()) }
  if (data.email !== undefined) { fields.push(`email = $${values.length + 1}`); values.push(data.email.trim()) }
  if (data.phone !== undefined) { fields.push(`phone = $${values.length + 1}`); values.push(data.phone.trim()) }
  if (data.value !== undefined) { fields.push(`value = $${values.length + 1}`); values.push(data.value) }
  if (data.stage !== undefined) { fields.push(`stage = $${values.length + 1}`); values.push(data.stage) }
  if (data.source !== undefined) { fields.push(`source = $${values.length + 1}`); values.push(data.source.trim()) }
  if (data.notes !== undefined) { fields.push(`notes = $${values.length + 1}`); values.push(data.notes.trim()) }
  if (!fields.length) return

  fields.push(`"updatedAt" = $${values.length + 1}`)
  values.push(new Date().toISOString())
  values.push(id)
  await execute(`UPDATE "Lead" SET ${fields.join(", ")} WHERE id = $${values.length}`, values)
  revalidateBoard()
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
