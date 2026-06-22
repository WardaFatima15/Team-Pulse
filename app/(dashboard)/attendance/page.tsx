import { queryAll } from "@/lib/db"
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

function getMonthRange(date: string) {
  const [y, m] = date.split("-")
  const start = `${y}-${m}-01`
  const last = new Date(Number(y), Number(m), 0).getDate()
  const end = `${y}-${m}-${String(last).padStart(2, "0")}`
  return [start, end]
}

export default async function AttendancePage() {
  const today = new Date().toISOString().slice(0, 10)
  const [start, end] = getWeekRange(today)

  const [employees, records] = await Promise.all([
    queryAll<{ id: string; name: string; role: string; department: string; avatar: string }>(
      `SELECT id, name, role, department, avatar FROM "Employee" ORDER BY name`
    ),
    queryAll<{ employeeId: string; date: string; clockIn: string; clockOut: string | null; hours: number }>(
      `SELECT "employeeId", date, "clockIn", "clockOut", hours FROM "TimeRecord" WHERE date >= $1 AND date <= $2 ORDER BY date`,
      [start, end]
    ),
  ])

  return (
    <div className="max-w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-500 text-sm mt-1">Weekly and monthly attendance tracking for all employees</p>
      </div>
      <AttendanceClient
        employees={employees}
        records={records}
        initialMode="week"
        initialDate={today}
      />
    </div>
  )
}
