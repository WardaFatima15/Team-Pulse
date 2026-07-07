"use client"

import { useState, useTransition } from "react"
import { submitTicket, addMyReply } from "@/lib/employee-actions"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ChevronDown, ChevronUp, Send, TicketCheck } from "lucide-react"
import { format } from "date-fns"

type Ticket = {
  id: string; title: string; description: string
  status: string; priority: string; createdAt: string
}
type Reply = { id: string; ticketId: string; authorName: string; isAdmin: number; message: string; createdAt: string }

const priorityCls: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400", high: "bg-orange-500/15 text-orange-400",
  medium: "bg-yellow-500/15 text-yellow-400", low: "bg-white/10 text-white/60",
}
const statusCls: Record<string, string> = {
  open: "bg-blue-500/15 text-blue-400", "in-progress": "bg-[#512feb]/15 text-[#7c5af5]", resolved: "bg-green-500/15 text-green-400",
}

export default function TicketsClient({ tickets, replies }: { tickets: Ticket[]; replies: Reply[] }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", priority: "medium" })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState<"all" | "open" | "in-progress" | "resolved">("all")
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleCreate() {
    if (!form.title.trim() || !form.description.trim()) return
    startTransition(async () => {
      await submitTicket(form)
      setForm({ title: "", description: "", priority: "medium" })
      setShowForm(false)
      router.refresh()
    })
  }

  function handleReply(ticketId: string) {
    const msg = replyText[ticketId]?.trim()
    if (!msg) return
    startTransition(async () => {
      await addMyReply(ticketId, msg)
      setReplyText(p => ({ ...p, [ticketId]: "" }))
      router.refresh()
    })
  }

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter)

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">My Tickets</h1>
          <p className="text-sm text-white/60 mt-0.5">{tickets.length} total · {tickets.filter(t => t.status !== "resolved").length} active</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white h-9" size="sm">
          <Plus className="size-3.5 mr-1.5" /> New Ticket
        </Button>
      </div>

      {showForm && (
        <Card className="border-[#512feb]/30">
          <CardContent className="pt-5 space-y-3">
            <p className="text-sm font-semibold text-white">New Support Ticket</p>
            <Input placeholder="Ticket title..." value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 text-sm" />
            <textarea placeholder="Describe the issue in detail..." value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#512feb]/50 placeholder:text-white/30" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/60">Priority:</span>
                {(["low", "medium", "high", "urgent"] as const).map(p => (
                  <button key={p} onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors capitalize ${form.priority === p ? priorityCls[p] : "bg-white/8 text-white/40 hover:bg-white/15"}`}>
                    {p}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-7 border-white/10 text-white/70 hover:bg-white/5">Cancel</Button>
                <Button size="sm" onClick={handleCreate} disabled={pending} className="h-7 bg-[#512feb] hover:bg-[#3f1fd4] text-white">
                  {pending ? "Submitting…" : "Submit"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2 flex-wrap">
        {(["all", "open", "in-progress", "resolved"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-[#512feb] text-white" : "bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white"}`}>
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
            {s !== "all" && <span className="ml-1 opacity-70">{tickets.filter(t => t.status === s).length}</span>}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(ticket => {
          const ticketReplies = replies.filter(r => r.ticketId === ticket.id)
          const isOpen = expanded === ticket.id
          return (
            <Card key={ticket.id}>
              <CardContent className="py-0">
                <button className="w-full text-left py-4 flex items-start gap-3" onClick={() => setExpanded(isOpen ? null : ticket.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-white">{ticket.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityCls[ticket.priority] ?? ""}`}>{ticket.priority}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${statusCls[ticket.status] ?? ""}`}>{ticket.status.replace("-", " ")}</span>
                    </div>
                    <p className="text-xs text-white/50">
                      {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                      {ticketReplies.length > 0 ? ` · ${ticketReplies.length} repl${ticketReplies.length === 1 ? "y" : "ies"}` : ""}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="size-4 text-white/40 shrink-0" /> : <ChevronDown className="size-4 text-white/40 shrink-0" />}
                </button>

                {isOpen && (
                  <div className="border-t border-white/10 pt-4 pb-4 space-y-4">
                    <p className="text-sm text-white/80 bg-white/5 rounded-lg p-3">{ticket.description}</p>

                    {ticketReplies.length > 0 && (
                      <div className="space-y-3">
                        {ticketReplies.map(reply => (
                          <div key={reply.id} className={`flex gap-2.5 ${reply.isAdmin ? "flex-row-reverse" : ""}`}>
                            <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${reply.isAdmin ? "bg-[#512feb] text-white" : "bg-white/15 text-white/80"}`}>
                              {reply.isAdmin ? "A" : reply.authorName.charAt(0)}
                            </div>
                            <div className={`max-w-[80%] ${reply.isAdmin ? "items-end" : ""}`}>
                              <div className={`text-xs px-3 py-2 rounded-xl ${reply.isAdmin ? "bg-[#512feb] text-white" : "bg-white/10 text-white/90"}`}>
                                {reply.message}
                              </div>
                              <p className={`text-xs text-white/40 mt-0.5 ${reply.isAdmin ? "text-right" : ""}`}>
                                {reply.isAdmin ? "Admin" : reply.authorName} · {format(new Date(reply.createdAt), "MMM d, HH:mm")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {ticket.status !== "resolved" && (
                      <div className="flex gap-2">
                        <input type="text" placeholder="Reply to this ticket..."
                          value={replyText[ticket.id] ?? ""}
                          onChange={e => setReplyText(p => ({ ...p, [ticket.id]: e.target.value }))}
                          onKeyDown={e => e.key === "Enter" && handleReply(ticket.id)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#512feb]/50 placeholder:text-white/30" />
                        <Button size="sm" onClick={() => handleReply(ticket.id)} disabled={pending}
                          className="h-8 bg-[#512feb] hover:bg-[#3f1fd4] text-white">
                          <Send className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-white/50">
            <TicketCheck className="size-8 mx-auto mb-2 text-white/20" />
            <p className="text-sm">No tickets here.</p>
            {filter !== "all" && <p className="text-xs mt-1 text-white/40">Try switching to &quot;All&quot;</p>}
          </div>
        )}
      </div>
    </div>
  )
}
