"use client"

import { useEffect, useState } from "react"

// `since` is the real ISO instant of clock-in (createdAt) — so the elapsed
// time is correct no matter what timezone the admin viewing it is in.
export default function LiveTimer({ since }: { since: string }) {
  const [elapsed, setElapsed] = useState("")

  useEffect(() => {
    function tick() {
      const diffSec = Math.floor((Date.now() - new Date(since).getTime()) / 1000)
      if (diffSec < 0) { setElapsed("0m"); return }
      if (diffSec > 20 * 3600) { setElapsed("–"); return } // stale/abandoned session guard
      const h = Math.floor(diffSec / 3600)
      const m = Math.floor((diffSec % 3600) / 60)
      const s = diffSec % 60
      if (h > 0) setElapsed(`${h}h ${String(m).padStart(2, "0")}m`)
      else setElapsed(`${m}m ${String(s).padStart(2, "0")}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [since])

  return <>{elapsed}</>
}
