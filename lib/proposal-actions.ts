"use server"

import { revalidatePath } from "next/cache"
import { queryAll, queryOne, execute } from "@/lib/db"
import { randomUUID } from "node:crypto"
import { getActor } from "@/lib/actor"
import { PROPOSAL_STATUSES, type ProposalStatus, type SavedProposal } from "@/lib/proposal-roles"

type ProposalDbRow = Omit<SavedProposal, "content"> & { content: string }

export type SaveProposalInput = {
  leadId?: string | null
  clientName: string
  projectType: string
  totalHeadcount: number
  totalMonthly: number
  content: unknown
}

function parseContent(raw: string): unknown {
  try { return JSON.parse(raw) } catch { return null }
}

export async function getProposals(): Promise<SavedProposal[]> {
  const actor = await getActor()
  if (!actor) return []
  const rows = await queryAll<ProposalDbRow>(
    `SELECT id, "leadId", "clientName", "projectType", "totalHeadcount", "totalMonthly",
       content, status, "ownerName", "createdAt", "updatedAt"
     FROM "Proposal" WHERE "organizationId" = $1 ORDER BY "createdAt" DESC`,
    [actor.organizationId]
  )
  return rows.map(r => ({ ...r, content: parseContent(r.content) }))
}

export async function saveProposal(data: SaveProposalInput): Promise<{ id: string }> {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")
  if (!data.clientName.trim()) throw new Error("Client name is required")
  const id = randomUUID()
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "Proposal" (id, "organizationId", "leadId", "clientName", "projectType",
       "totalHeadcount", "totalMonthly", content, status, "ownerId", "ownerName", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      id, actor.organizationId, data.leadId || null, data.clientName.trim(), data.projectType,
      Math.round(data.totalHeadcount) || 0, Math.round(data.totalMonthly) || 0,
      JSON.stringify(data.content ?? {}), "draft", actor.id, actor.name, now, now,
    ]
  )
  revalidatePath("/proposals")
  return { id }
}

export async function updateProposalStatus(id: string, status: ProposalStatus) {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")
  if (!PROPOSAL_STATUSES.includes(status)) throw new Error("Invalid status")
  // Org-scope the write so one org can't touch another's proposals.
  await execute(
    `UPDATE "Proposal" SET status = $1, "updatedAt" = $2 WHERE id = $3 AND "organizationId" = $4`,
    [status, new Date().toISOString(), id, actor.organizationId]
  )
  revalidatePath("/proposals")
}

export async function deleteProposal(id: string) {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")
  const row = await queryOne<{ ownerId: string }>(
    `SELECT "ownerId" FROM "Proposal" WHERE id = $1 AND "organizationId" = $2`,
    [id, actor.organizationId]
  )
  if (!row) return
  if (!actor.isAdmin && row.ownerId !== actor.id) throw new Error("You can only delete proposals you created")
  await execute(`DELETE FROM "Proposal" WHERE id = $1 AND "organizationId" = $2`, [id, actor.organizationId])
  revalidatePath("/proposals")
}
