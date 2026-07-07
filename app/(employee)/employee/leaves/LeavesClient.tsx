"use client"

import { useState, useTransition } from "react"
import { submitLeave } from "@/lib/employee-actions"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Calendar } from "lucide-react"
import { format } from "date-fns"

type LeaveRequest = {
  id: string; type: string; startDate: string; endDate: string
  days: number; reason: string; status: string; appliedOn: string
}

const statusCls: Record<string, string> = {
  pending:  "bg-yellow-500/15 text-yellow-400",
  approved: "bg-green-500/15 text-green-400",
  rejected: "bg-red-500/15 text-red-400",
}

export default function LeavesClient({ leaves }: { leaves: LeaveRequest[] }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: "annual", startDate: "", endDate: "", reason: "" })
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit() {
    if (!form.startDate || !form.endDate || !form.reason.trim()) return
    startTransition(async () => {
      await submitLeave(form)
      setForm({ type: "annual", startDate: "", endDate: "", reason: "" })
      setShowForm(false)
      router.refresh()
    })
  }

  const counts = {
    total: leaves.length,
    pending: leaves.filter(l => l.status === "pending").length,
    approved: leaves.filter(l => l.status === "approved").length,
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">My Leave Requests</h1>
          <p className="text-sm text-white/60 mt-0.5">{counts.total} total · {counts.pending} pending · {counts.approved} approved</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white h-9" size="sm">
          <Plus className="size-3.5 mr-1.5" /> New Request
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#512feb]/30">
          <CardContent className="pt-5 space-y-3">
            <p className="text-sm font-semibold text-white">New Leave Request</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Leave type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#512feb]/50">
                  {["annual", "sick", "personal", "unpaid"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div />
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">Start date</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="h-9 text-sm bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1">End date</label>
                <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="h-9 text-sm bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">Reason</label>
              <textarea placeholder="Briefly explain the reason for your leave..." value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#512feb]/50 placeholder:text-white/30" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8 border-white/10 text-white/70 hover:bg-white/5">Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={pending} className="h-8 bg-[#512feb] hover:bg-[#3f1fd4] text-white">
                {pending ? "Submitting…" : "Submit Request"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {leaves.map(leave => (
          <Card key={leave.id}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="size-4 text-white/50" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white capitalize">{leave.type} Leave</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${statusCls[leave.status] ?? "bg-white/10 text-white/60"}`}>
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mt-0.5">
                      {format(new Date(leave.startDate), "MMM d")} — {format(new Date(leave.endDate), "MMM d, yyyy")}
                      {" "}· {leave.days} day{leave.days !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-white/50 mt-1">{leave.reason}</p>
                  </div>
                </div>
                <p className="text-xs text-white/40 shrink-0">Applied {format(new Date(leave.appliedOn), "MMM d")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {leaves.length === 0 && (
          <div className="text-center py-16 text-white/50">
            <Calendar className="size-8 mx-auto mb-2 text-white/20" />
            <p className="text-sm">No leave requests yet.</p>
            <p className="text-xs mt-1 text-white/40">Click &quot;New Request&quot; to apply for leave.</p>
          </div>
        )}
      </div>
    </div>
  )
}
