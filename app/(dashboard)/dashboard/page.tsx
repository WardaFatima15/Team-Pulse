import { queryAll } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Clock, TrendingUp, CalendarCheck, ArrowUp, ArrowRight, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

type Employee = { id: string; name: string; avatar: string; role: string; department: string; status: string; location: string }
type TimeRecord = { employeeId: string; hours: number; date: string }
type LeaveRequest = { id: string; employeeId: string; type: string; days: number; status: string }
type Ticket = { id: string; employeeId: string; title: string; priority: string; status: string }

const locationFlag: Record<string, string> = {
  Philippines: "🇵🇭", India: "🇮🇳", Pakistan: "🇵🇰", Ghana: "🇬🇭",
  Colombia: "🇨🇴", USA: "🇺🇸", UK: "🇬🇧", Bangladesh: "🇧🇩",
}
function getFlag(location: string) {
  const country = Object.keys(locationFlag).find(c => location.includes(c))
  return country ? locationFlag[country] : "🌍"
}

function day(n: number) { return new Date(Date.now() - n * 86400000).toISOString().split("T")[0] }

export default async function DashboardPage() {
  const today = day(0)
  const weekDates = [0, 1, 2, 3, 4, 5, 6].map(n => day(n))
  const days = weekDates.map((date, i) => ({
    date,
    label: format(new Date(Date.now() - i * 86400000), "EEE"),
  }))

  const [employees, weekRecords, leaves, openTickets] = await Promise.all([
    queryAll<Employee>(`SELECT * FROM "Employee" ORDER BY status DESC, name ASC`),
    queryAll<TimeRecord>(`SELECT * FROM "TimeRecord" WHERE date = ANY($1)`, [weekDates]),
    queryAll<LeaveRequest>(`SELECT * FROM "LeaveRequest" ORDER BY "createdAt" DESC`),
    queryAll<Ticket>(`SELECT * FROM "Ticket" WHERE status != 'resolved' ORDER BY "createdAt" DESC LIMIT 4`),
  ])

  const todayRecords = weekRecords.filter(r => r.date === today)
  const online = employees.filter(e => e.status === "online").length
  const away = employees.filter(e => e.status === "away").length
  const totalWeekHours = weekRecords.reduce((s, r) => s + r.hours, 0)
  const daysWithData = new Set(weekRecords.filter(r => r.date !== today).map(r => r.date)).size
  const attendedDays = daysWithData > 0
    ? Math.round((new Set(weekRecords.map(r => r.employeeId + r.date)).size / (employees.length * Math.max(daysWithData, 1))) * 100)
    : 100
  const pendingLeaves = leaves.filter(l => l.status === "pending").length

  const dailyHours = days.map(d => ({
    ...d,
    total: Math.round(weekRecords.filter(r => r.date === d.date).reduce((s, r) => s + r.hours, 0)),
  }))
  const maxHours = Math.max(...dailyHours.map(d => d.total), 1)

  const priorityColor: Record<string, string> = {
    urgent: "bg-red-500", high: "bg-orange-400", medium: "bg-yellow-400", low: "bg-slate-300",
  }
  const statusRing: Record<string, string> = {
    online: "ring-green-400 bg-green-50", away: "ring-yellow-400 bg-yellow-50", offline: "ring-slate-200 bg-slate-50",
  }
  const statusDot: Record<string, string> = {
    online: "bg-green-500", away: "bg-yellow-400", offline: "bg-slate-300",
  }

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Overview</h1>
          <p className="text-slate-500 text-sm mt-0.5">{format(new Date(), "EEEE, MMMM d yyyy")} · {employees.length} team members across {new Set(employees.map(e => e.location.split(", ").pop())).size} countries</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-3 py-1.5 rounded-full">
          <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          {online} active now
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Online Now", value: `${online}/${employees.length}`, sub: `${away} away`, icon: Users, color: "text-green-600", bg: "bg-green-50", trend: "+2 vs yesterday" },
          { label: "Hours This Week", value: `${totalWeekHours}h`, sub: `${(totalWeekHours / Math.max(employees.length, 1)).toFixed(0)}h avg per person`, icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50", trend: "5-day tracked" },
          { label: "Attendance Rate", value: `${attendedDays}%`, sub: "Past 7 days", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50", trend: "On track" },
          { label: "Pending Actions", value: pendingLeaves + openTickets.length, sub: `${pendingLeaves} leaves · ${openTickets.length} tickets`, icon: CalendarCheck, color: "text-amber-600", bg: "bg-amber-50", trend: "Need review" },
        ].map(({ label, value, sub, icon: Icon, color, bg, trend }) => (
          <Card key={label} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`size-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
                <span className="text-xs text-slate-400 flex items-center gap-0.5"><ArrowUp className="size-2.5 text-green-500" />{trend}</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Team status + weekly chart */}
        <div className="lg:col-span-2 space-y-5">

          {/* Team live status */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Live Team Status</CardTitle>
                <Link href="/employees" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">Manage <ArrowRight className="size-3" /></Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {employees.map(emp => {
                  const rec = todayRecords.find(r => r.employeeId === emp.id)
                  const ring = statusRing[emp.status] ?? statusRing.offline
                  const dot = statusDot[emp.status] ?? statusDot.offline
                  return (
                    <Link key={emp.id} href={`/employees/${emp.id}`}
                      className={`rounded-xl border-2 p-3 ring-1 ${ring} hover:shadow-md transition-all group`}>
                      <div className="flex items-center justify-between mb-2">
                        <Avatar className="size-8">
                          <AvatarFallback className="text-xs bg-white font-bold text-slate-700">{emp.avatar}</AvatarFallback>
                        </Avatar>
                        <span className={`size-2.5 rounded-full ${dot} ${emp.status === "online" ? "animate-pulse" : ""}`} />
                      </div>
                      <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-indigo-700 transition-colors">{emp.name.split(" ")[0]}</p>
                      <p className="text-xs text-slate-400 truncate">{emp.role.split(" ").slice(-1)}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-500">{getFlag(emp.location)}</span>
                        <span className="text-xs font-medium text-slate-700">{rec ? `${rec.hours}h` : "—"}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Weekly hours chart */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Weekly Hours Logged</CardTitle>
                <Link href="/time-tracking" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">Details <ArrowRight className="size-3" /></Link>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="flex items-end gap-2 h-32">
                {[...dailyHours].reverse().map(d => {
                  const pct = Math.round((d.total / maxHours) * 100)
                  const isToday = d.date === today
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-slate-700">{d.total > 0 ? `${d.total}h` : ""}</span>
                      <div className="w-full flex items-end" style={{ height: "80px" }}>
                        <div
                          className={`w-full rounded-t-md transition-all ${isToday ? "bg-indigo-500" : d.total > 0 ? "bg-indigo-200" : "bg-slate-100"}`}
                          style={{ height: `${Math.max(pct, d.total > 0 ? 8 : 4)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${isToday ? "text-indigo-600" : "text-slate-400"}`}>{d.label}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-indigo-500" /><span className="text-xs text-slate-500">Today</span></div>
                <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-indigo-200" /><span className="text-xs text-slate-500">Previous days</span></div>
                <span className="ml-auto text-xs text-slate-500">Total: <span className="font-semibold text-slate-900">{totalWeekHours}h</span> this week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right panel */}
        <div className="space-y-5">

          {/* Department breakdown */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-sm font-semibold">Team by Department</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {Object.entries(
                employees.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.department]: (acc[e.department] ?? 0) + 1 }), {})
              ).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                <div key={dept} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">{dept}</span>
                      <span className="text-slate-400">{count} people</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-400" style={{ width: `${(count / employees.length) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pending leaves */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Pending Leaves</CardTitle>
                <Link href="/leaves" className="text-xs text-indigo-600 hover:underline">Review</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              {leaves.filter(l => l.status === "pending").slice(0, 4).map(leave => {
                const emp = employees.find(e => e.id === leave.employeeId)
                return (
                  <div key={leave.id} className="flex items-center gap-2.5">
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">{emp?.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{emp?.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{leave.type} · {leave.days}d</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">Pending</span>
                  </div>
                )
              })}
              {pendingLeaves === 0 && <p className="text-xs text-slate-400 py-2">All caught up!</p>}
            </CardContent>
          </Card>

          {/* Open tickets */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Open Tickets</CardTitle>
                <Link href="/tickets" className="text-xs text-indigo-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-2.5">
              {openTickets.map(ticket => {
                const emp = employees.find(e => e.id === ticket.employeeId)
                return (
                  <div key={ticket.id} className="flex items-start gap-2">
                    <div className={`size-1.5 rounded-full mt-1.5 shrink-0 ${priorityColor[ticket.priority] ?? "bg-slate-300"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-800 line-clamp-1">{ticket.title}</p>
                      <p className="text-xs text-slate-400">{emp?.name}</p>
                    </div>
                  </div>
                )
              })}
              {openTickets.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-green-600 py-2">
                  <AlertTriangle className="size-3.5" /> No open tickets
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
