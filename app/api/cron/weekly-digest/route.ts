import { NextRequest, NextResponse } from "next/server"
import { queryAll } from "@/lib/db"
import { sendWeeklyDigest, type WeeklyDigestRow } from "@/lib/email"
import { format } from "date-fns"

type OrgRow = { id: string; name: string }
type AdminEmailRow = { organizationId: string; email: string }
type EmployeeWeekRow = {
  organizationId: string
  employeeId: string
  name: string
  hours: number | null
  activeSeconds: number | null
  daysWorked: number | null
}
type TicketCountRow = { organizationId: string; employeeId: string; count: number }
type FocusRow = { employeeId: string; currentFocus: string }

function isoWeekAgo() {
  return new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
}

// Runs Monday mornings (Vercel Cron). Summarizes the prior week per employee
// and emails every admin in each organization — a passive weekly check-in,
// not a nag; nobody gets pinged mid-week.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const weekAgo = isoWeekAgo()
  const weekLabel = `${format(new Date(weekAgo), "MMM d")} – ${format(new Date(), "MMM d")}`

  const [orgs, admins, weekStats, ticketCounts, focusRows] = await Promise.all([
    queryAll<OrgRow>(`SELECT id, name FROM "Organization"`),
    queryAll<AdminEmailRow>(`SELECT "organizationId", email FROM "Admin"`),
    queryAll<EmployeeWeekRow>(
      `SELECT e."organizationId", e.id as "employeeId", e.name,
              SUM(t.hours) as hours, SUM(t."activeSeconds") as "activeSeconds",
              COUNT(DISTINCT t.date) as "daysWorked"
       FROM "Employee" e
       LEFT JOIN "TimeRecord" t ON t."employeeId" = e.id AND t.date >= $1
       GROUP BY e."organizationId", e.id, e.name`,
      [weekAgo]
    ),
    queryAll<TicketCountRow>(
      `SELECT e."organizationId", e.id as "employeeId", COUNT(tk.id) as count
       FROM "Employee" e
       LEFT JOIN "Ticket" tk ON tk."employeeId" = e.id AND tk."createdAt" >= $1
       GROUP BY e."organizationId", e.id`,
      [weekAgo]
    ),
    queryAll<FocusRow>(`SELECT id as "employeeId", "currentFocus" FROM "Employee"`),
  ])

  let emailsSent = 0
  for (const org of orgs) {
    const orgAdminEmails = admins.filter(a => a.organizationId === org.id).map(a => a.email)
    if (orgAdminEmails.length === 0) continue

    const orgEmployees = weekStats.filter(e => e.organizationId === org.id && (e.hours ?? 0) > 0)
    if (orgEmployees.length === 0) continue // nothing to report — skip the email entirely

    const rows: WeeklyDigestRow[] = orgEmployees.map(e => ({
      name: e.name,
      hours: Number(e.hours ?? 0),
      activeHours: Number(e.activeSeconds ?? 0) / 3600,
      daysWorked: Number(e.daysWorked ?? 0),
      ticketsOpened: Number(ticketCounts.find(t => t.employeeId === e.employeeId)?.count ?? 0),
      lastFocus: focusRows.find(f => f.employeeId === e.employeeId)?.currentFocus ?? "",
    }))

    const res = await sendWeeklyDigest(orgAdminEmails, org.name, weekLabel, rows)
    if (!("error" in res)) emailsSent++
  }

  return NextResponse.json({ ok: true, orgsProcessed: orgs.length, emailsSent })
}
