"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useState } from "react"
import { LayoutDashboard, Calendar, CheckSquare, Megaphone, LogOut, Users, MessageSquare, Building2, ChevronDown, Check, TrendingUp } from "lucide-react"
import type { EmployeeSession } from "@/lib/employee-auth"

const nav = [
  { href: "/employee/dashboard",      label: "Dashboard",     icon: LayoutDashboard },
  { href: "/employee/pipeline",       label: "Sales Pipeline",icon: TrendingUp },
  { href: "/employee/tasks",          label: "My Tasks",      icon: CheckSquare },
  { href: "/employee/leaves",         label: "My Leaves",     icon: Calendar },
  { href: "/employee/announcements",  label: "Announcements", icon: Megaphone },
  { href: "/employee/chat",           label: "Chat",          icon: MessageSquare },
]

export default function EmployeeSidebar({ employee }: { employee: EmployeeSession }) {
  const pathname = usePathname()
  const router = useRouter()
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false)
  const [switching, setSwitching] = useState(false)

  async function handleLogout() {
    await fetch("/api/employee-auth", { method: "DELETE" })
    router.push("/employee/login")
  }

  async function switchWorkspace(empId: string) {
    if (empId === employee.id) { setShowWorkspaceMenu(false); return }
    setSwitching(true)
    setShowWorkspaceMenu(false)
    await fetch("/api/employee-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empId }),
    })
    router.push("/employee/dashboard")
    router.refresh()
    setSwitching(false)
  }

  const hasMultipleWorkspaces = employee.workspaces.length > 1

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full bg-[#08080b] border-r border-white/8">

      {/* Workspace selector */}
      <div className="px-3 py-3 border-b border-white/8 relative">
        <button
          onClick={() => hasMultipleWorkspaces && setShowWorkspaceMenu(!showWorkspaceMenu)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors ${hasMultipleWorkspaces ? "hover:bg-white/8 cursor-pointer" : "cursor-default"}`}
        >
          <div className="size-7 rounded-lg bg-[#512feb]/20 flex items-center justify-center shrink-0">
            <Building2 className="size-3.5 text-[#7c5af5]" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-white truncate">{employee.orgName}</p>
            <p className="text-[10px] text-white/40">Cadenz</p>
          </div>
          {hasMultipleWorkspaces && <ChevronDown className={`size-3.5 text-white/30 shrink-0 transition-transform ${showWorkspaceMenu ? "rotate-180" : ""}`} />}
        </button>

        {showWorkspaceMenu && (
          <div className="absolute top-full left-2 right-2 mt-1 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-50 py-2 overflow-hidden">
            <p className="text-[10px] text-white/30 font-semibold uppercase tracking-wider px-3 pb-1.5">Your workspaces</p>
            {employee.workspaces.map(ws => (
              <button
                key={ws.empId}
                onClick={() => switchWorkspace(ws.empId)}
                disabled={switching}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/8 transition-colors text-left"
              >
                <div className="size-6 rounded-md bg-[#512feb]/15 flex items-center justify-center shrink-0">
                  <Building2 className="size-3 text-[#7c5af5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{ws.orgName}</p>
                  <p className="text-[10px] text-white/40 truncate">{ws.role}</p>
                </div>
                {ws.empId === employee.id && <Check className="size-3 text-[#7c5af5] shrink-0" />}
              </button>
            ))}
          </div>
        )}
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

        <div
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-green-500/10 text-xs"
          title="Your status is set automatically based on your activity"
        >
          <span className="size-2 rounded-full shrink-0 bg-green-500 animate-pulse" />
          <span className="text-green-400 font-medium">Active</span>
          <span className="text-white/30 ml-auto text-[10px]">auto</span>
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

      {/* Footer */}
      <div className="p-3 border-t border-white/8">
        {hasMultipleWorkspaces && (
          <button
            onClick={() => setShowWorkspaceMenu(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:bg-white/8 hover:text-white/80 transition-colors font-medium mb-0.5"
          >
            <Users className="size-4 shrink-0" />
            Switch workspace
          </button>
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors font-medium">
          <LogOut className="size-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
