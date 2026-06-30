"use client"

import { useState, useEffect, useTransition } from "react"
import { clockIn, clockOut } from "@/lib/employee-actions"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Calendar, Clock, CheckSquare, Megaphone, Pin } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"

type TodayRecord = { clockIn: string; clockOut: string | null; hours: number } | null
type Announcement = { id: string; title: string; body: string; pinned: number; createdAt: string }

type Props = {
  name: string
  status?: string
  todayRecord: TodayRecord
  pendingLeaves: number
  openTickets: number
  announcements: Announcement[]
}

// Capture the time on the employee's own device so hours/times are in
// THEIR timezone, not the server's UTC clock.
function localTime() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

export default function DashboardClient({ name, todayRecord, pendingLeaves, openTickets, announcements }: Props) {
  const [now, setNow] = useState(new Date())
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  function handleClockIn() {
    startTransition(async () => { await clockIn(localTime()); router.refresh() })
  }
  function handleClockOut() {
    startTransition(async () => { await clockOut(localTime()); router.refresh() })
  }

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening"
  const firstName = name.split(" ")[0]

  let elapsed = ""
  if (todayRecord && !todayRecord.clockOut) {
    const [h, m] = todayRecord.clockIn.split(":").map(Number)
    let mins = now.getHours() * 60 + now.getMinutes() - (h * 60 + m)
    if (mins < 0) mins += 24 * 60 // handle midnight crossing
    elapsed = `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">{greeting}, {firstName}!</h1>
        <p className="text-white/60 text-sm mt-0.5">{format(now, "EEEE, MMMM d yyyy")}</p>
      </div>

      {/* Clock widget */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            <div className="flex-1 p-6 border-b sm:border-b-0 sm:border-r border-white/10">
              <p className="text-xs text-white/50 font-medium uppercase tracking-widest mb-3">Current time</p>
              <p className="text-5xl font-bold text-white tabular-nums tracking-tight">
                {format(now, "HH:mm")}
                <span className="text-2xl text-white/30 ml-1.5">{format(now, "ss")}</span>
              </p>
              <p className="text-white/50 text-sm mt-1">{format(now, "EEEE, MMM d")}</p>
            </div>

            <div className="p-6 flex flex-col items-center justify-center gap-4 sm:w-52">
              {!todayRecord ? (
                <>
                  <p className="text-sm text-white/60 text-center">Not clocked in yet</p>
                  <button onClick={handleClockIn} disabled={pending}
                    className="w-full px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                    {pending ? "Clocking in…" : "Clock In"}
                  </button>
                </>
              ) : todayRecord.clockOut ? (
                <>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{todayRecord.hours}h</p>
                    <p className="text-xs text-white/50 mt-0.5">worked today</p>
                    <p className="text-xs text-white/60 mt-1">{todayRecord.clockIn} — {todayRecord.clockOut}</p>
                  </div>
                  <div className="text-xs bg-blue-500/15 text-blue-400 px-3 py-1.5 rounded-full font-medium">Done for today</div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <span className="size-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-xs text-green-400 font-medium">Active</p>
                    </div>
                    <p className="text-2xl font-bold text-white tabular-nums">{elapsed}</p>
                    <p className="text-xs text-white/50 mt-0.5">since {todayRecord.clockIn}</p>
                  </div>
                  <button onClick={handleClockOut} disabled={pending}
                    className="w-full px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                    {pending ? "Clocking out…" : "Clock Out"}
                  </button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status — automatic, activity-based */}
      <div className="bg-[#131318] rounded-2xl border border-white/10 p-5">
        <p className="text-xs text-white/50 font-medium uppercase tracking-widest mb-3">Your Status</p>
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-white">Active</span>
          <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">Automatic</span>
        </div>
        <p className="text-xs text-white/40 mt-2">
          Your manager sees your status in real-time. It updates automatically based on your activity —
          you&apos;ll show as <span className="text-yellow-400/80">away</span> when idle and{" "}
          <span className="text-white/50">offline</span> when you close the app.
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Clock, label: "Hours today", value: todayRecord ? `${todayRecord.hours || "0"}h` : "0h", color: "text-[#7c5af5]", bg: "bg-[#512feb]/10" },
          { icon: Calendar, label: "Pending leaves", value: pendingLeaves, href: "/employee/leaves", color: "text-amber-400", bg: "bg-amber-500/10" },
          { icon: CheckSquare, label: "My Tasks", value: "→", href: "/employee/tasks", color: "text-blue-400", bg: "bg-blue-500/10" },
        ].map(({ icon: Icon, label, value, href, color, bg }) => (
          <Card key={label} className={href ? "cursor-pointer hover:ring-white/20 transition-all" : ""}>
            <CardContent className="pt-4 pb-4">
              {href ? (
                <Link href={href} className="block">
                  <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon className={`size-4 ${color}`} /></div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-white/60 mt-0.5">{label}</p>
                </Link>
              ) : (
                <>
                  <div className={`size-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon className={`size-4 ${color}`} /></div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-white/60 mt-0.5">{label}</p>
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
            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Megaphone className="size-4 text-white/50" /> Latest Announcements
            </p>
            <Link href="/employee/announcements" className="text-xs text-[#7c5af5] hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {announcements.slice(0, 3).map(ann => (
              <Card key={ann.id} className={ann.pinned ? "border-[#512feb]/30" : ""}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-2">
                    {ann.pinned ? <Pin className="size-3.5 text-[#7c5af5] shrink-0 mt-0.5" /> : null}
                    <div>
                      <p className="text-sm font-medium text-white">{ann.title}</p>
                      <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{ann.body}</p>
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
