"use client"

import { useEffect, useState } from "react"

export default function LiveTimer({ clockIn }: { clockIn: string }) {
  const [elapsed, setElapsed] = useState("")

  useEffect(() => {
    function tick() {
      const diffSec = Math.floor((Date.now() - new Date(clockIn).getTime()) / 1000)
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
