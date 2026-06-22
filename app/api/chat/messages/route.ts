import { NextRequest, NextResponse } from "next/server"
import { queryAll, queryOne, execute } from "@/lib/db"
import { randomUUID } from "crypto"

type ChatMsg = {
  id: string; fromId: string; fromName: string
  toId: string; toName: string; content: string
  isRead: number; createdAt: string
}

async function getCurrentUser(req: NextRequest) {
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
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const withId = searchParams.get("with")
  const since = searchParams.get("since")
  if (!withId) return NextResponse.json({ error: "Missing with" }, { status: 400 })

  const values: unknown[] = [user.id, withId, withId, user.id]
  let query = `SELECT * FROM "ChatMessage"
    WHERE ("fromId" = $1 AND "toId" = $2) OR ("fromId" = $3 AND "toId" = $4)`
  if (since) { query += ` AND "createdAt" > $5`; values.push(since) }
  query += ` ORDER BY "createdAt" ASC`

  const msgs = await queryAll<ChatMsg>(query, values)
  return NextResponse.json(msgs)
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { toId, toName, content } = await req.json()
  if (!toId || !content?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const msg: ChatMsg = {
    id: randomUUID(), fromId: user.id, fromName: user.name,
    toId, toName: toName ?? toId, content: content.trim(),
    isRead: 0, createdAt: new Date().toISOString(),
  }
  await execute(
    `INSERT INTO "ChatMessage" (id, "fromId", "fromName", "toId", "toName", content, "isRead", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [msg.id, msg.fromId, msg.fromName, msg.toId, msg.toName, msg.content, msg.isRead, msg.createdAt]
  )
  return NextResponse.json(msg)
}
