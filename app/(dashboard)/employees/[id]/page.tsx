import { notFound, redirect } from "next/navigation"
import { queryOne, queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import { format } from "date-fns"
import EmployeeDetailClient from "./EmployeeDetailClient"

type Employee = {
  id: string; name: string; email: string; role: string; department: string
  avatar: string; status: string; phone: string; location: string
  joinDate: string; jiraAccountId: string; shiftHours: number
  currentFocus: string; focusSince: string
}
type TimeRecord = { id: string; date: string; clockIn: string; clockOut: string | null; hours: number }
type LeaveRequest = {
  id: string; type: string; startDate: string; endDate: string; days: number
  reason: string; status: string; createdAt: string
}
type Ticket = {
  id: string; title: string; description: string; priority: string
  status: string; createdAt: string
}

function day(n: number) { return new Date(Date.now() - n * 86400000).toISOString().split("T")[0] }

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")
  const { id } = await params
  const today = day(0)
  const weekAgo = day(7)
  const monthAgo = new Date(new Date().setDate(1)).toISOString().split("T")[0]
  const last7Dates = [6, 5, 4, 3, 2, 1, 0].map(n => day(n))

  const [emp, timeRecords, leaves, tickets, hourStats, countStats, last7Records] = await Promise.all([
    queryOne<Employee>(`SELECT * FROM "Employee" WHERE id = $1 AND "organizationId" = $2`, [id, admin.organizationId]),
    queryAll<TimeRecord>(`SELECT id, date, "clockIn", "clockOut", hours FROM "TimeRecord" WHERE "employeeId" = $1 ORDER BY date DESC`, [id]),
    queryAll<LeaveRequest>(`SELECT id, type, "startDate", "endDate", days, reason, status, "createdAt" FROM "LeaveRequest" WHERE "employeeId" = $1 ORDER BY "createdAt" DESC`, [id]),
    queryAll<Ticket>(`SELECT id, title, description, priority, status, "createdAt" FROM "Ticket" WHERE "employeeId" = $1 ORDER BY "createdAt" DESC`, [id]),
    queryOne<{ today_h: number | null; week_h: number | null; month_h: number | null; total_h: number | null }>(
      `SELECT
        SUM(CASE WHEN date = $2 THEN hours ELSE 0 END) as today_h,
        SUM(CASE WHEN date >= $3 THEN hours ELSE 0 END) as week_h,
        SUM(CASE WHEN date >= $4 THEN hours ELSE 0 END) as month_h,
        SUM(hours) as total_h
       FROM "TimeRecord" WHERE "employeeId" = $1`,
      [id, today, weekAgo, monthAgo]
    ),
    queryOne<{ total_days: number; open_tickets: number; pending_leaves: number; approved_leave_days: number | null }>(
      `SELECT
        (SELECT COUNT(DISTINCT date) FROM "TimeRecord" WHERE "employeeId" = $1) as total_days,
        (SELECT COUNT(*) FROM "Ticket" WHERE "employeeId" = $1 AND (status = 'open' OR status = 'in-progress')) as open_tickets,
        (SELECT COUNT(*) FROM "LeaveRequest" WHERE "employeeId" = $1 AND status = 'pending') as pending_leaves,
        (SELECT SUM(days) FROM "LeaveRequest" WHERE "employeeId" = $1 AND status = 'approved') as approved_leave_days`,
      [id]
    ),
    queryAll<{ date: string; hours: number }>(
      `SELECT date, SUM(hours) as hours FROM "TimeRecord" WHERE "employeeId" = $1 AND date = ANY($2) GROUP BY date`,
      [id, last7Dates]
    ),
  ])

  if (!emp) notFound()

  const last7 = last7Dates.map((date, i) => {
    const n = 6 - i
    const d = new Date(Date.now() - n * 86400000)
    const rec = last7Records.find(r => r.date === date)
    return { date, label: format(d, "EEE"), hours: Number(rec?.hours ?? 0) }
  })

  return (
    <EmployeeDetailClient
      employee={emp}
      timeRecords={timeRecords}
      leaves={leaves}
      tickets={tickets}
      stats={{
        hoursToday: Number(hourStats?.today_h ?? 0),
        hoursWeek: Number(hourStats?.week_h ?? 0),
        hoursMonth: Number(hourStats?.month_h ?? 0),
        totalHours: Number(hourStats?.total_h ?? 0),
        totalDays: Number(countStats?.total_days ?? 0),
        openTickets: Number(countStats?.open_tickets ?? 0),
        pendingLeaves: Number(countStats?.pending_leaves ?? 0),
        approvedLeaveDays: Number(countStats?.approved_leave_days ?? 0),
      }}
      weekBars={last7}
    />
  )
}
