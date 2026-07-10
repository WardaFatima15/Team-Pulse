import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, TrendingUp, CalendarCheck, ArrowUp, ArrowRight, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { effectiveStatus } from "@/lib/presence"
import type { ActivityItem } from "@/components/ActivityFeed"
import {
  LiveTeamStatusProvider, LiveTeamStatusGrid, LiveActivityCard,
  LiveHeaderBadge, LiveOnlineStatTile, type LiveEmployee,
} from "@/components/LiveTeamStatus"

type Employee = { id: string; name: string; avatar: string; role: string; department: string; status: string; location: string; lastSeenAt: string; currentFocus: string; focusSince: string }
type TimeRecord = { employeeId: string; hours: number; date: string; clockIn: string; clockOut: string | null; createdAt: string }
type LeaveRequest = { id: string; employeeId: string; type: string; days: number; status: string }
type Ticket = { id: string; employeeId: string; title: string; priority: string; status: string }

function day(n: number) { return new Date(Date.now() - n * 86400000).toISOString().split("T")[0] }

export default async function DashboardPage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId
  const today = day(0)
  const weekDates = [0, 1, 2, 3, 4, 5, 6].map(n => day(n))
  const days = weekDates.map((date, i) => ({
    date,
    label: format(new Date(Date.now() - i * 86400000), "EEE"),
  }))

  const yesterday = day(1)

  const [employeesRaw, weekRecords, leaves, openTickets, activity] = await Promise.all([
    queryAll<Employee>(`SELECT * FROM "Employee" WHERE "organizationId" = $1 ORDER BY status DESC, name ASC`, [orgId]),
    queryAll<TimeRecord>(`SELECT t.* FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.date = ANY($2)`, [orgId, weekDates]),
    queryAll<LeaveRequest>(`SELECT l.* FROM "LeaveRequest" l JOIN "Employee" e ON e.id = l."employeeId" WHERE e."organizationId" = $1 ORDER BY l."createdAt" DESC`, [orgId]),
    queryAll<Ticket>(`SELECT t.* FROM "Ticket" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.status != 'resolved' ORDER BY t."createdAt" DESC LIMIT 4`, [orgId]),
    queryAll<ActivityItem>(`SELECT a.id, a."employeeName", a.action, a.detail, a."createdAt" FROM "ActivityLog" a JOIN "Employee" e ON e.id = a."employeeId" WHERE e."organizationId" = $1 ORDER BY a."createdAt" DESC LIMIT 12`, [orgId]),
  ])

  // Presence is derived from heartbeats, not self-claimed status
  const employees = employeesRaw.map(e => ({ ...e, status: effectiveStatus(e.status, e.lastSeenAt) }))

  // Include yesterday's still-open records for overnight shifts (e.g. 5pm–2am)
  const todayRecords = weekRecords.filter(r =>
    (r.date === today) || (r.date === yesterday && r.clockOut === null)
  )
  const online = employees.filter(e => e.status === "online").length
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
    urgent: "bg-red-500", high: "bg-orange-400", medium: "bg-yellow-400", low: "bg-white/30",
  }

  // Initial payload for the live-polling provider — matches /api/team-status shape,
  // computed here so first paint is instant (no client-side loading flash).
  const liveEmployees: LiveEmployee[] = employees.map(e => {
    const rec = todayRecords.find(r => r.employeeId === e.id)
    return {
      id: e.id, name: e.name, avatar: e.avatar, role: e.role, department: e.department,
      location: e.location, status: e.status as LiveEmployee["status"],
      currentFocus: e.currentFocus, focusSince: e.focusSince,
      openSince: rec && rec.clockOut === null ? rec.createdAt : null,
      hoursToday: rec && rec.clockOut !== null ? rec.hours : 0,
    }
  })

  return (
    <LiveTeamStatusProvider initial={{ employees: liveEmployees, activity, online }}>
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35 mb-1">// live overview</p>
          <h1 className="text-2xl font-bold text-white">Team Overview</h1>
          <p className="font-mono text-xs text-white/40 mt-1">{format(new Date(), "EEE dd MMM yyyy").toLowerCase()} · {employees.length} team members</p>
        </div>
        <LiveHeaderBadge />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <LiveOnlineStatTile total={employees.length} />
        {[
          { label: "Hours This Week", value: `${totalWeekHours}h`, sub: `${(totalWeekHours / Math.max(employees.length, 1)).toFixed(0)}h avg per person`, icon: Clock, color: "text-[#7c5af5]", bg: "bg-[#512feb]/15", trend: "5-day tracked" },
          { label: "Attendance Rate", value: `${attendedDays}%`, sub: "Past 7 days", icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/10", trend: "On track" },
          { label: "Pending Actions", value: pendingLeaves + openTickets.length, sub: `${pendingLeaves} leaves · ${openTickets.length} tickets`, icon: CalendarCheck, color: "text-amber-400", bg: "bg-amber-500/10", trend: "Need review" },
        ].map(({ label, value, sub, icon: Icon, color, bg, trend }) => (
          <Card key={label} className="hover:ring-white/20 transition-all">
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-3">
                <div className={`size-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wide text-white/35 flex items-center gap-1"><ArrowUp className="size-2.5 text-green-500" />{trend}</span>
              </div>
              <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mt-1">{label}</p>
              <p className="text-xs text-white/40 mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <LiveTeamStatusGrid />

          <Card>
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/55">Weekly Hours Logged</CardTitle>
                <Link href="/time-tracking" className="text-xs text-[#7c5af5] hover:underline flex items-center gap-1">Details <ArrowRight className="size-3" /></Link>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="flex items-end gap-2 h-32">
                {[...dailyHours].reverse().map(d => {
                  const pct = Math.round((d.total / maxHours) * 100)
                  const isToday = d.date === today
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-white/70">{d.total > 0 ? `${d.total}h` : ""}</span>
                      <div className="w-full flex items-end" style={{ height: "80px" }}>
                        <div
                          className={`w-full rounded-t-md transition-all ${isToday ? "bg-[#512feb]" : d.total > 0 ? "bg-[#512feb]/40" : "bg-white/10"}`}
                          style={{ height: `${Math.max(pct, d.total > 0 ? 8 : 4)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${isToday ? "text-[#7c5af5]" : "text-white/40"}`}>{d.label}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/10">
                <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#512feb]" /><span className="text-xs text-white/50">Today</span></div>
                <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#512feb]/40" /><span className="text-xs text-white/50">Previous days</span></div>
                <span className="ml-auto text-xs text-white/50">Total: <span className="font-semibold text-white">{totalWeekHours}h</span> this week</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <LiveActivityCard />

          <Card>
            <CardHeader className="border-b border-white/10 pb-4">
              <CardTitle className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/55">Team by Department</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {Object.entries(
                employees.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e.department]: (acc[e.department] ?? 0) + 1 }), {})
              ).sort((a, b) => b[1] - a[1]).map(([dept, count]) => (
                <div key={dept} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-white/70">{dept}</span>
                      <span className="text-white/40">{count} people</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-[#7c5af5]" style={{ width: `${(count / Math.max(employees.length, 1)) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/55">Pending Leaves</CardTitle>
                <Link href="/leaves" className="text-xs text-[#7c5af5] hover:underline">Review</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              {leaves.filter(l => l.status === "pending").slice(0, 4).map(leave => {
                const emp = employees.find(e => e.id === leave.employeeId)
                return (
                  <div key={leave.id} className="flex items-center gap-2.5">
                    <Avatar className="size-7 shrink-0">
                      <AvatarFallback className="text-xs bg-[#512feb]/20 text-[#7c5af5]">{emp?.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{emp?.name}</p>
                      <p className="text-xs text-white/40 capitalize">{leave.type} · {leave.days}d</p>
                    </div>
                    <span className="text-xs bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-medium shrink-0">Pending</span>
                  </div>
                )
              })}
              {pendingLeaves === 0 && <p className="text-xs text-white/40 py-2">All caught up!</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/55">Open Tickets</CardTitle>
                <Link href="/tickets" className="text-xs text-[#7c5af5] hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-2.5">
              {openTickets.map(ticket => {
                const emp = employees.find(e => e.id === ticket.employeeId)
                return (
                  <div key={ticket.id} className="flex items-start gap-2">
                    <div className={`size-1.5 rounded-full mt-1.5 shrink-0 ${priorityColor[ticket.priority] ?? "bg-white/30"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/80 line-clamp-1">{ticket.title}</p>
                      <p className="text-xs text-white/40">{emp?.name}</p>
                    </div>
                  </div>
                )
              })}
              {openTickets.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-green-400 py-2">
                  <AlertTriangle className="size-3.5" /> No open tickets
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </LiveTeamStatusProvider>
  )
}
