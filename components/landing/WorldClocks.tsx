"use client"

import { useEffect, useState } from "react"

const ZONES = [
  { label: "KHI", tz: "Asia/Karachi" },
  { label: "DXB", tz: "Asia/Dubai" },
  { label: "LDN", tz: "Europe/London" },
  { label: "NYC", tz: "America/New_York" },
  { label: "SFO", tz: "America/Los_Angeles" },
]

/** Live ticking clocks across the timezones an offshore team actually spans. */
export default function WorldClocks() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.15em]">
      {ZONES.map(z => (
        <span key={z.label} className="flex items-center gap-2 text-white/40">
          <span className="text-white/25">{z.label}</span>
          <span className="tabular-nums text-white/70">
            {now
              ? now.toLocaleTimeString("en-GB", { timeZone: z.tz, hour: "2-digit", minute: "2-digit", second: "2-digit" })
              : "--:--:--"}
          </span>
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-green-400">
        <span className="size-1.5 animate-pulse rounded-full bg-green-400" /> SYNCED
      </span>
    </div>
  )
}
