import { redirect } from "next/navigation"
import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, TrendingUp, Users, Timer } from "lucide-react"
import { format } from "date-fns"
import LiveTimer from "@/components/LiveTimer"
import AutoRefresh from "@/components/AutoRefresh"

type Employee = { id: string; name: string; avatar: string; role: string; department: string }
type TimeRecord = { id: string; employeeId: string; date: string; clockIn: string; clockOut: string | null; hours: number; createdAt: string }

export default async function TimeTrackingPage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")
  const orgId = admin.organizationId

  const today = new Date().toISOString().split("T")[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0]
  const days = [0, 1, 2, 3, 4].map(n => new Date(Date.now() - n * 86400000).toISOString().split("T")[0])

  const [employees, todayAndYesterdayRecords, weekRecords] = await Promise.all([
    queryAll<Employee>(`SELECT id, name, avatar, role, department FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`, [orgId]),
    queryAll<TimeRecord>(`SELECT t.id, t."employeeId", t.date, t."clockIn", t."clockOut", t.hours, t."createdAt" FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.date = ANY($2)`, [orgId, [today, yesterday]]),
    queryAll<TimeRecord>(`SELECT t.id, t."employeeId", t.date, t."clockIn", t."clockOut", t.hours, t."createdAt" FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.date = ANY($2) ORDER BY t.date DESC`, [orgId, days]),
  ])

  // Overnight-safe "today" record: prefer a still-open session (may have started
  // yesterday, e.g. a 5pm–2am shift), else today's own record.
  const todayRecords = todayAndYesterdayRecords.filter(r =>
    r.date === today || (r.date === yesterday && r.clockOut === null)
  )

  const totalHoursToday = todayRecords.reduce((s, r) => s + r.hours, 0)
  const activeNow = todayRecords.filter(r => !r.clockOut).length
  const avgHours = todayRecords.length ? totalHoursToday / todayRecords.length : 0

  return (
    <div className="space-y-6 max-w-7xl">
      <AutoRefresh ms={30000} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Hours Today", value: totalHoursToday.toFixed(1) + "h", icon: Clock, color: "text-[#7c5af5]", bg: "bg-[#512feb]/10" },
          { label: "Currently Active", value: activeNow, icon: Timer, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Members Logged In", value: todayRecords.length, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Avg Hours Today", value: avgHours.toFixed(1) + "h", icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-[#0d0d12] border-white/10">
            <CardContent className="pt-4">
              <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`size-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-white/50 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[#0d0d12] border-white/10">
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/55">Today&apos;s Attendance — {format(new Date(today), "EEEE, MMMM d yyyy")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {["Employee", "Department", "Clock In", "Clock Out", "Hours", "Status"].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-white/40 py-3 px-3 first:pl-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employees.map(emp => {
                  const rec = todayRecords.find(r => r.employeeId === emp.id)
                  return (
                    <tr key={emp.id} className="hover:bg-white/3">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 shrink-0">
                            <AvatarFallback className="text-xs bg-[#512feb]/20 text-[#7c5af5] font-medium">{emp.avatar}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-white">{emp.name}</p>
                            <p className="text-xs text-white/40">{emp.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-white/60">{emp.department}</td>
                      <td className="py-3 px-3 text-sm font-mono text-white/70">{rec?.clockIn ?? "—"}</td>
                      <td className="py-3 px-3 text-sm font-mono text-white/70">{rec ? (rec.clockOut ?? "Active") : "—"}</td>
                      <td className="py-3 px-3 text-sm font-semibold text-white">
                        {rec
                          ? rec.clockOut === null
                            ? <span className="text-green-400"><LiveTimer since={rec.createdAt} /></span>
                            : `${rec.hours}h`
                          : "0h"}
                      </td>
                      <td className="py-3 px-3">
                        {!rec
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40">Not logged</span>
                          : rec.clockOut
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">Done</span>
                            : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400"><span className="size-1.5 rounded-full bg-green-500 animate-pulse" />Active</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {employees.length === 0 && <p className="text-xs text-white/30 text-center py-6">No employees yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#0d0d12] border-white/10">
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/55">Weekly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-xs font-medium text-white/40 py-3 pr-4 min-w-[160px]">Employee</th>
                  {days.map(d => (
                    <th key={d} className="text-center text-xs font-medium text-white/40 py-3 px-3 min-w-[70px]">
                      {format(new Date(d + "T12:00:00"), "EEE d")}
                    </th>
                  ))}
                  <th className="text-right text-xs font-medium text-white/40 py-3 pl-4">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {employees.map(emp => {
                  const total = weekRecords.filter(r => r.employeeId === emp.id).reduce((s, r) => s + r.hours, 0)
                  return (
                    <tr key={emp.id} className="hover:bg-white/3">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6 shrink-0">
                            <AvatarFallback className="text-xs bg-[#512feb]/20 text-[#7c5af5]">{emp.avatar}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-white/80">{emp.name}</span>
                        </div>
                      </td>
                      {days.map(d => {
                        const rec = weekRecords.find(r => r.employeeId === emp.id && r.date === d)
                        return (
                          <td key={d} className="text-center text-sm py-3 px-3">
                            {rec
                              ? <span className={`font-medium ${rec.hours >= 8 ? "text-green-400" : rec.hours >= 4 ? "text-amber-400" : "text-red-400"}`}>{rec.hours}h</span>
                              : <span className="text-white/20">—</span>}
                          </td>
                        )
                      })}
                      <td className="text-right text-sm font-bold text-white py-3 pl-4">{total}h</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
