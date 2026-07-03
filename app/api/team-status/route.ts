import { NextResponse } from "next/server"
import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import { effectiveStatus } from "@/lib/presence"
import type { ActivityItem } from "@/components/ActivityFeed"

export const dynamic = "force-dynamic"

type EmployeeRow = {
  id: string; name: string; avatar: string; role: string; department: string
  status: string; location: string; lastSeenAt: string; currentFocus: string; focusSince: string
}
type TimeRecordRow = { employeeId: string; hours: number; date: string; clockOut: string | null; createdAt: string }

function day(n: number) { return new Date(Date.now() - n * 86400000).toISOString().split("T")[0] }

// Polled every ~10s by LiveTeamStatus. Kept lightweight — no long-lived
// connection (Vercel Hobby kills those), just a cheap org-scoped snapshot.
export async function GET() {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const orgId = admin.organizationId

  const today = day(0)
  const yesterday = day(1)

  const [employeesRaw, todayAndYesterdayRecords, activity] = await Promise.all([
    queryAll<EmployeeRow>(
      `SELECT id, name, avatar, role, department, status, location, "lastSeenAt", "currentFocus", "focusSince"
       FROM "Employee" WHERE "organizationId" = $1 ORDER BY status DESC, name ASC`,
      [orgId]
    ),
    queryAll<TimeRecordRow>(
      `SELECT t."employeeId", t.hours, t.date, t."clockOut", t."createdAt"
       FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId"
       WHERE e."organizationId" = $1 AND t.date = ANY($2)`,
      [orgId, [today, yesterday]]
    ),
    queryAll<ActivityItem>(
      `SELECT a.id, a."employeeName", a.action, a.detail, a."createdAt"
       FROM "ActivityLog" a JOIN "Employee" e ON e.id = a."employeeId"
       WHERE e."organizationId" = $1 ORDER BY a."createdAt" DESC LIMIT 12`,
      [orgId]
    ),
  ])

  // Include yesterday's still-open records for overnight shifts (e.g. 5pm–2am)
  const relevantRecords = todayAndYesterdayRecords.filter(r =>
    r.date === today || (r.date === yesterday && r.clockOut === null)
  )

  const employees = employeesRaw.map(e => {
    const rec = relevantRecords.find(r => r.employeeId === e.id)
    return {
      id: e.id,
      name: e.name,
      avatar: e.avatar,
      role: e.role,
      department: e.department,
      location: e.location,
      status: effectiveStatus(e.status, e.lastSeenAt),
      currentFocus: e.currentFocus,
      focusSince: e.focusSince,
      openSince: rec && rec.clockOut === null ? rec.createdAt : null,
      hoursToday: rec && rec.clockOut !== null ? rec.hours : 0,
    }
  })

  const online = employees.filter(e => e.status === "online").length

  return NextResponse.json({ employees, activity, online })
}
