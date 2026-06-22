"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, Clock, CheckSquare, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"

type Employee = { id: string; name: string; role: string; department: string; avatar: string; status: string }

type ReportData = {
  employee: Employee
  hoursToday: number
  clockedIn: boolean
  tasksByStatus: Record<string, number>
  tasks: { title: string; status: string; priority: string }[]
  recentLeaves: { type: string; status: string; startDate: string; endDate: string }[]
  openTickets: { title: string; status: string; priority: string }[]
  report: string
}

const STATUS_DOT: Record<string, string> = {
  online: "bg-green-400", away: "bg-yellow-400", offline: "bg-white/30"
}

function EmpAvatar({ name, avatar }: { name: string; avatar: string }) {
  if (avatar) return <img src={avatar} alt={name} className="size-10 rounded-full object-cover shrink-0" />
  return (
    <span className="size-10 rounded-full bg-[#512feb]/15 text-[#7c5af5] font-bold text-sm flex items-center justify-center shrink-0">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function EmployeeReportCard({ emp }: { emp: Employee }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ReportData | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState("")

  async function generate() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/reports/${emp.id}`)
      if (!res.ok) throw new Error(await res.text())
      const d = await res.json()
      setData(d)
      setExpanded(true)
    } catch (e: unknown) {
      setError(String(e).replace("Error: ", ""))
    } finally {
      setLoading(false)
    }
  }

  const taskDone = data?.tasksByStatus?.done ?? 0
  const taskTotal = Object.values(data?.tasksByStatus ?? {}).reduce((a, b) => a + b, 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0 pt-4 px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <EmpAvatar name={emp.name} avatar={emp.avatar} />
            <span className={`absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-[#131318] ${STATUS_DOT[emp.status] ?? "bg-white/30"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm">{emp.name}</p>
            <p className="text-xs text-white/60">{emp.role} · {emp.department}</p>
          </div>
          <div className="flex gap-2 items-center">
            {data && (
              <button onClick={() => setExpanded(v => !v)} className="text-white/40 hover:text-white/70">
                {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            )}
            <Button size="sm" onClick={generate} disabled={loading}
              className={data ? "bg-white/10 text-white/70 hover:bg-white/15 border-0" : "bg-[#512feb] hover:bg-[#3f1fd4] text-white"}>
              {loading
                ? <><Loader2 className="size-3.5 animate-spin mr-1.5" />Generating…</>
                : data
                  ? <><RefreshCw className="size-3.5 mr-1.5" />Regenerate</>
                  : <><Sparkles className="size-3.5 mr-1.5" />Generate Report</>
              }
            </Button>
          </div>
        </div>
      </CardHeader>

      {data && (
        <CardContent className="px-4 pb-4 pt-3">
          <div className="flex gap-4 py-2.5 border-y border-white/10 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <Clock className="size-3.5 text-white/40" />
              <span className="font-semibold text-white">{data.hoursToday.toFixed(1)}h</span> today
              {data.clockedIn && <span className="text-green-400 font-medium">• live</span>}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/70">
              <CheckSquare className="size-3.5 text-white/40" />
              <span className="font-semibold text-white">{taskDone}/{taskTotal}</span> tasks done
            </div>
            {data.openTickets.length > 0 && (
              <div className="text-xs text-white/70">
                <span className="font-semibold text-white">{data.openTickets.length}</span> open tickets
              </div>
            )}
          </div>

          {expanded && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#7c5af5]">
                <Sparkles className="size-3.5" /> AI Summary
              </div>
              <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap bg-white/5 rounded-xl px-4 py-3">
                {data.report}
              </div>
            </div>
          )}

          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </CardContent>
      )}

      {error && !data && (
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-xs text-red-400">{error}</p>
        </CardContent>
      )}
    </Card>
  )
}

export default function ReportsClient({ employees }: { employees: Employee[] }) {
  if (employees.length === 0) {
    return (
      <div className="text-center py-16 text-white/50 text-sm">
        No employees to report on. Add employees first.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-white/70 bg-[#512feb]/8 border border-[#512feb]/20 rounded-xl px-4 py-3">
        <Sparkles className="size-4 text-[#7c5af5] shrink-0" />
        Reports are generated on-demand using AI. Each report analyses today's time tracking, assigned tasks, leave requests, and open tickets.
      </div>
      <div className="space-y-3">
        {employees.map(emp => (
          <EmployeeReportCard key={emp.id} emp={emp} />
        ))}
      </div>
    </div>
  )
}
