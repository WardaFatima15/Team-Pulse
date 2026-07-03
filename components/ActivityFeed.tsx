import { timeAgo } from "@/lib/utils"
import { LogIn, LogOut, Target, CalendarDays, Ticket, MessageSquare, Activity } from "lucide-react"

export type ActivityItem = {
  id: string
  employeeName: string
  action: string
  detail: string
  createdAt: string
}

const config: Record<string, { icon: typeof Activity; color: string; verb: string }> = {
  clock_in:      { icon: LogIn,          color: "text-green-400",  verb: "clocked in" },
  clock_out:     { icon: LogOut,         color: "text-red-400",    verb: "clocked out" },
  focus:         { icon: Target,         color: "text-[#7c5af5]",  verb: "is now working on" },
  leave_request: { icon: CalendarDays,   color: "text-amber-400",  verb: "requested leave" },
  ticket_created:{ icon: Ticket,         color: "text-blue-400",   verb: "opened a ticket" },
  status_change: { icon: Activity,       color: "text-white/50",   verb: "changed status" },
}

export default function ActivityFeed({ items, showNames = true, empty = "No recent activity." }: {
  items: ActivityItem[]
  showNames?: boolean
  empty?: string
}) {
  if (items.length === 0) {
    return <p className="text-xs text-white/40 py-2">{empty}</p>
  }
  return (
    <ol className="relative space-y-3.5">
      {items.map(it => {
        const c = config[it.action] ?? { icon: Activity, color: "text-white/50", verb: it.action.replace(/_/g, " ") }
        const Icon = c.icon
        return (
          <li key={it.id} className="flex gap-2.5">
            <div className={`mt-0.5 size-6 shrink-0 rounded-full bg-white/5 flex items-center justify-center ${c.color}`}>
              <Icon className="size-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/80 leading-snug">
                {showNames && <span className="font-semibold text-white">{it.employeeName}</span>}{showNames && " "}
                <span className="text-white/50">{c.verb}</span>
                {it.detail && <span className="text-white/80"> {it.action === "focus" ? `"${it.detail}"` : it.detail}</span>}
              </p>
              <p className="text-xs text-white/35 mt-0.5">{timeAgo(it.createdAt)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
