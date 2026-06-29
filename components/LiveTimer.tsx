"use client"

import { useEffect, useState } from "react"

export default function LiveTimer({ clockIn }: { clockIn: string }) {
  const [elapsed, setElapsed] = useState("")

  useEffect(() => {
    function tick() {
      const now = new Date()
      // clockIn is stored as "HH:MM:SS" time-only string
      const [hh, mm, ss] = clockIn.split(":").map(Number)
      const startSec = hh * 3600 + mm * 60 + (ss ?? 0)
      const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()
      let diffSec = nowSec - startSec
      if (diffSec < 0) diffSec += 86400 // handle midnight crossing (overnight shift)
      if (diffSec > 20 * 3600) { setElapsed("–"); return } // stale session guard (>20h = truly abandoned)
      const h = Math.floor(diffSec / 3600)
      const m = Math.floor((diffSec % 3600) / 60)
      const s = diffSec % 60
      if (h > 0) setElapsed(`${h}h ${String(m).padStart(2, "0")}m`)
      else setElapsed(`${m}m ${String(s).padStart(2, "0")}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [clockIn])

  return <>{elapsed}</>
}
