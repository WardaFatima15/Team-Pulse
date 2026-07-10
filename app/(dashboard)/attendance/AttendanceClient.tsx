"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Download } from "lucide-react"

type Employee = { id: string; name: string; role: string; department: string; avatar: string }
type TimeEntry = { employeeId: string; date: string; clockIn: string; clockOut: string | null; hours: number }

type Props = {
  employees: Employee[]
  records: TimeEntry[]
  initialMode: "week" | "month"
  initialDate: string
}

function getWeekDays(dateStr: string) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd.toISOString().slice(0, 10)
  })
}

function getMonthDays(dateStr: string) {
  const [y, m] = dateStr.split("-").map(Number)
  const days: string[] = []
  const last = new Date(y, m, 0).getDate()
  for (let d = 1; d <= last; d++) days.push(`${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)
  return days
}

function fmt(dateStr: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", opts)
}

function EmpAvatar({ emp }: { emp: Employee }) {
  return (
    <span className="size-7 rounded-full bg-[#512feb]/15 text-[#7c5af5] font-semibold text-xs flex items-center justify-center shrink-0">
      {emp.avatar || emp.name.charAt(0)}
    </span>
  )
}

export default function AttendanceClient({ employees, records: initialRecords, initialMode, initialDate }: Props) {
  const [mode, setMode] = useState<"week" | "month">(initialMode)
  const [anchor, setAnchor] = useState(initialDate)
  const [records, setRecords] = useState<TimeEntry[]>(initialRecords)
  const [loading, setLoading] = useState(false)

  const days = mode === "week" ? getWeekDays(anchor) : getMonthDays(anchor)

  async function navigate(dir: 1 | -1) {
    const d = new Date(anchor)
    if (mode === "week") d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    const next = d.toISOString().slice(0, 10)
    setAnchor(next)
    setLoading(true)
    const res = await fetch(`/api/attendance?mode=${mode}&date=${next}`)
    const data = await res.json()
    setRecords(data)
    setLoading(false)
  }

  async function switchMode(m: "week" | "month") {
    setMode(m)
    setLoading(true)
    const res = await fetch(`/api/attendance?mode=${m}&date=${anchor}`)
    const data = await res.json()
    setRecords(data)
    setLoading(false)
  }

  const byKey: { [k: string]: { hours: number; clockIn: string; clockOut: string | null } } = {}
  for (const r of records) {
    const key = `${r.employeeId}:${r.date}`
    if (!byKey[key] || r.hours > (byKey[key]?.hours ?? 0)) byKey[key] = r
  }

  const today = new Date().toISOString().slice(0, 10)

  const totalPresent = new Set(records.map(r => `${r.employeeId}:${r.date}`)).size
  const totalHours = records.reduce((s, r) => s + r.hours, 0)
  const workingDays = days.filter(d => new Date(d + "T12:00:00").getDay() !== 0 && new Date(d + "T12:00:00").getDay() !== 6).length

  const periodLabel = mode === "week"
    ? `${fmt(days[0], { month: "short", day: "numeric" })} – ${fmt(days[6], { month: "short", day: "numeric", year: "numeric" })}`
    : fmt(anchor + "-01", { month: "long", year: "numeric" })

  const isManyDays = days.length > 14

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white/8 rounded-xl p-1">
          {(["week", "month"] as const).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${mode === m ? "bg-[#0d0d12] shadow-sm text-white" : "text-white/50 hover:text-white/80"}`}>
              {m}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)}
            className="size-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/8 transition-colors">
            <ChevronLeft className="size-4 text-white/60" />
          </button>
          <span className="text-sm font-semibold text-white min-w-[180px] text-center">{periodLabel}</span>
          <button onClick={() => navigate(1)}
            className="size-8 rounded-lg border border-white/10 flex items-center justify-center hover:bg-white/8 transition-colors">
            <ChevronRight className="size-4 text-white/60" />
          </button>
        </div>

        <button className="text-xs text-[#7c5af5] hover:underline ml-1"
          onClick={() => { setAnchor(today); switchMode(mode) }}>
          Today
        </button>

        <a
          href={`/api/export/attendance?from=${days[0]}&to=${days[days.length - 1]}`}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-colors"
        >
          <Download className="size-3.5" /> Export CSV
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Present Days", value: totalPresent, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Total Hours Logged", value: totalHours.toFixed(1) + "h", color: "text-[#7c5af5]", bg: "bg-[#512feb]/10" },
          { label: "Working Days", value: workingDays, color: "text-white/80", bg: "bg-white/8" },
          { label: "Avg Hours/Day", value: totalPresent ? (totalHours / totalPresent).toFixed(1) + "h" : "—", color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map(s => (
          <Card key={s.label}><CardContent className="pt-3 pb-3">
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/60 mt-0.5">{s.label}</div>
          </CardContent></Card>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-xs border-collapse" style={{ minWidth: Math.max(600, 120 + days.length * (isManyDays ? 28 : 52)) }}>
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="text-left px-4 py-3 font-semibold text-white/70 sticky left-0 bg-[#0d0d12] z-10 min-w-[160px]">Employee</th>
              {days.map(d => {
                const isToday = d === today
                const isWeekend = new Date(d + "T12:00:00").getDay() === 0 || new Date(d + "T12:00:00").getDay() === 6
                return (
                  <th key={d} className={`text-center font-medium py-3 px-1 ${isToday ? "text-[#7c5af5]" : isWeekend ? "text-white/20" : "text-white/50"}`}>
                    <div>{fmt(d, { weekday: "short" }).slice(0, 1)}</div>
                    <div className={`text-[10px] ${isToday ? "bg-[#512feb] text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto" : ""}`}>
                      {new Date(d + "T12:00:00").getDate()}
                    </div>
                  </th>
                )
              })}
              <th className="text-center px-3 py-3 font-semibold text-white/70 sticky right-0 bg-[#0d0d12]">Total</th>
            </tr>
          </thead>
          <tbody className={loading ? "opacity-40" : ""}>
            {employees.map((emp, idx) => {
              const empRecords = days.map(d => byKey[`${emp.id}:${d}`] ?? null)
              const totalEmpHours = empRecords.reduce((s, r) => s + (r?.hours ?? 0), 0)
              const presentDays = empRecords.filter(Boolean).length

              return (
                <tr key={emp.id} className={`border-b border-white/5 ${idx % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"}`}>
                  <td className={`px-4 py-2.5 sticky left-0 z-10 ${idx % 2 === 0 ? "bg-[#0d0d12]" : "bg-[#141419]"}`}>
                    <div className="flex items-center gap-2.5">
                      <EmpAvatar emp={emp} />
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{emp.name}</p>
                        <p className="text-white/50 text-[10px] truncate">{emp.role}</p>
                      </div>
                    </div>
                  </td>
                  {empRecords.map((r, i) => {
                    const d = days[i]
                    const isWeekend = new Date(d + "T12:00:00").getDay() === 0 || new Date(d + "T12:00:00").getDay() === 6
                    const isFuture = d > today
                    return (
                      <td key={d} className="text-center py-2 px-1">
                        {isWeekend ? (
                          <span className="text-white/15">—</span>
                        ) : isFuture ? (
                          <span className="text-white/15">·</span>
                        ) : r ? (
                          <div className="flex flex-col items-center gap-0.5" title={`${r.clockIn.slice(11, 16)} – ${r.clockOut?.slice(11, 16) ?? "ongoing"} (${r.hours.toFixed(1)}h)`}>
                            <CheckCircle2 className="size-3.5 text-green-400" />
                            {!isManyDays && <span className="text-[9px] text-white/50">{r.hours.toFixed(1)}h</span>}
                          </div>
                        ) : (
                          <XCircle className="size-3.5 text-red-500/40 mx-auto" />
                        )}
                      </td>
                    )
                  })}
                  <td className="text-center px-3 py-2 sticky right-0 bg-inherit font-semibold text-white/80">
                    <div>{presentDays}d</div>
                    <div className="text-[10px] text-white/50 font-normal">{totalEmpHours.toFixed(1)}h</div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {employees.length === 0 && (
        <div className="text-center py-12 text-white/50 text-sm">No employees yet.</div>
      )}
    </div>
  )
}
