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
  sick: "bg-red-100 text-red-700", vacation: "bg-blue-100 text-blue-700",
  personal: "bg-purple-100 text-purple-700", maternity: "bg-pink-100 text-pink-700", other: "bg-slate-100 text-slate-600",
}
const statusBadge: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", approved: "bg-green-100 text-green-700", rejected: "bg-red-100 text-red-700",
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
        {[{ label: "Pending", key: "pending", color: "text-yellow-600", bg: "bg-yellow-50", icon: Clock },
          { label: "Approved", key: "approved", color: "text-green-600", bg: "bg-green-50", icon: Check },
          { label: "Rejected", key: "rejected", color: "text-red-500", bg: "bg-red-50", icon: X }
        ].map(({ label, key, color, bg, icon: Icon }) => (
          <Card key={key}>
            <CardContent className="pt-4">
              <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`size-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{counts[key as keyof typeof counts]}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        {(["all", "pending", "approved", "rejected"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
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
                    <AvatarFallback className="text-sm bg-indigo-100 text-indigo-700 font-medium">{emp?.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{emp?.name}</p>
                        <p className="text-xs text-slate-400">{emp?.role} · {emp?.department}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${leaveTypeColors[leave.type] ?? "bg-slate-100 text-slate-600"}`}>{leave.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge[leave.status] ?? "bg-slate-100 text-slate-600"}`}>{leave.status}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                      <span className="flex items-center gap-1"><Calendar className="size-3 text-slate-400" />{format(new Date(leave.startDate), "MMM d")} — {format(new Date(leave.endDate), "MMM d, yyyy")}</span>
                      <span className="font-medium">{leave.days} day{leave.days !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 italic">"{leave.reason}"</p>
                  </div>
                  {leave.status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => handleStatus(leave.id, "approved")} disabled={pending} className="h-7 px-2.5 bg-green-600 hover:bg-green-700 text-white text-xs"><Check className="size-3 mr-1" />Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => handleStatus(leave.id, "rejected")} disabled={pending} className="h-7 px-2.5 text-red-600 border-red-200 hover:bg-red-50 text-xs"><X className="size-3 mr-1" />Reject</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No leave requests in this category.</div>}
      </div>
    </div>
  )
}
