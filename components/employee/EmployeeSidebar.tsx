"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useTransition, useState } from "react"
import { LayoutDashboard, Calendar, CheckSquare, Megaphone, LogOut, Users, MessageSquare } from "lucide-react"
import { setMyStatus } from "@/lib/employee-actions"
import type { EmployeeSession } from "@/lib/employee-auth"

const nav = [
  { href: "/employee/dashboard",      label: "Dashboard",     icon: LayoutDashboard },
  { href: "/employee/tasks",          label: "My Tasks",      icon: CheckSquare },
  { href: "/employee/leaves",         label: "My Leaves",     icon: Calendar },
  { href: "/employee/announcements",  label: "Announcements", icon: Megaphone },
  { href: "/employee/chat",           label: "Chat",          icon: MessageSquare },
]

const statusOptions: { value: "online" | "away" | "offline"; label: string; dot: string }[] = [
  { value: "online",  label: "Online",  dot: "bg-green-500" },
  { value: "away",    label: "Away",    dot: "bg-yellow-400" },
  { value: "offline", label: "Offline", dot: "bg-white/30" },
]

export default function EmployeeSidebar({ employee }: { employee: EmployeeSession }) {
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState(employee.status)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  function handleStatus(s: "online" | "away" | "offline") {
    setStatus(s)
    setShowStatusMenu(false)
    startTransition(() => setMyStatus(s))
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" })
    router.push("/login")
  }

  const currentStatus = statusOptions.find(s => s.value === status) ?? statusOptions[2]

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full bg-[#0d0d0d] border-r border-white/8">
      {/* Logo */}
      <div className="px-4 py-3.5 border-b border-white/8">
        <div className="flex items-center gap-2 mb-2">
          <img
            src="https://framerusercontent.com/images/ezeIruXtNu8eHRsd64BNyYcsc.svg"
            alt="Binary Next"
            className="size-5 object-contain"
          />
          <span className="font-bold text-white text-sm">Binary Next</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/8">
          <Users className="size-3 text-[#7c5af5] shrink-0" />
          <span className="text-[10px] text-white/50 font-medium">TeamPulse CRM</span>
        </div>
      </div>

      {/* Employee card */}
      <div className="p-4 border-b border-white/8">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-9 rounded-full bg-[#512feb]/15 text-[#7c5af5] font-bold text-sm flex items-center justify-center shrink-0">
            {employee.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{employee.name}</p>
            <p className="text-xs text-white/50 truncate">{employee.role}</p>
          </div>
        </div>

        <div className="relative">
          <button onClick={() => setShowStatusMenu(!showStatusMenu)} disabled={pending}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-xs">
            <span className={`size-2 rounded-full shrink-0 ${currentStatus.dot}`} />
            <span className="text-white/80 font-medium">{currentStatus.label}</span>
            <svg className="size-3 ml-auto text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {showStatusMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#1c1c24] border border-white/10 rounded-lg shadow-xl z-20 py-1">
              {statusOptions.map(s => (
                <button key={s.value} onClick={() => handleStatus(s.value)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-white/8 transition-colors ${status === s.value ? "text-white font-medium" : "text-white/60"}`}>
                  <span className={`size-2 rounded-full shrink-0 ${s.dot}`} />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-[#512feb]/15 text-white" : "text-white/60 hover:bg-white/8 hover:text-white"}`}>
              <Icon className={`size-4 shrink-0 ${active ? "text-[#7c5af5]" : "text-white/40"}`} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/8">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors font-medium">
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
        <a href="https://binarynext.io" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 mt-1 opacity-30 hover:opacity-60 transition-opacity">
          <img src="https://framerusercontent.com/images/ezeIruXtNu8eHRsd64BNyYcsc.svg" alt="Binary Next" className="size-3.5 object-contain" />
          <span className="text-[10px] text-white/50">binarynext.io</span>
        </a>
      </div>
    </aside>
  )
}
