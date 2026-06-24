import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import AttendanceClient from "./AttendanceClient"

function getWeekRange(date: string) {
  const d = new Date(date)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)]
}

export default async function AttendancePage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId
  const today = new Date().toISOString().slice(0, 10)
  const [start, end] = getWeekRange(today)

  const [employees, records] = await Promise.all([
    queryAll<{ id: string; name: string; role: string; department: string; avatar: string }>(
      `SELECT id, name, role, department, avatar FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`, [orgId]
    ),
    queryAll<{ employeeId: string; date: string; clockIn: string; clockOut: string | null; hours: number }>(
      `SELECT t."employeeId", t.date, t."clockIn", t."clockOut", t.hours FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.date >= $2 AND t.date <= $3 ORDER BY t.date`,
      [orgId, start, end]
    ),
  ])

  return (
    <div className="max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Attendance</h1>
        <p className="text-white/50 text-sm mt-1">Weekly and monthly attendance tracking for all employees</p>
      </div>
      <AttendanceClient employees={employees} records={records} initialMode="week" initialDate={today} />
    </div>
  )
}
