"use client"

import { useState, useTransition, useEffect } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, TicketCheck, KeyRound, Save, TrendingUp, CheckCircle2, AlertCircle, XCircle, Pencil, Activity, Download } from "lucide-react"
import Link from "next/link"
import { updateEmployee, resetEmployeePassword, updateLeaveStatus } from "@/lib/actions"
import { timeAgo, formatDuration } from "@/lib/utils"
import EmployeeJiraIssues from "@/components/jira/EmployeeJiraIssues"

type Employee = {
  id: string; name: string; email: string; role: string; department: string
  avatar: string; status: string; phone: string; location: string
  joinDate: string; jiraAccountId: string; shiftHours: number; shiftStart: string
  currentFocus: string; focusSince: string
}
type TimeRecord = { id: string; date: string; clockIn: string; clockOut: string | null; hours: number }
type LeaveRequest = { id: string; type: string; startDate: string; endDate: string; days: number; reason: string; status: string; createdAt: string }
type Ticket = { id: string; title: string; description: string; priority: string; status: string; createdAt: string }
type Stats = { hoursToday: number; hoursWeek: number; hoursMonth: number; totalHours: number; activeSecondsWeek: number; totalDays: number; openTickets: number; pendingLeaves: number; approvedLeaveDays: number }
type DayBar = { label: string; date: string; hours: number }

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  online:  { label: "Online",  dot: "bg-green-500",  badge: "bg-green-500/15 text-green-400 border-green-500/30" },
  away:    { label: "Away",    dot: "bg-yellow-400", badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  offline: { label: "Offline", dot: "bg-white/30",   badge: "bg-white/10 text-white/60 border-white/15" },
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  low: "bg-white/10 text-white/60 border-white/15",
}
const TICKET_STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-400",
  "in-progress": "bg-[#512feb]/15 text-[#7c5af5]",
  resolved: "bg-green-500/15 text-green-400",
  closed: "bg-white/10 text-white/50",
}
const LEAVE_STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400",
  approved: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
}
const TAB_LABELS = ["Overview", "Time Tracking", "Leave", "Tickets", "Jira", "Activity", "Account"] as const
type Tab = typeof TAB_LABELS[number]

export default function EmployeeDetailClient({
  employee, timeRecords, leaves, tickets, stats, weekBars,
}: {
  employee: Employee
  timeRecords: TimeRecord[]
  leaves: LeaveRequest[]
  tickets: Ticket[]
  stats: Stats
  weekBars: DayBar[]
}) {
  const [tab, setTab] = useState<Tab>("Overview")
  const [pending, startTransition] = useTransition()

  const sc = STATUS_CONFIG[employee.status] ?? STATUS_CONFIG.offline
  const maxBar = Math.max(...weekBars.map(b => b.hours), 1)

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors">
        <ArrowLeft className="size-4" />
        Back to Employees
      </Link>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Avatar className="size-20 shrink-0">
              <AvatarFallback className="text-2xl bg-[#512feb]/15 text-[#7c5af5] font-bold">{employee.avatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white">{employee.name}</h2>
                  <p className="text-white/60 mt-0.5">{employee.role} · {employee.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border ${sc.badge}`}>
                    <span className={`size-1.5 rounded-full ${sc.dot} ${employee.status === "online" ? "animate-pulse" : ""}`} />
                    {sc.label}
                  </span>
                  <button onClick={() => setTab("Account")}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border border-white/10 text-white/60 hover:bg-white/8 transition-colors">
                    <Pencil className="size-3" /> Edit
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
                <span className="flex items-center gap-1.5 text-xs text-white/60"><Mail className="size-3.5 text-white/40" />{employee.email}</span>
                {employee.phone && <span className="flex items-center gap-1.5 text-xs text-white/60"><Phone className="size-3.5 text-white/40" />{employee.phone}</span>}
                {employee.location && <span className="flex items-center gap-1.5 text-xs text-white/60"><MapPin className="size-3.5 text-white/40" />{employee.location}</span>}
                <span className="flex items-center gap-1.5 text-xs text-white/60"><Calendar className="size-3.5 text-white/40" />Joined {format(new Date(employee.joinDate), "MMM yyyy")}</span>
              </div>

              {employee.currentFocus && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#512feb]/25 bg-[#512feb]/10 px-3.5 py-2.5">
                  <span className="text-base leading-none mt-0.5">🎯</span>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-[#7c5af5]/80 font-medium">Working on now</p>
                    <p className="text-sm text-white mt-0.5 break-words">{employee.currentFocus}</p>
                    {employee.focusSince && <p className="text-xs text-white/40 mt-0.5">since {timeAgo(employee.focusSince)}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TAB_LABELS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t ? "border-[#512feb] text-[#7c5af5]" : "border-transparent text-white/50 hover:text-white"
              }`}>
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "Overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Clock, label: "Today", value: `${stats.hoursToday}h`, sub: "", color: "text-[#7c5af5]", bg: "bg-[#512feb]/10" },
              {
                icon: TrendingUp, label: "This Week", value: `${Number(stats.hoursWeek).toFixed(1)}h`,
                sub: stats.hoursWeek > 0 ? `${formatDuration(stats.activeSecondsWeek)} active (${Math.min(100, Math.round((stats.activeSecondsWeek / 3600 / stats.hoursWeek) * 100))}%)` : "",
                color: "text-blue-400", bg: "bg-blue-500/10",
              },
              { icon: Calendar, label: "This Month", value: `${Number(stats.hoursMonth).toFixed(0)}h`, sub: "", color: "text-violet-400", bg: "bg-violet-500/10" },
              { icon: TicketCheck, label: "Total Hours", value: `${Number(stats.totalHours).toFixed(0)}h`, sub: "", color: "text-emerald-400", bg: "bg-emerald-500/10" },
            ].map(({ icon: Icon, label, value, sub, color, bg }) => (
              <Card key={label}>
                <CardContent className="pt-4">
                  <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                    <Icon className={`size-4 ${color}`} />
                  </div>
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-xs text-white/60 mt-0.5">{label}</p>
                  {sub && <p className="text-xs text-white/35 mt-0.5">{sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-sm font-semibold text-white">Hours Logged — Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="flex items-end gap-2 h-28">
                  {weekBars.map(bar => {
                    const pct = Math.round((bar.hours / maxBar) * 100)
                    return (
                      <div key={bar.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-white/70">{bar.hours > 0 ? `${bar.hours}h` : ""}</span>
                        <div className="w-full flex items-end" style={{ height: "72px" }}>
                          <div className={`w-full rounded-t-md ${bar.hours > 0 ? "bg-[#512feb]/60" : "bg-white/8"}`}
                            style={{ height: `${Math.max(pct, bar.hours > 0 ? 10 : 4)}%` }} />
                        </div>
                        <span className="text-xs text-white/40">{bar.label}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b border-white/10 pb-4">
                <CardTitle className="text-sm font-semibold text-white">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {[
                  { label: "Days Worked", value: `${stats.totalDays} days`, icon: Calendar, color: "text-[#7c5af5]" },
                  { label: "Open Tickets", value: stats.openTickets, icon: AlertCircle, color: "text-amber-400" },
                  { label: "Pending Leaves", value: stats.pendingLeaves, icon: Clock, color: "text-yellow-400" },
                  { label: "Leave Days Taken", value: `${stats.approvedLeaveDays}d approved`, icon: CheckCircle2, color: "text-green-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`size-3.5 ${color}`} />
                      <span className="text-xs text-white/70">{label}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{value}</span>
                  </div>
                ))}
                {employee.jiraAccountId && (
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-white/40">Jira ID: <span className="font-mono text-white/60">{employee.jiraAccountId}</span></p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-white">Recent Time Logs</CardTitle>
                <button onClick={() => setTab("Time Tracking")} className="text-xs text-[#7c5af5] hover:underline">View all</button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {timeRecords.length === 0 ? (
                <p className="text-xs text-white/40 py-4 text-center">No time records yet.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-2 text-left font-medium text-white/60">Date</th>
                      <th className="py-2 text-left font-medium text-white/60">Clock In</th>
                      <th className="py-2 text-left font-medium text-white/60">Clock Out</th>
                      <th className="py-2 text-right font-medium text-white/60">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeRecords.slice(0, 5).map(rec => (
                      <tr key={rec.id} className="border-b border-white/5 last:border-0">
                        <td className="py-2.5 font-medium text-white/80">{format(new Date(rec.date), "EEE, MMM d")}</td>
                        <td className="py-2.5 text-white/60">{rec.clockIn}</td>
                        <td className="py-2.5 text-white/60">{rec.clockOut ?? <span className="text-green-400 font-medium">Active</span>}</td>
                        <td className="py-2.5 text-right font-semibold text-white">{rec.hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TIME TRACKING ── */}
      {tab === "Time Tracking" && (
        <Card>
          <CardHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white">Full Time History</CardTitle>
              <span className="text-xs text-white/40">{timeRecords.length} records</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {timeRecords.length === 0 ? (
              <p className="text-xs text-white/40 py-8 text-center">No time records yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="py-2 text-left font-medium text-white/60">Date</th>
                    <th className="py-2 text-left font-medium text-white/60">Clock In</th>
                    <th className="py-2 text-left font-medium text-white/60">Clock Out</th>
                    <th className="py-2 text-right font-medium text-white/60">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {timeRecords.map(rec => (
                    <tr key={rec.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                      <td className="py-2.5 font-medium text-white/80">{format(new Date(rec.date), "EEE, MMM d yyyy")}</td>
                      <td className="py-2.5 text-white/60">{rec.clockIn}</td>
                      <td className="py-2.5 text-white/60">{rec.clockOut ?? <span className="text-green-400 font-medium">Active</span>}</td>
                      <td className="py-2.5 text-right font-semibold text-white">{Number(rec.hours).toFixed(1)}h</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-white/15">
                    <td colSpan={3} className="py-2.5 font-semibold text-white/80">Total</td>
                    <td className="py-2.5 text-right font-bold text-[#7c5af5]">
                      {Number(timeRecords.reduce((s, r) => s + r.hours, 0)).toFixed(1)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── LEAVE ── */}
      {tab === "Leave" && (
        <Card>
          <CardHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white">Leave History</CardTitle>
              <span className="text-xs text-white/40">{leaves.length} requests</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {leaves.length === 0 ? (
              <p className="text-xs text-white/40 py-8 text-center">No leave requests yet.</p>
            ) : (
              <div className="space-y-3 pt-2">
                {leaves.map(leave => (
                  <LeaveRow key={leave.id} leave={leave} employeeId={employee.id} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TICKETS ── */}
      {tab === "Tickets" && (
        <Card>
          <CardHeader className="border-b border-white/10 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-white">Support Tickets</CardTitle>
              <span className="text-xs text-white/40">{tickets.length} total</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {tickets.length === 0 ? (
              <p className="text-xs text-white/40 py-8 text-center">No tickets submitted yet.</p>
            ) : (
              <div className="space-y-2 pt-2">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="flex items-start justify-between gap-3 py-3 border-b border-white/5 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white">{ticket.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium border ${PRIORITY_COLOR[ticket.priority] ?? ""}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      {ticket.description && (
                        <p className="text-xs text-white/50 mt-1 line-clamp-2">{ticket.description}</p>
                      )}
                      <p className="text-xs text-white/40 mt-1">{format(new Date(ticket.createdAt), "MMM d, yyyy")}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${TICKET_STATUS_COLOR[ticket.status] ?? "bg-white/10 text-white/50"}`}>
                      {ticket.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── JIRA ── */}
      {tab === "Jira" && (
        <EmployeeJiraIssues employeeId={employee.id} />
      )}

      {/* ── ACTIVITY ── */}
      {tab === "Activity" && (
        <ActivityTab employeeId={employee.id} employeeName={employee.name} />
      )}

      {/* ── ACCOUNT ── */}
      {tab === "Account" && (
        <div className="space-y-5">
          <EditEmployeeForm employee={employee} />
          <PasswordResetCard employeeId={employee.id} />
        </div>
      )}
    </div>
  )
}

function LeaveRow({ leave, employeeId }: { leave: LeaveRequest; employeeId: string }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(leave.status)

  function handle(status: "approved" | "rejected") {
    startTransition(async () => {
      await updateLeaveStatus(leave.id, status)
      setCurrentStatus(status)
      setDone(true)
    })
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-white capitalize">{leave.type} leave</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${LEAVE_STATUS_COLOR[currentStatus] ?? ""}`}>
            {currentStatus}
          </span>
        </div>
        <p className="text-xs text-white/50 mt-0.5">
          {format(new Date(leave.startDate), "MMM d")} — {format(new Date(leave.endDate), "MMM d, yyyy")} · {leave.days} day{leave.days !== 1 ? "s" : ""}
        </p>
        {leave.reason && <p className="text-xs text-white/50 mt-1 italic">"{leave.reason}"</p>}
      </div>
      {currentStatus === "pending" && !done && (
        <div className="flex gap-1.5 shrink-0">
          <button disabled={pending} onClick={() => handle("approved")}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 disabled:opacity-50 transition-colors">
            <CheckCircle2 className="size-3" /> Approve
          </button>
          <button disabled={pending} onClick={() => handle("rejected")}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50 transition-colors">
            <XCircle className="size-3" /> Reject
          </button>
        </div>
      )}
    </div>
  )
}

function EditEmployeeForm({ employee }: { employee: Employee }) {
  const [form, setForm] = useState({
    name: employee.name,
    email: employee.email,
    role: employee.role,
    department: employee.department,
    phone: employee.phone ?? "",
    location: employee.location ?? "",
    jiraAccountId: employee.jiraAccountId ?? "",
    shiftHours: String(employee.shiftHours ?? 0),
    shiftStart: employee.shiftStart ?? "",
  })
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setSaved(false)
  }

  function save() {
    if (!form.name.trim() || !form.email.trim()) { setError("Name and email are required."); return }
    setError("")
    startTransition(async () => {
      await updateEmployee(employee.id, { ...form, shiftHours: parseFloat(form.shiftHours) || 0 })
      setSaved(true)
    })
  }

  return (
    <Card>
      <CardHeader className="border-b border-white/10 pb-4">
        <CardTitle className="text-sm font-semibold text-white">Employee Details</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {([
            { key: "name", label: "Full Name" },
            { key: "email", label: "Email Address" },
            { key: "role", label: "Job Title / Role" },
            { key: "department", label: "Department" },
            { key: "phone", label: "Phone Number" },
            { key: "location", label: "Location" },
            { key: "jiraAccountId", label: "Jira Account ID" },
            { key: "shiftStart", label: "Shift Start" },
            { key: "shiftHours", label: "Shift Length (hours)" },
          ] as { key: keyof typeof form; label: string }[]).map(({ key, label }) => (
            <div key={key} className={key === "jiraAccountId" ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-medium text-white/70 mb-1.5">
                {label}
                {key === "shiftStart" && <span className="text-white/30 font-normal ml-1">(for late detection)</span>}
                {key === "shiftHours" && <span className="text-white/30 font-normal ml-1">(e.g. 9 for a 5pm–2am shift · 0 = no auto-clockout)</span>}
              </label>
              <Input
                type={key === "shiftHours" ? "number" : key === "shiftStart" ? "time" : "text"}
                min={key === "shiftHours" ? "0" : undefined}
                max={key === "shiftHours" ? "24" : undefined}
                step={key === "shiftHours" ? "0.5" : undefined}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                className="h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
                placeholder={label}
              />
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}
        <div className="flex items-center gap-3 mt-5">
          <Button size="sm" onClick={save} disabled={pending} className="gap-1.5 bg-[#512feb] hover:bg-[#3f1fd4] text-white">
            <Save className="size-3.5" />
            {pending ? "Saving…" : "Save Changes"}
          </Button>
          {saved && <span className="text-xs text-green-400 font-medium flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Saved</span>}
        </div>
      </CardContent>
    </Card>
  )
}

function PasswordResetCard({ employeeId }: { employeeId: string }) {
  const [pw, setPw] = useState("")
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  function reset() {
    if (pw.length < 6) { setError("Password must be at least 6 characters."); return }
    setError("")
    startTransition(async () => {
      await resetEmployeePassword(employeeId, pw)
      setPw("")
      setDone(true)
    })
  }

  return (
    <Card>
      <CardHeader className="border-b border-white/10 pb-4">
        <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
          <KeyRound className="size-3.5 text-white/50" /> Password Reset
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <p className="text-xs text-white/60 mb-4">Set a new password for this employee's portal account.</p>
        <div className="flex items-end gap-3 max-w-sm">
          <div className="flex-1">
            <label className="block text-xs font-medium text-white/70 mb-1.5">New Password</label>
            <Input type="password" value={pw} onChange={e => { setPw(e.target.value); setDone(false); setError("") }}
              placeholder="Min. 6 characters" className="h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30" />
          </div>
          <Button size="sm" onClick={reset} disabled={pending || !pw} className="gap-1.5 shrink-0 bg-[#512feb] hover:bg-[#3f1fd4] text-white">
            <KeyRound className="size-3.5" />
            {pending ? "Setting…" : "Set Password"}
          </Button>
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        {done && <p className="text-xs text-green-400 font-medium mt-2 flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Password updated.</p>}
      </CardContent>
    </Card>
  )
}

type ActivityEntry = { id: string; action: string; detail: string; createdAt: string }

const ACTION_ICON: Record<string, { label: string; color: string }> = {
  clock_in:       { label: "Clocked in",       color: "text-green-400" },
  clock_out:      { label: "Clocked out",      color: "text-blue-400" },
  status_change:  { label: "Status changed",   color: "text-yellow-400" },
  leave_request:  { label: "Leave requested",  color: "text-purple-400" },
  ticket_created: { label: "Ticket opened",    color: "text-orange-400" },
}

function ActivityTab({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const [logs, setLogs] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/activity?employeeId=${employeeId}`)
      .then(r => r.json())
      .then(d => { setLogs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [employeeId])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="size-4 text-white/50" /> Activity Log
          </CardTitle>
          <a
            href={`/api/export/attendance?employeeId=${employeeId}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
          >
            <Download className="size-3.5" /> Export Timesheet
          </a>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-white/40 text-sm py-4">Loading…</p>
        ) : logs.length === 0 ? (
          <p className="text-white/40 text-sm py-4 text-center">No activity recorded yet.</p>
        ) : (
          <div className="space-y-0 divide-y divide-white/5">
            {logs.map(log => {
              const meta = ACTION_ICON[log.action]
              return (
                <div key={log.id} className="flex items-start gap-3 py-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${meta?.color ?? "text-white/70"}`}>
                      {meta?.label ?? log.action}
                    </p>
                    {log.detail && <p className="text-xs text-white/50 mt-0.5">{log.detail}</p>}
                  </div>
                  <p className="text-xs text-white/30 shrink-0">
                    {format(new Date(log.createdAt), "MMM d, HH:mm")}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
