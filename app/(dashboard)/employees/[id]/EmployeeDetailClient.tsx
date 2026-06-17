"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, TicketCheck, KeyRound, Save, TrendingUp, CheckCircle2, AlertCircle, XCircle, Pencil } from "lucide-react"
import Link from "next/link"
import { updateEmployee, updateEmployeeStatus, resetEmployeePassword, updateLeaveStatus } from "@/lib/actions"

type Employee = {
  id: string; name: string; email: string; role: string; department: string
  avatar: string; status: string; phone: string; location: string
  joinDate: string; jiraAccountId: string
}
type TimeRecord = { id: string; date: string; clockIn: string; clockOut: string | null; hours: number }
type LeaveRequest = { id: string; type: string; startDate: string; endDate: string; days: number; reason: string; status: string; createdAt: string }
type Ticket = { id: string; title: string; description: string; priority: string; status: string; createdAt: string }
type Stats = { hoursToday: number; hoursWeek: number; hoursMonth: number; totalHours: number; totalDays: number; openTickets: number; pendingLeaves: number; approvedLeaveDays: number }
type DayBar = { label: string; date: string; hours: number }

const STATUS_OPTIONS = [
  { value: "online", label: "Online", dot: "bg-green-500", badge: "bg-green-100 text-green-700 border-green-200" },
  { value: "away", label: "Away", dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "offline", label: "Offline", dot: "bg-slate-300", badge: "bg-slate-100 text-slate-500 border-slate-200" },
]

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  low: "bg-slate-100 text-slate-500 border-slate-200",
}
const TICKET_STATUS_COLOR: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  "in-progress": "bg-indigo-100 text-indigo-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-500",
}
const LEAVE_STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
}
const TAB_LABELS = ["Overview", "Time Tracking", "Leave", "Tickets", "Account"] as const
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
  const [statusOpen, setStatusOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const sc = STATUS_OPTIONS.find(s => s.value === employee.status) ?? STATUS_OPTIONS[2]
  const maxBar = Math.max(...weekBars.map(b => b.hours), 1)

  function changeStatus(val: string) {
    setStatusOpen(false)
    startTransition(() => updateEmployeeStatus(employee.id, val as "online" | "away" | "offline"))
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="size-4" />
        Back to Employees
      </Link>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <Avatar className="size-20 shrink-0">
              <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-700 font-bold">{employee.avatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{employee.name}</h2>
                  <p className="text-slate-500 mt-0.5">{employee.role} · {employee.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Status toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setStatusOpen(v => !v)}
                      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${sc.badge}`}
                    >
                      <span className={`size-1.5 rounded-full ${sc.dot}`} />
                      {sc.label}
                      <svg className="size-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {statusOpen && (
                      <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden min-w-[120px]">
                        {STATUS_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => changeStatus(opt.value)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors">
                            <span className={`size-2 rounded-full ${opt.dot}`} />
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setTab("Account")}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    <Pencil className="size-3" /> Edit
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><Mail className="size-3.5 text-slate-400" />{employee.email}</span>
                {employee.phone && <span className="flex items-center gap-1.5 text-xs text-slate-500"><Phone className="size-3.5 text-slate-400" />{employee.phone}</span>}
                {employee.location && <span className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="size-3.5 text-slate-400" />{employee.location}</span>}
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><Calendar className="size-3.5 text-slate-400" />Joined {format(new Date(employee.joinDate), "MMM yyyy")}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TAB_LABELS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-900"
              }`}>
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────── */}
      {tab === "Overview" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Clock, label: "Today", value: `${stats.hoursToday}h`, color: "text-indigo-600", bg: "bg-indigo-50" },
              { icon: TrendingUp, label: "This Week", value: `${Number(stats.hoursWeek).toFixed(1)}h`, color: "text-blue-600", bg: "bg-blue-50" },
              { icon: Calendar, label: "This Month", value: `${Number(stats.hoursMonth).toFixed(0)}h`, color: "text-violet-600", bg: "bg-violet-50" },
              { icon: TicketCheck, label: "Total Hours", value: `${Number(stats.totalHours).toFixed(0)}h`, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <Card key={label}>
                <CardContent className="pt-4">
                  <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                    <Icon className={`size-4 ${color}`} />
                  </div>
                  <p className="text-xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Weekly chart */}
            <Card className="lg:col-span-2">
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-semibold">Hours Logged — Last 7 Days</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="flex items-end gap-2 h-28">
                  {weekBars.map(bar => {
                    const pct = Math.round((bar.hours / maxBar) * 100)
                    return (
                      <div key={bar.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium text-slate-600">{bar.hours > 0 ? `${bar.hours}h` : ""}</span>
                        <div className="w-full flex items-end" style={{ height: "72px" }}>
                          <div
                            className={`w-full rounded-t-md ${bar.hours > 0 ? "bg-indigo-400" : "bg-slate-100"}`}
                            style={{ height: `${Math.max(pct, bar.hours > 0 ? 10 : 4)}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-400">{bar.label}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick stats */}
            <Card>
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-semibold">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {[
                  { label: "Days Worked", value: `${stats.totalDays} days`, icon: Calendar, color: "text-indigo-500" },
                  { label: "Open Tickets", value: stats.openTickets, icon: AlertCircle, color: "text-amber-500" },
                  { label: "Pending Leaves", value: stats.pendingLeaves, icon: Clock, color: "text-yellow-500" },
                  { label: "Leave Days Taken", value: `${stats.approvedLeaveDays}d approved`, icon: CheckCircle2, color: "text-green-500" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`size-3.5 ${color}`} />
                      <span className="text-xs text-slate-600">{label}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-900">{value}</span>
                  </div>
                ))}
                {employee.jiraAccountId && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400">Jira ID: <span className="font-mono text-slate-600">{employee.jiraAccountId}</span></p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent time logs */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Recent Time Logs</CardTitle>
                <button onClick={() => setTab("Time Tracking")} className="text-xs text-indigo-600 hover:underline">View all</button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {timeRecords.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No time records yet.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-2 text-left font-medium text-slate-500">Date</th>
                      <th className="py-2 text-left font-medium text-slate-500">Clock In</th>
                      <th className="py-2 text-left font-medium text-slate-500">Clock Out</th>
                      <th className="py-2 text-right font-medium text-slate-500">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeRecords.slice(0, 5).map(rec => (
                      <tr key={rec.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 font-medium text-slate-800">{format(new Date(rec.date), "EEE, MMM d")}</td>
                        <td className="py-2.5 text-slate-500">{rec.clockIn}</td>
                        <td className="py-2.5 text-slate-500">{rec.clockOut ?? <span className="text-green-600 font-medium">Active</span>}</td>
                        <td className="py-2.5 text-right font-semibold text-slate-900">{rec.hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── TIME TRACKING ─────────────────────────────────── */}
      {tab === "Time Tracking" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Full Time History</CardTitle>
              <span className="text-xs text-slate-400">{timeRecords.length} records</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {timeRecords.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No time records yet.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-2 text-left font-medium text-slate-500">Date</th>
                    <th className="py-2 text-left font-medium text-slate-500">Clock In</th>
                    <th className="py-2 text-left font-medium text-slate-500">Clock Out</th>
                    <th className="py-2 text-right font-medium text-slate-500">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {timeRecords.map(rec => (
                    <tr key={rec.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="py-2.5 font-medium text-slate-800">{format(new Date(rec.date), "EEE, MMM d yyyy")}</td>
                      <td className="py-2.5 text-slate-600">{rec.clockIn}</td>
                      <td className="py-2.5 text-slate-600">{rec.clockOut ?? <span className="text-green-600 font-medium">Active</span>}</td>
                      <td className="py-2.5 text-right font-semibold text-slate-900">{Number(rec.hours).toFixed(1)}h</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="py-2.5 font-semibold text-slate-700">Total</td>
                    <td className="py-2.5 text-right font-bold text-indigo-600">
                      {Number(timeRecords.reduce((s, r) => s + r.hours, 0)).toFixed(1)}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── LEAVE ─────────────────────────────────────────── */}
      {tab === "Leave" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Leave History</CardTitle>
              <span className="text-xs text-slate-400">{leaves.length} requests</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {leaves.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No leave requests yet.</p>
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

      {/* ── TICKETS ───────────────────────────────────────── */}
      {tab === "Tickets" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Support Tickets</CardTitle>
              <span className="text-xs text-slate-400">{tickets.length} total</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {tickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">No tickets submitted yet.</p>
            ) : (
              <div className="space-y-2 pt-2">
                {tickets.map(ticket => (
                  <div key={ticket.id} className="flex items-start justify-between gap-3 py-3 border-b border-slate-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-slate-900">{ticket.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium border ${PRIORITY_COLOR[ticket.priority] ?? ""}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      {ticket.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ticket.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">{format(new Date(ticket.createdAt), "MMM d, yyyy")}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${TICKET_STATUS_COLOR[ticket.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {ticket.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── ACCOUNT ───────────────────────────────────────── */}
      {tab === "Account" && (
        <div className="space-y-5">
          <EditEmployeeForm employee={employee} />
          <PasswordResetCard employeeId={employee.id} />
        </div>
      )}
    </div>
  )
}

/* ── Leave row with inline approve/reject ──────────────── */
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
    <div className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900 capitalize">{leave.type} leave</p>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${LEAVE_STATUS_COLOR[currentStatus] ?? ""}`}>
            {currentStatus}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {format(new Date(leave.startDate), "MMM d")} — {format(new Date(leave.endDate), "MMM d, yyyy")} · {leave.days} day{leave.days !== 1 ? "s" : ""}
        </p>
        {leave.reason && <p className="text-xs text-slate-500 mt-1 italic">"{leave.reason}"</p>}
      </div>
      {currentStatus === "pending" && !done && (
        <div className="flex gap-1.5 shrink-0">
          <button disabled={pending} onClick={() => handle("approved")}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50 transition-colors">
            <CheckCircle2 className="size-3" /> Approve
          </button>
          <button disabled={pending} onClick={() => handle("rejected")}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors">
            <XCircle className="size-3" /> Reject
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Edit employee form ────────────────────────────────── */
function EditEmployeeForm({ employee }: { employee: Employee }) {
  const [form, setForm] = useState({
    name: employee.name,
    email: employee.email,
    role: employee.role,
    department: employee.department,
    phone: employee.phone ?? "",
    location: employee.location ?? "",
    jiraAccountId: employee.jiraAccountId ?? "",
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
      await updateEmployee(employee.id, form)
      setSaved(true)
    })
  }

  return (
    <Card>
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-sm font-semibold">Employee Details</CardTitle>
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
          ] as { key: keyof typeof form; label: string }[]).map(({ key, label }) => (
            <div key={key} className={key === "jiraAccountId" ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
              <Input
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                className="h-9 text-sm"
                placeholder={label}
              />
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        <div className="flex items-center gap-3 mt-5">
          <Button size="sm" onClick={save} disabled={pending} className="gap-1.5">
            <Save className="size-3.5" />
            {pending ? "Saving…" : "Save Changes"}
          </Button>
          {saved && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Saved</span>}
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Password reset card ───────────────────────────────── */
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
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <KeyRound className="size-3.5 text-slate-400" /> Password Reset
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <p className="text-xs text-slate-500 mb-4">Set a new password for this employee's account. The employee will use it on their next login.</p>
        <div className="flex items-end gap-3 max-w-sm">
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-600 mb-1.5">New Password</label>
            <Input
              type="password"
              value={pw}
              onChange={e => { setPw(e.target.value); setDone(false); setError("") }}
              placeholder="Min. 6 characters"
              className="h-9 text-sm"
            />
          </div>
          <Button size="sm" onClick={reset} disabled={pending || !pw} className="gap-1.5 shrink-0">
            <KeyRound className="size-3.5" />
            {pending ? "Setting…" : "Set Password"}
          </Button>
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        {done && <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1"><CheckCircle2 className="size-3.5" /> Password updated successfully.</p>}
      </CardContent>
    </Card>
  )
}
