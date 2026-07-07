"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Clock, CheckSquare, Calendar,
  Megaphone, TicketCheck, Settings, LogOut, Users2, MessageSquare, BarChart2, CalendarDays, InboxIcon, Sparkles, TrendingUp,
  UserCog, Building2, FileSignature, ScanSearch, ListChecks,
} from "lucide-react"

const navItems = [
  { href: "/dashboard",       icon: LayoutDashboard, label: "Dashboard" },
  { href: "/approvals",       icon: InboxIcon,       label: "Approvals" },
  { href: "/employees",       icon: Users,           label: "Employees" },
  { href: "/resources",       icon: UserCog,         label: "Resources" },
  { href: "/pipeline",        icon: TrendingUp,      label: "Sales Pipeline" },
  { href: "/clients",         icon: Building2,       label: "Clients" },
  { href: "/proposals",       icon: FileSignature,   label: "Proposals" },
  { href: "/plugai-audits",   icon: ScanSearch,      label: "PlugAI Audits" },
  { href: "/time-tracking",   icon: Clock,           label: "Time Tracking" },
  { href: "/attendance",      icon: CalendarDays,    label: "Attendance" },
  { href: "/tasks",           icon: CheckSquare,     label: "Tasks" },
  { href: "/leaves",          icon: Calendar,        label: "Leave Management" },
  { href: "/announcements",   icon: Megaphone,       label: "Announcements" },
  { href: "/tickets",         icon: TicketCheck,     label: "Support Tickets" },
  { href: "/chat",            icon: MessageSquare,   label: "Chat" },
  { href: "/reports",         icon: BarChart2,       label: "Daily Reports" },
  { href: "/ai",              icon: Sparkles,        label: "AI Assistant" },
]

export default function Sidebar({ orgName }: { orgName?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" })
    router.push("/login")
    router.refresh()
  }

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[#0d0d0d] min-h-screen print:hidden">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5 mb-3">
          <img
            src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png"
            alt="Binary Next"
            className="size-7 rounded object-contain"
          />
          <div>
            <p className="text-white font-bold text-sm leading-tight">Binary Next</p>
            <p className="text-white/40 text-[10px] tracking-wide uppercase">AI Automation</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <Users2 className="size-3.5 text-[#512feb] shrink-0" />
          <span className="text-white/80 text-xs font-medium truncate">{orgName ?? "TeamPulse CRM"}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-[#512feb] text-white"
                  : "text-white/50 hover:bg-white/8 hover:text-white/90"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 space-y-0.5 border-t border-white/10 pt-3">
        <Link
          href="/backlog"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/backlog"
              ? "bg-[#512feb] text-white"
              : "text-white/50 hover:bg-white/8 hover:text-white/90"
          )}
        >
          <ListChecks className="size-4 shrink-0" />
          Product Backlog
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            pathname === "/settings"
              ? "bg-[#512feb] text-white"
              : "text-white/50 hover:bg-white/8 hover:text-white/90"
          )}
        >
          <Settings className="size-4 shrink-0" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/5">
        <a href="https://binarynext.io" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity">
          <img
            src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png"
            alt="Binary Next"
            className="size-4 rounded object-contain"
          />
          <span className="text-white text-[10px]">binarynext.io</span>
        </a>
      </div>
    </aside>
  )
}
