"use client"

import { useState, useEffect, useTransition } from "react"
import { clockIn, clockOut } from "@/lib/employee-actions"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Calendar, Clock, CheckSquare, Megaphone, Pin, TicketCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import FocusCard from "@/components/employee/FocusCard"
import { formatDuration } from "@/lib/utils"

type TodayRecord = { clockIn: string; clockOut: string | null; hours: number; activeSeconds: number } | null
type Announcement = { id: string; title: string; body: string; pinned: number; createdAt: string }

type Props = {
  name: string
  status?: string
  todayRecord: TodayRecord
  pendingLeaves: number
  openTickets: number
  announcements: Announcement[]
  focus: string
  focusSince: string
}

// Capture the time on the employee's own device so hours/times are in
// THEIR timezone, not the server's UTC clock.
function localTime() {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

export default function DashboardClient({ name, todayRecord, pendingLeaves, openTickets, announcements, focus, focusSince }: Props) {
  const [now, setNow] = useState(new Date())
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [showCheckin, setShowCheckin] = useState(false)
  const [update, setUpdate] = useState({ workedOn: "", completed: "", pending: "", blocked: "", needed: "", tomorrow: "" })
  const router = useRouter()

  function setField(k: keyof typeof update, v: string) { setUpdate(u => ({ ...u, [k]: v })) }

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  function handleClockIn() {
    setError("")
    startTransition(async () => {
      const res = await clockIn(localTime())
      if (res && !res.ok) setError(res.error || "Couldn't clock in.")
      router.refresh()
    })
  }
  function finishClockOut() {
    setError("")
    startTransition(async () => {
      const res = await clockOut(localTime(), update)
      if (res && !res.ok) setError(res.error || "Couldn't clock out.")
      setShowCheckin(false)
      setUpdate({ workedOn: "", completed: "", pending: "", blocked: "", needed: "", tomorrow: "" })
      router.refresh()
    })
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
                    {todayRecord.activeSeconds > 0 && (
                      <p className="text-xs text-white/40 mt-1">{formatDuration(todayRecord.activeSeconds)} active</p>
                    )}
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
                    {todayRecord.activeSeconds > 0 && (
                      <p className="text-xs text-white/40 mt-1">{formatDuration(todayRecord.activeSeconds)} active</p>
                    )}
                  </div>
                  <button onClick={() => setShowCheckin(true)} disabled={pending}
                    className="w-full px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                    Clock Out
                  </button>
                </>
              )}
            </div>
          </div>
          {showCheckin && (
            <div className="border-t border-white/10 p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-white/40">Daily update <span className="font-normal">(all optional)</span></p>
              {([
                { key: "workedOn", label: "What did you work on today?", placeholder: "e.g. Checkout flow, code review" },
                { key: "completed", label: "What did you complete?", placeholder: "e.g. Fixed the login bug" },
                { key: "pending", label: "What is pending?", placeholder: "e.g. Waiting on design assets" },
                { key: "blocked", label: "What is blocked?", placeholder: "e.g. API access still pending" },
                { key: "needed", label: "What do you need from the team/client?", placeholder: "e.g. Feedback on the PR" },
                { key: "tomorrow", label: "Tomorrow's focus", placeholder: "e.g. Start on the reports page" },
              ] as const).map((f, i) => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-white/60 mb-1">{f.label}</label>
                  <textarea
                    value={update[f.key]}
                    onChange={e => setField(f.key, e.target.value)}
                    maxLength={500}
                    rows={1}
                    autoFocus={i === 0}
                    placeholder={f.placeholder}
                    className="w-full resize-none rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#512feb]"
                  />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => { setShowCheckin(false); setUpdate({ workedOn: "", completed: "", pending: "", blocked: "", needed: "", tomorrow: "" }) }} disabled={pending}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:bg-white/5">Cancel</button>
                <button onClick={finishClockOut} disabled={pending}
                  className="text-xs px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50">
                  {pending ? "Clocking out…" : "Confirm Clock Out"}
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/15 border-t border-red-500/20 px-6 py-2.5">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Current focus — self-reported, shown live to the manager */}
      <FocusCard focus={focus} since={focusSince} />

      {/* Status — automatic, activity-based */}
      <div className="bg-[#0d0d12] rounded-2xl border border-white/10 p-5">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Clock, label: "Hours today", value: !todayRecord ? "0h" : todayRecord.clockOut ? `${todayRecord.hours || "0"}h` : (elapsed || "0h"), color: "text-[#7c5af5]", bg: "bg-[#512feb]/10" },
          { icon: Calendar, label: "Pending leaves", value: pendingLeaves, href: "/employee/leaves", color: "text-amber-400", bg: "bg-amber-500/10" },
          { icon: TicketCheck, label: "Open tickets", value: openTickets, href: "/employee/tickets", color: "text-red-400", bg: "bg-red-500/10" },
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
