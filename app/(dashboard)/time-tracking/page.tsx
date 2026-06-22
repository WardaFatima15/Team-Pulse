import { queryAll } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, TrendingUp, Users, Timer } from "lucide-react"
import { format } from "date-fns"

type Employee = { id: string; name: string; avatar: string; role: string; department: string }
type TimeRecord = { id: string; employeeId: string; date: string; clockIn: string; clockOut: string | null; hours: number }

export default async function TimeTrackingPage() {
  const today = new Date().toISOString().split("T")[0]
  const days = [0, 1, 2, 3, 4].map(n => new Date(Date.now() - n * 86400000).toISOString().split("T")[0])

  const [employees, todayRecords, weekRecords] = await Promise.all([
    queryAll<Employee>(`SELECT * FROM "Employee" ORDER BY name`),
    queryAll<TimeRecord>(`SELECT * FROM "TimeRecord" WHERE date = $1`, [today]),
    queryAll<TimeRecord>(`SELECT * FROM "TimeRecord" WHERE date = ANY($1) ORDER BY date DESC`, [days]),
  ])

  const totalHoursToday = todayRecords.reduce((s, r) => s + r.hours, 0)
  const activeNow = todayRecords.filter(r => !r.clockOut).length
  const avgHours = todayRecords.length ? totalHoursToday / todayRecords.length : 0

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Hours Today", value: totalHoursToday.toFixed(1) + "h", icon: Clock, color: "text-[#512feb]", bg: "bg-[#512feb]/5" },
          { label: "Currently Active", value: activeNow, icon: Timer, color: "text-green-600", bg: "bg-green-50" },
          { label: "Members Logged In", value: todayRecords.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Avg Hours Today", value: avgHours.toFixed(1) + "h", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}><CardContent className="pt-4">
            <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon className={`size-4 ${color}`} /></div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-semibold">Today&apos;s Attendance — {format(new Date(today), "EEEE, MMMM d yyyy")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-100">
                {["Employee", "Department", "Clock In", "Clock Out", "Hours", "Status"].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 py-3 px-3 first:pl-0">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {employees.map(emp => {
                  const rec = todayRecords.find(r => r.employeeId === emp.id)
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 shrink-0"><AvatarFallback className="text-xs bg-[#512feb]/10 text-[#512feb] font-medium">{emp.avatar}</AvatarFallback></Avatar>
                          <div><p className="text-sm font-medium text-slate-900">{emp.name}</p><p className="text-xs text-slate-400">{emp.role}</p></div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-600">{emp.department}</td>
                      <td className="py-3 px-3 text-sm font-mono text-slate-700">{rec?.clockIn ?? "—"}</td>
                      <td className="py-3 px-3 text-sm font-mono text-slate-700">{rec ? (rec.clockOut ?? "Active") : "—"}</td>
                      <td className="py-3 px-3 text-sm font-semibold text-slate-900">{rec ? rec.hours + "h" : "0h"}</td>
                      <td className="py-3 px-3">
                        {!rec ? <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Not logged</span>
                          : rec.clockOut ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Done</span>
                          : <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700"><span className="size-1.5 rounded-full bg-green-500 animate-pulse" />Active</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {employees.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No employees yet.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-semibold">Weekly Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-slate-100">
                <th className="text-left text-xs font-medium text-slate-500 py-3 pr-4 min-w-[160px]">Employee</th>
                {days.map(d => <th key={d} className="text-center text-xs font-medium text-slate-500 py-3 px-3 min-w-[70px]">{format(new Date(d), "EEE d")}</th>)}
                <th className="text-right text-xs font-medium text-slate-500 py-3 pl-4">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-50">
                {employees.map(emp => {
                  const total = weekRecords.filter(r => r.employeeId === emp.id).reduce((s, r) => s + r.hours, 0)
                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-6 shrink-0"><AvatarFallback className="text-xs bg-[#512feb]/10 text-[#512feb]">{emp.avatar}</AvatarFallback></Avatar>
                          <span className="text-sm text-slate-800">{emp.name}</span>
                        </div>
                      </td>
                      {days.map(d => {
                        const rec = weekRecords.find(r => r.employeeId === emp.id && r.date === d)
                        return (
                          <td key={d} className="text-center text-sm py-3 px-3">
                            {rec ? <span className={`font-medium ${rec.hours >= 8 ? "text-green-600" : rec.hours >= 4 ? "text-amber-600" : "text-red-500"}`}>{rec.hours}h</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                        )
                      })}
                      <td className="text-right text-sm font-bold text-slate-900 py-3 pl-4">{total}h</td>
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
