import { notFound } from "next/navigation"
import { db, serialize } from "@/lib/db"
import { format } from "date-fns"
import EmployeeDetailClient from "./EmployeeDetailClient"

type Employee = {
  id: string; name: string; email: string; role: string; department: string
  avatar: string; status: string; phone: string; location: string
  joinDate: string; jiraAccountId: string
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
  const { id } = await params
  const emp = db.prepare("SELECT * FROM Employee WHERE id = ?").get(id) as Employee | undefined
  if (!emp) notFound()

  const today = day(0)
  const weekAgo = day(7)
  const monthAgo = new Date(new Date().setDate(1)).toISOString().split("T")[0]

  const timeRecords = serialize(
    db.prepare("SELECT id, date, clockIn, clockOut, hours FROM TimeRecord WHERE employeeId = ? ORDER BY date DESC").all(id) as TimeRecord[]
  )
  const leaves = serialize(
    db.prepare("SELECT id, type, startDate, endDate, days, reason, status, createdAt FROM LeaveRequest WHERE employeeId = ? ORDER BY createdAt DESC").all(id) as LeaveRequest[]
  )
  const tickets = serialize(
    db.prepare("SELECT id, title, description, priority, status, createdAt FROM Ticket WHERE employeeId = ? ORDER BY createdAt DESC").all(id) as Ticket[]
  )

  const hoursToday = (db.prepare("SELECT SUM(hours) as t FROM TimeRecord WHERE employeeId = ? AND date = ?").get(id, today) as { t: number | null }).t ?? 0
  const hoursWeek = (db.prepare("SELECT SUM(hours) as t FROM TimeRecord WHERE employeeId = ? AND date >= ?").get(id, weekAgo) as { t: number | null }).t ?? 0
  const hoursMonth = (db.prepare("SELECT SUM(hours) as t FROM TimeRecord WHERE employeeId = ? AND date >= ?").get(id, monthAgo) as { t: number | null }).t ?? 0
  const totalHours = (db.prepare("SELECT SUM(hours) as t FROM TimeRecord WHERE employeeId = ?").get(id) as { t: number | null }).t ?? 0
  const totalDays = (db.prepare("SELECT COUNT(DISTINCT date) as n FROM TimeRecord WHERE employeeId = ?").get(id) as { n: number }).n
  const openTickets = (db.prepare("SELECT COUNT(*) as n FROM Ticket WHERE employeeId = ? AND (status = 'open' OR status = 'in-progress')").get(id) as { n: number }).n
  const pendingLeaves = (db.prepare("SELECT COUNT(*) as n FROM LeaveRequest WHERE employeeId = ? AND status = 'pending'").get(id) as { n: number }).n
  const approvedLeaveDays = (db.prepare("SELECT SUM(days) as t FROM LeaveRequest WHERE employeeId = ? AND status = 'approved'").get(id) as { t: number | null }).t ?? 0

  const last7 = [6, 5, 4, 3, 2, 1, 0].map(n => {
    const date = day(n)
    const d = new Date(Date.now() - n * 86400000)
    const h = (db.prepare("SELECT SUM(hours) as t FROM TimeRecord WHERE employeeId = ? AND date = ?").get(id, date) as { t: number | null }).t ?? 0
    return { date, label: format(d, "EEE"), hours: Number(h) }
  })

  return (
    <EmployeeDetailClient
      employee={serialize(emp)}
      timeRecords={timeRecords}
      leaves={leaves}
      tickets={tickets}
      stats={{
        hoursToday: Number(hoursToday),
        hoursWeek: Number(hoursWeek),
        hoursMonth: Number(hoursMonth),
        totalHours: Number(totalHours),
        totalDays: Number(totalDays),
        openTickets: Number(openTickets),
        pendingLeaves: Number(pendingLeaves),
        approvedLeaveDays: Number(approvedLeaveDays),
      }}
      weekBars={last7}
    />
  )
}
