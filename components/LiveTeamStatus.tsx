"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowRight, Users } from "lucide-react"
import LiveTimer from "@/components/LiveTimer"
import ActivityFeed, { type ActivityItem } from "@/components/ActivityFeed"

export type LiveEmployee = {
  id: string; name: string; avatar: string; role: string; department: string
  location: string; status: "online" | "away" | "offline"
  currentFocus: string; focusSince: string
  openSince: string | null; hoursToday: number
}

export type TeamStatusPayload = {
  employees: LiveEmployee[]
  activity: ActivityItem[]
  online: number
}

const locationFlag: Record<string, string> = {
  Philippines: "🇵🇭", India: "🇮🇳", Pakistan: "🇵🇰", Ghana: "🇬🇭",
  Colombia: "🇨🇴", USA: "🇺🇸", UK: "🇬🇧", Bangladesh: "🇧🇩",
}
function getFlag(location: string) {
  const country = Object.keys(locationFlag).find(c => location.includes(c))
  return country ? locationFlag[country] : "🌍"
}

const statusRing: Record<string, string> = {
  online: "ring-green-400/40 border-green-400/30 bg-green-500/5",
  away: "ring-yellow-400/40 border-yellow-400/30 bg-yellow-500/5",
  offline: "ring-white/10 border-white/10 bg-white/[0.03]",
}
const statusDot: Record<string, string> = {
  online: "bg-green-500", away: "bg-yellow-400", offline: "bg-white/30",
}

const POLL_MS = 10000

const TeamStatusContext = createContext<TeamStatusPayload | null>(null)

// Polls /api/team-status every 10s and shares the result via context, so the
// status grid and activity feed can live in different parts of the page
// layout while updating together — no router.refresh, no page-wide flicker.
export function LiveTeamStatusProvider({ initial, children }: { initial: TeamStatusPayload; children: React.ReactNode }) {
  const [data, setData] = useState(initial)
  const inFlight = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      if (document.visibilityState === "hidden" || inFlight.current) return
      inFlight.current = true
      try {
        const res = await fetch("/api/team-status", { cache: "no-store" })
        if (res.ok && !cancelled) setData(await res.json())
      } catch {
        // transient network hiccup — next poll will retry
      } finally {
        inFlight.current = false
      }
    }

    const id = setInterval(poll, POLL_MS)
    document.addEventListener("visibilitychange", poll)
    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener("visibilitychange", poll)
    }
  }, [])

  return <TeamStatusContext.Provider value={data}>{children}</TeamStatusContext.Provider>
}

function useTeamStatus(): TeamStatusPayload {
  const ctx = useContext(TeamStatusContext)
  if (!ctx) throw new Error("useTeamStatus must be used within LiveTeamStatusProvider")
  return ctx
}

export function LiveTeamStatusGrid() {
  const data = useTeamStatus()
  return (
    <Card>
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/55">Live Team Status</CardTitle>
          <Link href="/employees" className="text-xs text-[#7c5af5] hover:underline flex items-center gap-1">Manage <ArrowRight className="size-3" /></Link>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.employees.map(emp => {
            const ring = statusRing[emp.status] ?? statusRing.offline
            const dot = statusDot[emp.status] ?? statusDot.offline
            return (
              <Link key={emp.id} href={`/employees/${emp.id}`}
                className={`rounded-xl border-2 p-3 ring-1 ${ring} hover:ring-white/25 transition-all group`}>
                <div className="flex items-center justify-between mb-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs bg-white/10 font-bold text-white">{emp.avatar}</AvatarFallback>
                  </Avatar>
                  <span className={`size-2.5 rounded-full ${dot} ${emp.status === "online" ? "animate-pulse" : ""}`} />
                </div>
                <p className="text-xs font-semibold text-white truncate group-hover:text-[#7c5af5] transition-colors">{emp.name.split(" ")[0]}</p>
                {emp.currentFocus
                  ? <p className="text-xs text-[#7c5af5]/90 truncate" title={emp.currentFocus}>🎯 {emp.currentFocus}</p>
                  : <p className="text-xs text-white/40 truncate">{emp.role.split(" ").slice(-1)}</p>}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-white/50">{getFlag(emp.location)}</span>
                  <span className="text-xs font-medium text-white/70">
                    {emp.openSince
                      ? <span className="text-green-400 flex items-center gap-1"><span className="size-1.5 rounded-full bg-green-400 animate-pulse inline-block" /><LiveTimer since={emp.openSince} /></span>
                      : emp.hoursToday > 0 ? `${emp.hoursToday.toFixed(1)}h` : "—"}
                  </span>
                </div>
              </Link>
            )
          })}
          {data.employees.length === 0 && (
            <div className="col-span-4 text-center py-8 text-white/40 text-sm">
              No employees yet. <Link href="/employees" className="text-[#7c5af5] hover:underline">Add your first employee</Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function LiveActivityCard() {
  const data = useTeamStatus()
  return (
    <Card>
      <CardHeader className="border-b border-white/10 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/55">Live Activity</CardTitle>
          <span className="flex items-center gap-1 text-xs text-green-400"><span className="size-1.5 rounded-full bg-green-500 animate-pulse" /> live</span>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ActivityFeed items={data.activity} empty="No activity yet today." />
      </CardContent>
    </Card>
  )
}

// Convenience for anything that just needs the live "N online" count.
export function useLiveOnlineCount(): number {
  return useTeamStatus().online
}

// Header pill — "N active now". Kept in sync with the same poll as the grid.
export function LiveHeaderBadge() {
  const online = useLiveOnlineCount()
  return (
    <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium px-3 py-1.5 rounded-full">
      <span className="size-2 rounded-full bg-green-500 animate-pulse" />
      {online} active now
    </div>
  )
}

// The "Online Now" stat tile — replaces the static server-rendered one so it
// never drifts out of sync with the live grid below it.
export function LiveOnlineStatTile({ total }: { total: number }) {
  const data = useTeamStatus()
  const away = data.employees.filter(e => e.status === "away").length
  return (
    <Card className="hover:ring-white/20 transition-all">
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="size-9 rounded-lg bg-green-500/10 flex items-center justify-center">
            <Users className="size-4 text-green-400" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tabular-nums">{data.online}/{total}</p>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/50 mt-1">Online Now</p>
        <p className="text-xs text-white/40 mt-0.5">{away} away</p>
      </CardContent>
    </Card>
  )
}
