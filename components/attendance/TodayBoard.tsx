import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import LiveTimer from "@/components/LiveTimer"
import { formatDuration } from "@/lib/utils"
import { CheckCircle2, Clock, PlaneTakeoff, AlarmClockOff, CircleDashed } from "lucide-react"

export type TodayState = "working" | "done" | "late" | "absent" | "on_leave"

export type TodayRow = {
  id: string
  name: string
  avatar: string
  role: string
  state: TodayState
  clockIn: string | null
  openSince: string | null
  hoursToday: number
  activeSeconds: number
  expected: number
}

const STATE_CONFIG: Record<TodayState, { label: string; badge: string; icon: typeof Clock }> = {
  working:  { label: "Working",  badge: "bg-green-500/15 text-green-400 border-green-500/30",  icon: Clock },
  done:     { label: "Done",     badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",      icon: CheckCircle2 },
  late:     { label: "Late",     badge: "bg-orange-500/15 text-orange-400 border-orange-500/30", icon: AlarmClockOff },
  absent:   { label: "Absent",   badge: "bg-red-500/15 text-red-400 border-red-500/30",         icon: CircleDashed },
  on_leave: { label: "On Leave", badge: "bg-purple-500/15 text-purple-400 border-purple-500/30", icon: PlaneTakeoff },
}

const STATE_ORDER: TodayState[] = ["working", "late", "absent", "on_leave", "done"]

export default function TodayBoard({ rows }: { rows: TodayRow[] }) {
  const counts = STATE_ORDER.reduce<Record<TodayState, number>>((acc, s) => {
    acc[s] = rows.filter(r => r.state === s).length
    return acc
  }, {} as Record<TodayState, number>)
  const totalHoursToday = rows.reduce((s, r) => s + r.hoursToday, 0)

  const sorted = [...rows].sort((a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {STATE_ORDER.map(s => {
          const cfg = STATE_CONFIG[s]
          const Icon = cfg.icon
          return (
            <Card key={s}>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className={`size-8 rounded-lg flex items-center justify-center border ${cfg.badge}`}>
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white leading-none">{counts[s]}</p>
                  <p className="text-xs text-white/50 mt-0.5">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="pt-4 pb-2 divide-y divide-white/5">
          {sorted.map(row => {
            const cfg = STATE_CONFIG[row.state]
            return (
              <div key={row.id} className="flex items-center gap-3 py-2.5">
                <Avatar className="size-8 shrink-0">
                  <AvatarFallback className="text-xs bg-[#512feb]/15 text-[#7c5af5] font-semibold">{row.avatar}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{row.name}</p>
                  <p className="text-xs text-white/40 truncate">{row.role}</p>
                </div>
                <span className={`hidden sm:inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <div className="text-right shrink-0 w-28">
                  {row.state === "working" && row.openSince ? (
                    <p className="text-sm font-semibold text-green-400 tabular-nums"><LiveTimer since={row.openSince} /></p>
                  ) : row.hoursToday > 0 ? (
                    <p className="text-sm font-semibold text-white tabular-nums">{row.hoursToday.toFixed(1)}h</p>
                  ) : (
                    <p className="text-sm text-white/30">—</p>
                  )}
                  {row.expected > 0 && (row.state === "working" || row.state === "done") && (
                    <p className="text-xs text-white/35">of {row.expected}h</p>
                  )}
                  {row.activeSeconds > 0 && (row.state === "working" || row.state === "done") && (
                    <p className="text-xs text-white/35">{formatDuration(row.activeSeconds)} active</p>
                  )}
                  {row.clockIn && (row.state === "working" || row.state === "done" || row.state === "late") && (
                    <p className="text-xs text-white/35">in {row.clockIn}</p>
                  )}
                </div>
              </div>
            )
          })}
          {sorted.length === 0 && (
            <p className="text-center text-white/40 text-sm py-8">No employees yet.</p>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-white/40">Total hours logged today: <span className="text-white font-medium">{totalHoursToday.toFixed(1)}h</span></p>
    </div>
  )
}
