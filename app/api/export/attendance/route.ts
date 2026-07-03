import { NextRequest, NextResponse } from "next/server"
import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"

type Row = {
  name: string
  department: string
  role: string
  date: string
  clockIn: string
  clockOut: string | null
  hours: number
  activeSeconds: number
}

export async function GET(req: NextRequest) {
  const admin = await getAdminSession()
  const { searchParams } = new URL(req.url)
  const from = searchParams.get("from") ?? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const to = searchParams.get("to") ?? new Date().toISOString().slice(0, 10)
  const employeeId = searchParams.get("employeeId")

  let rows: Row[]
  if (admin?.organizationId) {
    if (employeeId) {
      rows = await queryAll<Row>(
        `SELECT e.name, e.department, e.role, t.date, t."clockIn", t."clockOut", t.hours, t."activeSeconds"
         FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId"
         WHERE e."organizationId" = $1 AND t.date >= $2 AND t.date <= $3 AND t."employeeId" = $4
         ORDER BY e.name, t.date`,
        [admin.organizationId, from, to, employeeId]
      )
    } else {
      rows = await queryAll<Row>(
        `SELECT e.name, e.department, e.role, t.date, t."clockIn", t."clockOut", t.hours, t."activeSeconds"
         FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId"
         WHERE e."organizationId" = $1 AND t.date >= $2 AND t.date <= $3
         ORDER BY e.name, t.date`,
        [admin.organizationId, from, to]
      )
    }
  } else {
    rows = await queryAll<Row>(
      `SELECT e.name, e.department, e.role, t.date, t."clockIn", t."clockOut", t.hours, t."activeSeconds"
       FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId"
       WHERE t.date >= $1 AND t.date <= $2
       ORDER BY e.name, t.date`,
      [from, to]
    )
  }

  const header = "Name,Department,Role,Date,Clock In,Clock Out,Hours,Active Hours\n"
  const body = rows.map(r =>
    [
      `"${r.name}"`,
      `"${r.department}"`,
      `"${r.role}"`,
      `"${new Date(r.date + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}"`,
      // clockIn/clockOut are plain "HH:MM" strings, not full ISO timestamps — use as-is.
      r.clockIn ?? "",
      r.clockOut ?? "",
      r.hours.toFixed(2),
      (r.activeSeconds / 3600).toFixed(2),
    ].join(",")
  ).join("\n")

  // Per-employee totals — payroll-ready summary appended after the daily rows.
  const totalsByEmployee = new Map<string, { hours: number; active: number }>()
  for (const r of rows) {
    const cur = totalsByEmployee.get(r.name) ?? { hours: 0, active: 0 }
    cur.hours += r.hours
    cur.active += r.activeSeconds / 3600
    totalsByEmployee.set(r.name, cur)
  }
  const totalsHeader = "\n\nEmployee,Total Hours,Total Active Hours\n"
  const totalsBody = Array.from(totalsByEmployee.entries())
    .map(([name, t]) => `"${name}",${t.hours.toFixed(2)},${t.active.toFixed(2)}`)
    .join("\n")

  const filename = employeeId
    ? `timesheet-${employeeId}-${from}-${to}.csv`
    : `attendance-${from}-${to}.csv`

  return new NextResponse(header + body + totalsHeader + totalsBody, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
