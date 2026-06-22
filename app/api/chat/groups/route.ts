import { NextRequest, NextResponse } from "next/server"
import { queryAll, queryOne, execute } from "@/lib/db"
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

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const groups = await queryAll<{ id: string; name: string; createdAt: string; memberCount: number }>(
    `SELECT g.id, g.name, g."createdAt",
      (SELECT COUNT(*) FROM "GroupMember" gm2 WHERE gm2."groupId" = g.id)::int AS "memberCount"
     FROM "GroupChat" g
     JOIN "GroupMember" gm ON g.id = gm."groupId"
     WHERE gm."memberId" = $1
     ORDER BY g."createdAt" DESC`,
    [user.id]
  )
  return NextResponse.json(groups)
}

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, members } = await req.json() as {
    name: string
    members: { id: string; name: string }[]
  }
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 })

  const groupId = randomUUID()
  const now = new Date().toISOString()

  await execute(
    `INSERT INTO "GroupChat" (id, name, "createdBy", "createdAt") VALUES ($1, $2, $3, $4)`,
    [groupId, name.trim(), user.id, now]
  )
  await execute(
    `INSERT INTO "GroupMember" (id, "groupId", "memberId", "memberName", "joinedAt") VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), groupId, user.id, user.name, now]
  )

  const unique = (members ?? []).filter(m => m.id !== user.id)
  for (const m of unique) {
    await execute(
      `INSERT INTO "GroupMember" (id, "groupId", "memberId", "memberName", "joinedAt")
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT ("groupId", "memberId") DO NOTHING`,
      [randomUUID(), groupId, m.id, m.name, now]
    )
  }

  return NextResponse.json({
    id: groupId,
    name: name.trim(),
    createdAt: now,
    memberCount: unique.length + 1,
  })
}
