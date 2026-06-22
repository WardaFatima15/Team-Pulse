"use client"

import { usePathname } from "next/navigation"
import { Bell, Users2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const titles: Record<string, { title: string; sub: string }> = {
  "/dashboard":     { title: "Dashboard",         sub: "Team overview & live status" },
  "/employees":     { title: "Employees",          sub: "Manage your offshore team" },
  "/time-tracking": { title: "Time Tracking",      sub: "Attendance & hours logged" },
  "/tasks":         { title: "Jira Tasks",         sub: "Issues synced from Jira" },
  "/leaves":        { title: "Leave Management",   sub: "Requests & approvals" },
  "/announcements": { title: "Announcements",      sub: "Company-wide updates" },
  "/tickets":       { title: "Support Tickets",    sub: "Internal requests & issues" },
  "/settings":      { title: "Settings",           sub: "Jira integration & preferences" },
}

export default function Header() {
  const pathname = usePathname()
  const base = "/" + pathname.split("/")[1]
  const page = titles[base] ?? { title: "TeamPulse", sub: "" }

  return (
    <header className="h-16 bg-[#0d0d0d] border-b border-white/10 flex items-center justify-between px-6 shrink-0">
      <div>
        <h1 className="text-base font-bold text-white leading-tight">{page.title}</h1>
        {page.sub && <p className="text-xs text-white/40 leading-tight mt-0.5">{page.sub}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/10 relative size-8">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-red-500" />
        </Button>
        <div className="w-px h-6 bg-white/10" />
        <div className="flex items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs bg-[#512feb] text-white font-bold">AD</AvatarFallback>
          </Avatar>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-white leading-tight">Admin</p>
            <p className="text-xs text-white/40 leading-tight">admin@company.com</p>
          </div>
        </div>
      </div>
    </header>
  )
}
