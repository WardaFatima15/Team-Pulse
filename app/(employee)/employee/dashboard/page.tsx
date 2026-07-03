import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { queryOne, queryAll } from "@/lib/db"
import DashboardClient from "./DashboardClient"

type TimeRecord = { clockIn: string; clockOut: string | null; hours: number }
type Announcement = { id: string; title: string; body: string; pinned: number; createdAt: string }

export default async function EmployeeDashboardPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")

  const today = new Date().toISOString().split("T")[0]

  const [todayRecord, pendingCount, openCount, announcements, focusRow] = await Promise.all([
    // Prefer any still-open session (overnight-safe), else today's record.
    queryOne<TimeRecord>(
      `SELECT "clockIn", "clockOut", hours FROM "TimeRecord"
       WHERE "employeeId" = $1 AND ("clockOut" IS NULL OR date = $2)
       ORDER BY "createdAt" DESC LIMIT 1`,
      [emp.id, today]
    ),
    queryOne<{ n: number }>(
      `SELECT COUNT(*) as n FROM "LeaveRequest" WHERE "employeeId" = $1 AND status = 'pending'`,
      [emp.id]
    ),
    queryOne<{ n: number }>(
      `SELECT COUNT(*) as n FROM "Ticket" WHERE "employeeId" = $1 AND status != 'resolved'`,
      [emp.id]
    ),
    queryAll<Announcement>(
      `SELECT id, title, body, pinned, "createdAt" FROM "Announcement" WHERE "organizationId" = $1 ORDER BY pinned DESC, "createdAt" DESC LIMIT 3`,
      [emp.organizationId]
    ),
    queryOne<{ currentFocus: string; focusSince: string }>(
      `SELECT "currentFocus", "focusSince" FROM "Employee" WHERE id = $1`,
      [emp.id]
    ),
  ])

  return (
    <DashboardClient
      name={emp.name}
      status={emp.status}
      todayRecord={todayRecord ?? null}
      pendingLeaves={Number(pendingCount?.n ?? 0)}
      openTickets={Number(openCount?.n ?? 0)}
      announcements={announcements}
      focus={focusRow?.currentFocus ?? ""}
      focusSince={focusRow?.focusSince ?? ""}
    />
  )
}
