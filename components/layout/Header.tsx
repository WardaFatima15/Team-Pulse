"use client"

import { usePathname } from "next/navigation"
import { Bell, Calendar, TicketCheck, MessageSquare, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState, useRef } from "react"

const titles: Record<string, { title: string; sub: string }> = {
  "/dashboard":     { title: "Dashboard",         sub: "Team overview & live status" },
  "/approvals":     { title: "Approvals Inbox",   sub: "Leaves & tickets needing action" },
  "/employees":     { title: "Employees",          sub: "Manage your offshore team" },
  "/time-tracking": { title: "Time Tracking",      sub: "Attendance & hours logged" },
  "/attendance":    { title: "Attendance",         sub: "Team attendance records" },
  "/tasks":         { title: "Jira Tasks",         sub: "Issues synced from Jira" },
  "/leaves":        { title: "Leave Management",   sub: "Requests & approvals" },
  "/announcements": { title: "Announcements",      sub: "Company-wide updates" },
  "/tickets":       { title: "Support Tickets",    sub: "Internal requests & issues" },
  "/chat":          { title: "Chat",               sub: "Direct & group messages" },
  "/reports":       { title: "Daily Reports",      sub: "AI-generated team summaries" },
  "/ai":            { title: "AI Assistant",       sub: "HR & team management help" },
  "/settings":      { title: "Settings",           sub: "Jira integration & preferences" },
}

type NotifCounts = { pendingLeaves: number; openTickets: number; unreadMessages: number; total: number }

export default function Header({ orgName, adminEmail }: { orgName?: string; adminEmail?: string }) {
  const pathname = usePathname()
  const base = "/" + pathname.split("/")[1]
  const page = titles[base] ?? { title: "TeamPulse", sub: "" }

  const [counts, setCounts] = useState<NotifCounts>({ pendingLeaves: 0, openTickets: 0, unreadMessages: 0, total: 0 })
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchCounts() {
      try {
        const res = await fetch("/api/notifications")
        if (res.ok) setCounts(await res.json())
      } catch {}
    }
    fetchCounts()
    const id = setInterval(fetchCounts, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  return (
    <header className="h-16 bg-[#0d0d0d] border-b border-white/10 flex items-center justify-between px-6 shrink-0 relative z-30 print:hidden">
      <div>
        <h1 className="text-base font-bold text-white leading-tight">{page.title}</h1>
        {page.sub && <p className="text-xs text-white/40 leading-tight mt-0.5">{page.sub}</p>}
      </div>
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative" ref={panelRef}>
          <Button
            variant="ghost" size="icon"
            onClick={() => setOpen(v => !v)}
            className="text-white/40 hover:text-white hover:bg-white/10 relative size-8"
          >
            <Bell className="size-4" />
            {counts.total > 0 && (
              <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                {counts.total > 9 ? "9+" : counts.total}
              </span>
            )}
          </Button>

          {open && (
            <div className="absolute right-0 top-10 w-72 bg-[#131318] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <p className="text-sm font-semibold text-white">Notifications</p>
                <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                  <X className="size-4" />
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {counts.pendingLeaves > 0 && (
                  <a href="/approvals" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="size-8 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                      <Calendar className="size-4 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{counts.pendingLeaves} pending leave{counts.pendingLeaves !== 1 ? "s" : ""}</p>
                      <p className="text-xs text-white/50">Waiting for approval</p>
                    </div>
                  </a>
                )}
                {counts.openTickets > 0 && (
                  <a href="/tickets" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="size-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                      <TicketCheck className="size-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{counts.openTickets} open ticket{counts.openTickets !== 1 ? "s" : ""}</p>
                      <p className="text-xs text-white/50">Need attention</p>
                    </div>
                  </a>
                )}
                {counts.unreadMessages > 0 && (
                  <a href="/chat" onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors">
                    <div className="size-8 rounded-lg bg-[#512feb]/15 flex items-center justify-center shrink-0">
                      <MessageSquare className="size-4 text-[#7c5af5]" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{counts.unreadMessages} unread message{counts.unreadMessages !== 1 ? "s" : ""}</p>
                      <p className="text-xs text-white/50">From employees</p>
                    </div>
                  </a>
                )}
                {counts.total === 0 && (
                  <div className="px-4 py-6 text-center text-white/40 text-sm">
                    All caught up!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-white/10" />
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs bg-[#512feb] text-white font-bold">AD</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-white leading-tight">Admin</p>
            <p className="text-xs text-white/40 leading-tight">{adminEmail ?? "admin@company.com"}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
