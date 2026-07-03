import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import AttendanceClient from "./AttendanceClient"
import TodayBoard, { type TodayRow, type TodayState } from "@/components/attendance/TodayBoard"

function getWeekRange(date: string) {
  const d = new Date(date)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)]
}

function day(n: number) { return new Date(Date.now() - n * 86400000).toISOString().split("T")[0] }

// Compares "HH:MM" shift start against the current time-of-day (both treated
// as local wall-clock strings — good enough for a same-day late/absent signal).
function isPastShiftStart(shiftStart: string, now: Date): boolean {
  const [h, m] = shiftStart.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return false
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  return nowMinutes > h * 60 + m
}

export default async function AttendancePage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = day(1)
  const [start, end] = getWeekRange(today)

  const [employees, records, todayYesterdayRecords, approvedLeavesToday] = await Promise.all([
    queryAll<{ id: string; name: string; role: string; department: string; avatar: string; status: string; lastSeenAt: string; shiftStart: string; shiftHours: number }>(
      `SELECT id, name, role, department, avatar, status, "lastSeenAt", "shiftStart", "shiftHours" FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`, [orgId]
    ),
    queryAll<{ employeeId: string; date: string; clockIn: string; clockOut: string | null; hours: number }>(
      `SELECT t."employeeId", t.date, t."clockIn", t."clockOut", t.hours FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.date >= $2 AND t.date <= $3 ORDER BY t.date`,
      [orgId, start, end]
    ),
    queryAll<{ employeeId: string; date: string; clockIn: string; clockOut: string | null; hours: number; createdAt: string; activeSeconds: number }>(
      `SELECT t."employeeId", t.date, t."clockIn", t."clockOut", t.hours, t."createdAt", t."activeSeconds" FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.date = ANY($2)`,
      [orgId, [today, yesterday]]
    ),
    queryAll<{ employeeId: string }>(
      `SELECT l."employeeId" FROM "LeaveRequest" l JOIN "Employee" e ON e.id = l."employeeId"
       WHERE e."organizationId" = $1 AND l.status = 'approved' AND l."startDate" <= $2 AND l."endDate" >= $2`,
      [orgId, today]
    ),
  ])

  const now = new Date()
  const onLeaveIds = new Set(approvedLeavesToday.map(l => l.employeeId))

  const todayRows: TodayRow[] = employees.map(emp => {
    // Overnight-safe: prefer a still-open session (may have started yesterday), else today's closed record.
    const openRec = todayYesterdayRecords.find(r => r.employeeId === emp.id && r.clockOut === null)
    const closedTodayRec = todayYesterdayRecords.find(r => r.employeeId === emp.id && r.date === today && r.clockOut !== null)

    let state: TodayState
    if (onLeaveIds.has(emp.id)) state = "on_leave"
    else if (openRec) state = "working"
    else if (closedTodayRec) state = "done"
    else if (emp.shiftStart && isPastShiftStart(emp.shiftStart, now)) state = "late"
    else state = "absent"

    return {
      id: emp.id,
      name: emp.name,
      avatar: emp.avatar,
      role: emp.role,
      state,
      clockIn: openRec?.clockIn ?? closedTodayRec?.clockIn ?? null,
      openSince: openRec?.createdAt ?? null,
      hoursToday: closedTodayRec?.hours ?? 0,
      activeSeconds: (openRec ?? closedTodayRec)?.activeSeconds ?? 0,
      expected: emp.shiftHours,
    }
  })

  return (
    <div className="max-w-full space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Attendance</h1>
        <p className="text-white/50 text-sm mt-1">Today's status, plus weekly and monthly history for all employees</p>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white/80 mb-3">Today</h2>
        <TodayBoard rows={todayRows} />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white/80 mb-3">History</h2>
        <AttendanceClient employees={employees} records={records} initialMode="week" initialDate={today} />
      </div>
    </div>
  )
}
