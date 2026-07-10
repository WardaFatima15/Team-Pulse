"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Users, Clock, CheckSquare, Calendar,
  Megaphone, TicketCheck, Settings, LogOut, Users2, MessageSquare, BarChart2, CalendarDays, InboxIcon, Sparkles, TrendingUp,
  UserCog, Building2, FileSignature, ScanSearch, ListChecks,
} from "lucide-react"

type NavItem = { href: string; icon: typeof LayoutDashboard; label: string }
type NavGroup = { label: string | null; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/approvals", icon: InboxIcon, label: "Approvals" },
    ],
  },
  {
    label: "sales",
    items: [
      { href: "/pipeline", icon: TrendingUp, label: "Sales Pipeline" },
      { href: "/clients", icon: Building2, label: "Clients" },
      { href: "/proposals", icon: FileSignature, label: "Proposals" },
      { href: "/plugai-audits", icon: ScanSearch, label: "PlugAI Audits" },
    ],
  },
  {
    label: "team",
    items: [
      { href: "/employees", icon: Users, label: "Employees" },
      { href: "/resources", icon: UserCog, label: "Resources" },
      { href: "/time-tracking", icon: Clock, label: "Time Tracking" },
      { href: "/attendance", icon: CalendarDays, label: "Attendance" },
      { href: "/leaves", icon: Calendar, label: "Leave Management" },
    ],
  },
  {
    label: "operations",
    items: [
      { href: "/tasks", icon: CheckSquare, label: "Tasks" },
      { href: "/tickets", icon: TicketCheck, label: "Support Tickets" },
      { href: "/announcements", icon: Megaphone, label: "Announcements" },
      { href: "/chat", icon: MessageSquare, label: "Chat" },
      { href: "/reports", icon: BarChart2, label: "Daily Reports" },
      { href: "/ai", icon: Sparkles, label: "AI Assistant" },
    ],
  },
]

function NavLink({ href, icon: Icon, label, active }: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
        active
          ? "bg-[#512feb]/14 text-white"
          : "text-white/50 hover:bg-white/6 hover:text-white/90"
      )}
    >
      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[#7c5af5]" />}
      <Icon className={cn("size-4 shrink-0", active ? "text-[#9d85f7]" : "")} />
      {label}
    </Link>
  )
}

export default function Sidebar({ orgName }: { orgName?: string }) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" })
    router.push("/login")
    router.refresh()
  }

  const isActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href))

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[#08080b] border-r border-white/8 min-h-screen print:hidden">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-white/8">
        <div className="flex items-center gap-2.5 mb-3">
          <img
            src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png"
            alt="Cadenz"
            className="size-7 rounded object-contain"
          />
          <div>
            <p className="text-white font-bold text-sm leading-tight">Cadenz</p>
            <p className="text-white/35 font-mono text-[9px] tracking-[0.18em] uppercase">command center</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/4 border border-white/10">
          <Users2 className="size-3.5 text-[#7c5af5] shrink-0" />
          <span className="text-white/80 text-xs font-medium truncate">{orgName ?? "Cadenz"}</span>
          <span className="ml-auto size-1.5 rounded-full bg-green-400 animate-pulse" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={group.label ?? "top"} className={gi > 0 ? "mt-4" : ""}>
            {group.label && (
              <p className="px-3 pb-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
                // {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink key={item.href} {...item} active={isActive(item.href)} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-3 space-y-0.5 border-t border-white/8 pt-3">
        <NavLink href="/backlog" icon={ListChecks} label="Product Backlog" active={pathname === "/backlog"} />
        <NavLink href="/settings" icon={Settings} label="Settings" active={pathname === "/settings"} />
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:bg-red-900/30 hover:text-red-400 transition-colors"
        >
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/5 flex items-center justify-between">
        <a href="https://binarynext.io" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 opacity-40 hover:opacity-70 transition-opacity">
          <img
            src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png"
            alt="Binary Next"
            className="size-4 rounded object-contain"
          />
          <span className="text-white text-[10px]">binarynext.io</span>
        </a>
        <span className="font-mono text-[9px] text-white/20">v1.0</span>
      </div>
    </aside>
  )
}
