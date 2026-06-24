import { NextRequest, NextResponse } from "next/server"
import { queryAll } from "@/lib/db"
import { cookies } from "next/headers"
import { queryOne } from "@/lib/db"

async function getOrgId() {
  const store = await cookies()
  const adminId = store.get("auth_token")?.value
  if (!adminId) return null
  const row = await queryOne<{ organizationId: string }>(`SELECT "organizationId" FROM "Admin" WHERE id = $1`, [adminId])
  return row?.organizationId ?? null
}

function getWeekRange(date: string) {
  const d = new Date(date)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)]
}

function getMonthRange(date: string) {
  const [y, m] = date.split("-")
  const start = `${y}-${m}-01`
  const last = new Date(Number(y), Number(m), 0).getDate()
  const end = `${y}-${m}-${String(last).padStart(2, "0")}`
  return [start, end]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("mode") ?? "week"
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10)
  const orgId = await getOrgId()

  const [start, end] = mode === "month" ? getMonthRange(date) : getWeekRange(date)

  const records = await queryAll(
    orgId
      ? `SELECT t."employeeId", t.date, t."clockIn", t."clockOut", t.hours FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.date >= $2 AND t.date <= $3 ORDER BY t.date`
      : `SELECT "employeeId", date, "clockIn", "clockOut", hours FROM "TimeRecord" WHERE date >= $1 AND date <= $2 ORDER BY date`,
    orgId ? [orgId, start, end] : [start, end]
  )
  return NextResponse.json(records)
}
