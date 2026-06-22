import { NextRequest, NextResponse } from "next/server"
import { execute, queryOne } from "@/lib/db"

async function getCurrentUserId(req: NextRequest) {
  const adminId = req.cookies.get("auth_token")?.value
  if (adminId) {
    const a = await queryOne<{ id: string }>(`SELECT id FROM "Admin" WHERE id = $1`, [adminId])
    if (a) return adminId
  }
  const empId = req.cookies.get("employee_token")?.value
  if (empId) {
    const e = await queryOne<{ id: string }>(`SELECT id FROM "Employee" WHERE id = $1`, [empId])
    if (e) return empId
  }
  return null
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { fromId } = await req.json()
  await execute(
    `UPDATE "ChatMessage" SET "isRead" = 1 WHERE "toId" = $1 AND "fromId" = $2 AND "isRead" = 0`,
    [userId, fromId]
  )
  return NextResponse.json({ ok: true })
}
