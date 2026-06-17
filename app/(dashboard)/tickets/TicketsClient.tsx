"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChevronDown, ChevronUp, Send } from "lucide-react"
import { format } from "date-fns"
import { updateTicketStatus, addTicketReply } from "@/lib/actions"
import { useRouter } from "next/navigation"

type Employee = { id: string; name: string; avatar: string }
type Ticket = { id: string; employeeId: string; title: string; description: string; status: string; priority: string; createdAt: string; updatedAt: string }
type TicketReply = { id: string; ticketId: string; authorId: string; authorName: string; isAdmin: number; message: string; createdAt: string }

const priorityColors: Record<string, string> = {
  urgent: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700", low: "bg-slate-100 text-slate-600",
}
const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700", "in-progress": "bg-indigo-100 text-indigo-700", resolved: "bg-green-100 text-green-700",
}

export default function TicketsClient({ tickets, replies, employees }: { tickets: Ticket[]; replies: TicketReply[]; employees: Employee[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<"all" | "open" | "in-progress" | "resolved">("all")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleStatus(id: string, status: string) {
    startTransition(async () => { await updateTicketStatus(id, status); router.refresh() })
  }

  function handleReply(ticketId: string) {
    const msg = replyText[ticketId]?.trim()
    if (!msg) return
    startTransition(async () => {
      await addTicketReply(ticketId, msg)
      setReplyText(p => ({ ...p, [ticketId]: "" }))
      router.refresh()
    })
  }

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter)
  const counts = { open: tickets.filter(t => t.status === "open").length, "in-progress": tickets.filter(t => t.status === "in-progress").length, resolved: tickets.filter(t => t.status === "resolved").length }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "in-progress", "resolved"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${filter === s ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {s === "all" ? "All Tickets" : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
            {s !== "all" && <span className="opacity-70">{counts[s as keyof typeof counts]}</span>}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(ticket => {
          const emp = employees.find(e => e.id === ticket.employeeId)
          const ticketReplies = replies.filter(r => r.ticketId === ticket.id)
          const isExpanded = expanded === ticket.id
          return (
            <Card key={ticket.id}>
              <CardContent className="py-0">
                <button className="w-full text-left py-4 flex items-start gap-3" onClick={() => setExpanded(isExpanded ? null : ticket.id)}>
                  <Avatar className="size-8 shrink-0 mt-0.5">
                    <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700 font-medium">{emp?.avatar}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-slate-900 text-sm">{ticket.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColors[ticket.priority] ?? ""}`}>{ticket.priority}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusColors[ticket.status] ?? ""}`}>{ticket.status.replace("-", " ")}</span>
                    </div>
                    <p className="text-xs text-slate-500">{emp?.name} · {format(new Date(ticket.createdAt), "MMM d, yyyy")}{ticketReplies.length > 0 ? ` · ${ticketReplies.length} repl${ticketReplies.length === 1 ? "y" : "ies"}` : ""}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="size-4 text-slate-400 shrink-0 mt-1" /> : <ChevronDown className="size-4 text-slate-400 shrink-0 mt-1" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 pt-4 pb-4 space-y-4">
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{ticket.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="text-xs text-slate-500 self-center">Change status:</span>
                      {(["open", "in-progress", "resolved"] as const).map(s => (
                        <button key={s} onClick={() => handleStatus(ticket.id, s)} disabled={pending} className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${ticket.status === s ? statusColors[s] : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                          {s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
                        </button>
                      ))}
                    </div>
                    {ticketReplies.length > 0 && (
                      <div className="space-y-3">
                        {ticketReplies.map(reply => (
                          <div key={reply.id} className={`flex gap-2.5 ${reply.isAdmin ? "flex-row-reverse" : ""}`}>
                            <div className={`size-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${reply.isAdmin ? "bg-indigo-500 text-white" : "bg-slate-200 text-slate-600"}`}>
                              {reply.isAdmin ? "A" : reply.authorName.charAt(0)}
                            </div>
                            <div className={`max-w-[80%] ${reply.isAdmin ? "items-end" : ""}`}>
                              <div className={`text-xs px-3 py-2 rounded-xl ${reply.isAdmin ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-800"}`}>{reply.message}</div>
                              <p className={`text-xs text-slate-400 mt-0.5 ${reply.isAdmin ? "text-right" : ""}`}>{reply.authorName} · {format(new Date(reply.createdAt), "MMM d, HH:mm")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {ticket.status !== "resolved" && (
                      <div className="flex gap-2">
                        <input type="text" placeholder="Type a reply..." value={replyText[ticket.id] ?? ""}
                          onChange={e => setReplyText(p => ({ ...p, [ticket.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && handleReply(ticket.id)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                        <Button size="sm" onClick={() => handleReply(ticket.id)} disabled={pending} className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white"><Send className="size-3.5" /></Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No tickets in this category.</div>}
      </div>
    </div>
  )
}
