"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useTransition, useState } from "react"
import { LayoutDashboard, Calendar, CheckSquare, Megaphone, LogOut, Users } from "lucide-react"
import { setMyStatus } from "@/lib/employee-actions"
import type { EmployeeSession } from "@/lib/employee-auth"

const nav = [
  { href: "/employee/dashboard",      label: "Dashboard",     icon: LayoutDashboard },
  { href: "/employee/tasks",          label: "Jira Tasks",    icon: CheckSquare },
  { href: "/employee/leaves",         label: "My Leaves",     icon: Calendar },
  { href: "/employee/announcements",  label: "Announcements", icon: Megaphone },
]

const statusOptions: { value: "online" | "away" | "offline"; label: string; dot: string }[] = [
  { value: "online",  label: "Online",  dot: "bg-green-500" },
  { value: "away",    label: "Away",    dot: "bg-yellow-400" },
  { value: "offline", label: "Offline", dot: "bg-slate-400" },
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
    <aside className="w-56 shrink-0 flex flex-col h-full bg-white border-r border-slate-200">
      {/* Logo */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="size-7 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
          <Users className="size-4 text-white" />
        </div>
        <span className="font-bold text-slate-900 text-sm">TeamPulse</span>
      </div>

      {/* Employee card */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="size-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0">
            {employee.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{employee.name}</p>
            <p className="text-xs text-slate-400 truncate">{employee.role}</p>
          </div>
        </div>

        {/* Status picker */}
        <div className="relative">
          <button onClick={() => setShowStatusMenu(!showStatusMenu)} disabled={pending}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-xs">
            <span className={`size-2 rounded-full shrink-0 ${currentStatus.dot}`} />
            <span className="text-slate-700 font-medium">{currentStatus.label}</span>
            <svg className="size-3 ml-auto text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {showStatusMenu && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
              {statusOptions.map(s => (
                <button key={s.value} onClick={() => handleStatus(s.value)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 transition-colors ${status === s.value ? "text-slate-900 font-medium" : "text-slate-600"}`}>
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
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              <Icon className={`size-4 shrink-0 ${active ? "text-indigo-500" : "text-slate-400"}`} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-100">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors font-medium">
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
