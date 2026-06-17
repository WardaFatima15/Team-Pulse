"use client"

import { useState, useEffect, useTransition } from "react"
import { clockIn, clockOut, setMyStatus } from "@/lib/employee-actions"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Calendar, Clock, CheckSquare, Megaphone, Pin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

type TodayRecord = { clockIn: string; clockOut: string | null; hours: number } | null
type Announcement = { id: string; title: string; body: string; pinned: number; createdAt: string }

type Props = {
  name: string
  status: string
  todayRecord: TodayRecord
  pendingLeaves: number
  openTickets: number
  announcements: Announcement[]
}

const statusOptions = [
  { value: "online",  label: "Online",  dot: "bg-green-500",  ring: "ring-green-300",  btn: "bg-green-500 hover:bg-green-600 text-white" },
  { value: "away",    label: "Away",    dot: "bg-yellow-400", ring: "ring-yellow-300", btn: "bg-yellow-400 hover:bg-yellow-500 text-white" },
  { value: "offline", label: "Offline", dot: "bg-slate-400",  ring: "ring-slate-300",  btn: "bg-slate-400 hover:bg-slate-500 text-white" },
] as const

export default function DashboardClient({ name, status: initialStatus, todayRecord, pendingLeaves, openTickets, announcements }: Props) {
  const [now, setNow] = useState(new Date())
  const [pending, startTransition] = useTransition()
  const [myStatus, setMyStatusLocal] = useState(initialStatus)
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  function handleClockIn() {
    startTransition(async () => { await clockIn(); router.refresh() })
  }
  function handleClockOut() {
    startTransition(async () => { await clockOut(); router.refresh() })
  }
  function handleStatus(s: "online" | "away" | "offline") {
    setMyStatusLocal(s)
    startTransition(async () => { await setMyStatus(s) })
  }

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening"
  const firstName = name.split(" ")[0]

  let elapsed = ""
  if (todayRecord && !todayRecord.clockOut) {
    const [h, m] = todayRecord.clockIn.split(":").map(Number)
    const mins = Math.max(0, now.getHours() * 60 + now.getMinutes() - (h * 60 + m))
    elapsed = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting}, {firstName}!</h1>
        <p className="text-slate-500 text-sm mt-0.5">{format(now, "EEEE, MMMM d yyyy")}</p>
      </div>

      {/* Clock widget */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            <div className="flex-1 p-6 border-b sm:border-b-0 sm:border-r border-slate-100">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-3">Current time</p>
              <p className="text-5xl font-bold text-slate-900 tabular-nums tracking-tight">
                {format(now, "HH:mm")}
                <span className="text-2xl text-slate-300 ml-1.5">{format(now, "ss")}</span>
              </p>
              <p className="text-slate-400 text-sm mt-1">{format(now, "EEEE, MMM d")}</p>
            </div>

            <div className="p-6 flex flex-col items-center justify-center gap-4 sm:w-52">
              {!todayRecord ? (
                <>
                  <p className="text-sm text-slate-500 text-center">Not clocked in yet</p>
                  <button onClick={handleClockIn} disabled={pending}
                    className="w-full px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 shadow-sm shadow-green-200">
                    {pending ? "Clocking in…" : "Clock In"}
                  </button>
                </>
              ) : todayRecord.clockOut ? (
                <>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{todayRecord.hours}h</p>
                    <p className="text-xs text-slate-400 mt-0.5">worked today</p>
                    <p className="text-xs text-slate-500 mt-1">{todayRecord.clockIn} — {todayRecord.clockOut}</p>
                  </div>
                  <div className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-medium">Done for today</div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-xs text-green-600 font-medium">Active</p>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 tabular-nums">{elapsed}</p>
                    <p className="text-xs text-slate-400 mt-0.5">since {todayRecord.clockIn}</p>
                  </div>
                  <button onClick={handleClockOut} disabled={pending}
                    className="w-full px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 shadow-sm shadow-red-200">
                    {pending ? "Clocking out…" : "Clock Out"}
                  </button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status widget */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-3">Your Status</p>
        <div className="flex items-center gap-3">
          {statusOptions.map(s => {
            const active = myStatus === s.value
            return (
              <button key={s.value} onClick={() => handleStatus(s.value)} disabled={pending}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${active ? `${s.btn} border-transparent shadow-sm` : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                <span className={`size-2.5 rounded-full ${active ? "bg-white/80" : s.dot}`} />
                {s.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-400 mt-2">Visible to your manager in real-time</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Clock, label: "Hours today", value: todayRecord ? `${todayRecord.hours || "0"}h` : "0h", color: "text-indigo-500", bg: "bg-indigo-50" },
          { icon: Calendar, label: "Pending leaves", value: pendingLeaves, href: "/employee/leaves", color: "text-amber-500", bg: "bg-amber-50" },
          { icon: CheckSquare, label: "Jira Tasks", value: "→", href: "/employee/tasks", color: "text-blue-500", bg: "bg-blue-50" },
        ].map(({ icon: Icon, label, value, href, color, bg }) => (
          <Card key={label} className={href ? "cursor-pointer hover:shadow-md transition-shadow" : ""}>
            <CardContent className="pt-4 pb-4">
              {href ? (
                <Link href={href} className="block">
                  <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon className={`size-4 ${color}`} /></div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </Link>
              ) : (
                <>
                  <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon className={`size-4 ${color}`} /></div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{label}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              <Megaphone className="size-4 text-slate-400" /> Latest Announcements
            </p>
            <Link href="/employee/announcements" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {announcements.slice(0, 3).map(ann => (
              <Card key={ann.id} className={ann.pinned ? "border-indigo-100" : ""}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-2">
                    {ann.pinned ? <Pin className="size-3.5 text-indigo-400 shrink-0 mt-0.5" /> : null}
                    <div>
                      <p className="text-sm font-medium text-slate-900">{ann.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ann.body}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
