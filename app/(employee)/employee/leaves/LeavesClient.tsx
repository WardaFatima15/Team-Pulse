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
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
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
          <h1 className="text-xl font-bold text-slate-900">My Leave Requests</h1>
          <p className="text-sm text-slate-500 mt-0.5">{counts.total} total · {counts.pending} pending · {counts.approved} approved</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white h-9" size="sm">
          <Plus className="size-3.5 mr-1.5" /> New Request
        </Button>
      </div>

      {showForm && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardContent className="pt-5 space-y-3">
            <p className="text-sm font-semibold text-slate-800">New Leave Request</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Leave type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {["annual", "sick", "personal", "unpaid"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Start date</label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} className="h-9 text-sm bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">End date</label>
                <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} className="h-9 text-sm bg-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Reason</label>
              <textarea placeholder="Briefly explain the reason for your leave..." value={form.reason}
                onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} rows={3}
                className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-8">Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={pending} className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white">
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
                  <div className="size-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Calendar className="size-4 text-slate-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900 capitalize">{leave.type} Leave</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium capitalize ${statusCls[leave.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {format(new Date(leave.startDate), "MMM d")} — {format(new Date(leave.endDate), "MMM d, yyyy")}
                      {" "}· {leave.days} day{leave.days !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">{leave.reason}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 shrink-0">Applied {format(new Date(leave.appliedOn), "MMM d")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {leaves.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Calendar className="size-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No leave requests yet.</p>
            <p className="text-xs mt-1">Click "New Request" to apply for leave.</p>
          </div>
        )}
      </div>
    </div>
  )
}
