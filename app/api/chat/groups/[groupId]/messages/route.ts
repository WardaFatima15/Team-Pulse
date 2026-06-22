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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { groupId } = await params
  const since = new URL(req.url).searchParams.get("since")

  const member = await queryOne(
    `SELECT id FROM "GroupMember" WHERE "groupId" = $1 AND "memberId" = $2`,
    [groupId, user.id]
  )
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 })

  const values: unknown[] = [groupId]
  let query = `SELECT * FROM "GroupMessage" WHERE "groupId" = $1`
  if (since) { query += ` AND "createdAt" > $2`; values.push(since) }
  query += ` ORDER BY "createdAt" ASC`

  const msgs = await queryAll(query, values)
  return NextResponse.json(msgs)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { groupId } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "Missing content" }, { status: 400 })

  const member = await queryOne(
    `SELECT id FROM "GroupMember" WHERE "groupId" = $1 AND "memberId" = $2`,
    [groupId, user.id]
  )
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 })

  const msg = {
    id: randomUUID(),
    groupId,
    fromId: user.id,
    fromName: user.name,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  }
  await execute(
    `INSERT INTO "GroupMessage" (id, "groupId", "fromId", "fromName", content, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [msg.id, msg.groupId, msg.fromId, msg.fromName, msg.content, msg.createdAt]
  )
  return NextResponse.json(msg)
}
