"use client"

import { useState, useTransition } from "react"
import { Check, X, Clock, TicketCheck, Calendar } from "lucide-react"
import { format } from "date-fns"
import { approveLeave, rejectLeave } from "@/lib/actions"

type Employee = { id: string; name: string; avatar: string; role: string; department: string }
type LeaveRequest = { id: string; employeeId: string; type: string; startDate: string; endDate: string; days: number; reason: string; status: string; createdAt: string }
type Ticket = { id: string; employeeId: string; title: string; description: string; priority: string; status: string; createdAt: string }

type Props = {
  pendingLeaves: LeaveRequest[]
  openTickets: Ticket[]
  employees: Employee[]
}

const leaveTypeColor: Record<string, string> = {
  sick:       "bg-red-500/15 text-red-400",
  annual:     "bg-blue-500/15 text-blue-400",
  personal:   "bg-purple-500/15 text-purple-400",
  maternity:  "bg-pink-500/15 text-pink-400",
  paternity:  "bg-cyan-500/15 text-cyan-400",
  emergency:  "bg-orange-500/15 text-orange-400",
}

const priorityColor: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400",
  high:     "bg-orange-500/15 text-orange-400",
  medium:   "bg-yellow-500/15 text-yellow-400",
  low:      "bg-blue-500/15 text-blue-400",
}

const ticketStatusColor: Record<string, string> = {
  open:        "bg-blue-500/15 text-blue-400",
  in_progress: "bg-yellow-500/15 text-yellow-400",
  resolved:    "bg-green-500/15 text-green-400",
}

function empName(employees: Employee[], id: string) {
  return employees.find(e => e.id === id)?.name ?? "Unknown"
}

export default function ApprovalsClient({ pendingLeaves, openTickets, employees }: Props) {
  const [tab, setTab] = useState<"leaves" | "tickets">("leaves")
  const [pending, startTransition] = useTransition()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [ticketStatuses, setTicketStatuses] = useState<Record<string, string>>({})

  const leaves = pendingLeaves.filter(l => !dismissed.has(l.id))
  const tickets = openTickets.filter(t => !dismissed.has(t.id))

  function handleApprove(id: string) {
    startTransition(async () => {
      await approveLeave(id)
      setDismissed(prev => new Set(prev).add(id))
    })
  }

  function handleReject(id: string) {
    startTransition(async () => {
      await rejectLeave(id)
      setDismissed(prev => new Set(prev).add(id))
    })
  }

  async function handleTicketStatus(id: string, status: string) {
    setTicketStatuses(prev => ({ ...prev, [id]: status }))
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (status === "resolved") setDismissed(prev => new Set(prev).add(id))
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit">
        {([["leaves", Calendar, leaves.length], ["tickets", TicketCheck, tickets.length]] as const).map(([key, Icon, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? "bg-[#131318] text-white shadow-sm" : "text-white/50 hover:text-white/80"
            }`}
          >
            <Icon className="size-4" />
            {key === "leaves" ? "Leave Requests" : "Support Tickets"}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab === key ? "bg-[#512feb]/30 text-[#7c5af5]" : "bg-white/10 text-white/50"}`}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Leave Requests */}
      {tab === "leaves" && (
        <div className="space-y-3">
          {leaves.length === 0 ? (
            <div className="text-center py-16 text-white/50">
              <Calendar className="size-8 mx-auto mb-2 text-white/20" />
              <p className="text-sm">No pending leave requests</p>
            </div>
          ) : leaves.map(leave => (
            <div key={leave.id} className="bg-[#131318] border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-white text-sm">{empName(employees, leave.employeeId)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${leaveTypeColor[leave.type] ?? "bg-white/10 text-white/60"}`}>
                    {leave.type}
                  </span>
                  <span className="text-xs text-white/50 flex items-center gap-1">
                    <Clock className="size-3" />
                    {leave.days} day{leave.days !== 1 ? "s" : ""}
                  </span>
                </div>
                <p className="text-xs text-white/60 mb-1">
                  {format(new Date(leave.startDate), "MMM d")} — {format(new Date(leave.endDate), "MMM d, yyyy")}
                </p>
                {leave.reason && (
                  <p className="text-sm text-white/70 line-clamp-2">{leave.reason}</p>
                )}
                <p className="text-xs text-white/40 mt-1">Submitted {format(new Date(leave.createdAt), "MMM d, yyyy")}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleReject(leave.id)}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                >
                  <X className="size-3.5" /> Reject
                </button>
                <button
                  onClick={() => handleApprove(leave.id)}
                  disabled={pending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                >
                  <Check className="size-3.5" /> Approve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tickets */}
      {tab === "tickets" && (
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="text-center py-16 text-white/50">
              <TicketCheck className="size-8 mx-auto mb-2 text-white/20" />
              <p className="text-sm">No open tickets</p>
            </div>
          ) : tickets.map(ticket => {
            const currentStatus = ticketStatuses[ticket.id] ?? ticket.status
            return (
              <div key={ticket.id} className="bg-[#131318] border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-white text-sm">{ticket.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${priorityColor[ticket.priority] ?? "bg-white/10 text-white/60"}`}>
                      {ticket.priority}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${ticketStatusColor[currentStatus] ?? "bg-white/10 text-white/60"}`}>
                      {currentStatus.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mb-1">from {empName(employees, ticket.employeeId)}</p>
                  <p className="text-sm text-white/70 line-clamp-2">{ticket.description}</p>
                  <p className="text-xs text-white/40 mt-1">Opened {format(new Date(ticket.createdAt), "MMM d, yyyy")}</p>
                </div>
                <div className="shrink-0">
                  <select
                    value={currentStatus}
                    onChange={e => handleTicketStatus(ticket.id, e.target.value)}
                    className="text-sm bg-white/5 border border-white/10 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#512feb]/50 cursor-pointer"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
