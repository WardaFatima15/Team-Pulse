import { NextRequest, NextResponse } from "next/server"
import { queryOne, queryAll, execute } from "@/lib/db"
import { randomUUID } from "crypto"

async function getUser(req: NextRequest) {
  const adminId = req.cookies.get("auth_token")?.value
  if (adminId) {
    const a = await queryOne<{ id: string }>(`SELECT id FROM "Admin" WHERE id = $1`, [adminId])
    if (a) return { id: adminId, name: "Admin" }
  }
  const empId = req.cookies.get("employee_token")?.value
  if (empId) {
    const e = await queryOne<{ id: string; name: string }>(`SELECT id, name FROM "Employee" WHERE id = $1`, [empId])
    if (e) return { id: e.id, name: e.name }
  }
  return null
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await queryOne(`SELECT id FROM "GroupMember" WHERE "groupId" = $1 AND "memberId" = $2`, [groupId, user.id])
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const group = await queryOne<{ id: string; name: string; createdBy: string; createdAt: string }>(
    `SELECT id, name, "createdBy", "createdAt" FROM "GroupChat" WHERE id = $1`, [groupId]
  )
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const members = await queryAll<{ id: string; name: string; joinedAt: string }>(
    `SELECT "memberId" AS id, "memberName" AS name, "joinedAt" FROM "GroupMember" WHERE "groupId" = $1 ORDER BY "joinedAt"`,
    [groupId]
  )

  return NextResponse.json({ ...group, members })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const member = await queryOne(`SELECT id FROM "GroupMember" WHERE "groupId" = $1 AND "memberId" = $2`, [groupId, user.id])
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json() as {
    name?: string
    addMembers?: { id: string; name: string }[]
    removeMembers?: string[]
  }

  if (body.name?.trim()) {
    await execute(`UPDATE "GroupChat" SET name = $1 WHERE id = $2`, [body.name.trim(), groupId])
  }

  const now = new Date().toISOString()
  for (const m of body.addMembers ?? []) {
    await execute(
      `INSERT INTO "GroupMember" (id, "groupId", "memberId", "memberName", "joinedAt")
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("groupId", "memberId") DO NOTHING`,
      [randomUUID(), groupId, m.id, m.name, now]
    )
  }

  for (const memberId of body.removeMembers ?? []) {
    // Don't allow self-removal via API (caller handles UI)
    if (memberId !== user.id) {
      await execute(
        `DELETE FROM "GroupMember" WHERE "groupId" = $1 AND "memberId" = $2`,
        [groupId, memberId]
      )
    }
  }

  const updated = await queryOne<{ id: string; name: string; createdBy: string; createdAt: string }>(
    `SELECT id, name, "createdBy", "createdAt" FROM "GroupChat" WHERE id = $1`, [groupId]
  )
  const members = await queryAll<{ id: string; name: string; joinedAt: string }>(
    `SELECT "memberId" AS id, "memberName" AS name, "joinedAt" FROM "GroupMember" WHERE "groupId" = $1 ORDER BY "joinedAt"`,
    [groupId]
  )
  return NextResponse.json({ ...updated, members })
}
