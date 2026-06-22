import { NextRequest, NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const msg = await queryOne<{ fromId: string }>(
    `SELECT "fromId" FROM "ChatMessage" WHERE id = $1`, [id]
  )
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (msg.fromId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await execute(`DELETE FROM "ChatMessage" WHERE id = $1`, [id])
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "Missing content" }, { status: 400 })

  const msg = await queryOne<{ fromId: string }>(
    `SELECT "fromId" FROM "ChatMessage" WHERE id = $1`, [id]
  )
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (msg.fromId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  await execute(
    `UPDATE "ChatMessage" SET content = $1 WHERE id = $2`,
    [content.trim(), id]
  )
  return NextResponse.json({ ok: true })
}
