import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { queryAll } from "@/lib/db"

export async function GET(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 })
  }

  const employees = await queryAll<{ id: string; name: string; avatar: string; role: string; department: string }>(
    `SELECT id, name, avatar, role, department FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`,
    [admin.organizationId]
  )
  const records = await queryAll<{ employeeId: string; clockIn: string; clockOut: string | null; hours: number; notes: string; createdAt: string }>(
    `SELECT t."employeeId", t."clockIn", t."clockOut", t.hours, t.notes, t."createdAt"
     FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId"
     WHERE e."organizationId" = $1 AND t.date = $2`,
    [admin.organizationId, date]
  )

  const rows = employees.map(e => {
    const rec = records.find(r => r.employeeId === e.id)
    return {
      employeeId: e.id,
      name: e.name,
      avatar: e.avatar,
      role: e.role,
      department: e.department,
      clockIn: rec?.clockIn ?? null,
      clockOut: rec?.clockOut ?? null,
      hours: rec?.hours ?? 0,
      notes: rec?.notes ?? "",
      createdAt: rec?.createdAt ?? null,
    }
  })

  return NextResponse.json({ date, rows })
}
