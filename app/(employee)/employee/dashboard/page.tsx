import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { db, serialize } from "@/lib/db"
import DashboardClient from "./DashboardClient"

type TimeRecord = { clockIn: string; clockOut: string | null; hours: number }
type Announcement = { id: string; title: string; body: string; pinned: number; createdAt: string }

export default async function EmployeeDashboardPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")

  const today = new Date().toISOString().split("T")[0]

  const rawRecord = db.prepare("SELECT clockIn, clockOut, hours FROM TimeRecord WHERE employeeId = ? AND date = ?").get(emp.id, today) as TimeRecord | undefined
  const todayRecord = rawRecord ? serialize(rawRecord) : null

  const pendingLeaves = (db.prepare("SELECT COUNT(*) as n FROM LeaveRequest WHERE employeeId = ? AND status = 'pending'").get(emp.id) as { n: number }).n
  const openTickets = (db.prepare("SELECT COUNT(*) as n FROM Ticket WHERE employeeId = ? AND status != 'resolved'").get(emp.id) as { n: number }).n
  const announcements = serialize(
    db.prepare("SELECT id, title, body, pinned, createdAt FROM Announcement ORDER BY pinned DESC, createdAt DESC LIMIT 3").all() as Announcement[]
  )

  return (
    <DashboardClient
      name={emp.name}
      status={emp.status}
      todayRecord={todayRecord}
      pendingLeaves={pendingLeaves}
      openTickets={openTickets}
      announcements={announcements}
    />
  )
}
