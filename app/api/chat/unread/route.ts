import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

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

export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId(req)
  if (!userId) return NextResponse.json({ count: 0 })
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM "ChatMessage" WHERE "toId" = $1 AND "isRead" = 0`,
    [userId]
  )
  return NextResponse.json({ count: Number(row?.count ?? 0) })
}
