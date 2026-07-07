"use client"

import { useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Check, X, Calendar, Clock } from "lucide-react"
import { format } from "date-fns"
import { updateLeaveStatus } from "@/lib/actions"
import { useRouter } from "next/navigation"
import { useState } from "react"

type Employee = { id: string; name: string; avatar: string; role: string; department: string }
type LeaveRequest = { id: string; employeeId: string; type: string; startDate: string; endDate: string; days: number; reason: string; status: string; appliedOn: string }

const leaveTypeColors: Record<string, string> = {
  sick: "bg-red-500/15 text-red-400", vacation: "bg-blue-500/15 text-blue-400",
  personal: "bg-purple-500/15 text-purple-400", maternity: "bg-pink-500/15 text-pink-400", other: "bg-white/10 text-white/60",
}
const statusBadge: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-400", approved: "bg-green-500/15 text-green-400", rejected: "bg-red-500/15 text-red-400",
}

export default function LeavesClient({ leaves, employees }: { leaves: LeaveRequest[]; employees: Employee[] }) {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleStatus(id: string, status: "approved" | "rejected") {
    startTransition(async () => {
      await updateLeaveStatus(id, status)
      router.refresh()
    })
  }

  const filtered = filter === "all" ? leaves : leaves.filter(l => l.status === filter)
  const counts = { pending: leaves.filter(l => l.status === "pending").length, approved: leaves.filter(l => l.status === "approved").length, rejected: leaves.filter(l => l.status === "rejected").length }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="grid grid-cols-3 gap-4">
        {[{ label: "Pending", key: "pending", color: "text-yellow-400", bg: "bg-yellow-500/10", icon: Clock },
          { label: "Approved", key: "approved", color: "text-green-400", bg: "bg-green-500/10", icon: Check },
          { label: "Rejected", key: "rejected", color: "text-red-400", bg: "bg-red-500/10", icon: X }
        ].map(({ label, key, color, bg, icon: Icon }) => (
          <Card key={key}>
            <CardContent className="pt-4">
              <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`size-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{counts[key as keyof typeof counts]}</p>
              <p className="text-xs text-white/60 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-[#512feb] text-white" : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(leave => {
          const emp = employees.find(e => e.id === leave.employeeId)
          return (
            <Card key={leave.id}>
              <CardContent className="py-4">
                <div className="flex items-start gap-4">
                  <Avatar className="size-9 shrink-0">
                    <AvatarFallback className="text-sm bg-[#512feb]/15 text-[#7c5af5] font-medium">{emp?.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-white text-sm">{emp?.name}</p>
                        <p className="text-xs text-white/60">{emp?.role} · {emp?.department}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${leaveTypeColors[leave.type] ?? "bg-white/10 text-white/60"}`}>{leave.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge[leave.status] ?? "bg-white/10 text-white/60"}`}>{leave.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/70">
                      <span className="flex items-center gap-1"><Calendar className="size-3 text-white/40" />{format(new Date(leave.startDate), "MMM d")} — {format(new Date(leave.endDate), "MMM d, yyyy")}</span>
                      <span className="font-medium">{leave.days} day{leave.days !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-xs text-white/60 mt-1.5 italic">&quot;{leave.reason}&quot;</p>
                  </div>
                  {leave.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => handleStatus(leave.id, "approved")} disabled={pending} className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-white text-xs"><Check className="size-3 mr-1" />Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatus(leave.id, "rejected")} disabled={pending} className="h-7 px-2.5 text-red-400 border-red-500/30 hover:bg-red-500/10 text-xs"><X className="size-3 mr-1" />Reject</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-white/50 text-sm">No leave requests in this category.</div>}
      </div>
    </div>
  )
}
