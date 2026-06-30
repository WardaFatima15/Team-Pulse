"use client"

import { useEffect, useRef } from "react"

const HEARTBEAT_MS = 30 * 1000   // ping every 30s
const IDLE_MS = 5 * 60 * 1000    // no activity for 5 min => away

// Mounts invisibly in the employee portal. Reports real activity so the
// manager sees verified presence — the employee can't just claim "online".
export default function PresenceTracker() {
  const lastActivity = useRef(Date.now())

  useEffect(() => {
    function markActive() { lastActivity.current = Date.now() }

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"]
    events.forEach(e => window.addEventListener(e, markActive, { passive: true }))

    function currentState(): "online" | "away" {
      if (document.visibilityState === "hidden") return "away"
      if (Date.now() - lastActivity.current > IDLE_MS) return "away"
      return "online"
    }

    function beat() {
      fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: currentState() }),
        keepalive: true,
      }).catch(() => {})
    }

    function onVisibility() {
      // React instantly when they switch tabs / come back
      beat()
    }

    function onLeave() {
      // Best-effort flag as away on close; full offline follows from silence
      try {
        navigator.sendBeacon?.(
          "/api/presence",
          new Blob([JSON.stringify({ state: "away" })], { type: "application/json" })
        )
      } catch {}
    }

    beat() // immediate heartbeat on load
    const id = setInterval(beat, HEARTBEAT_MS)
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", onLeave)

    return () => {
      clearInterval(id)
      events.forEach(e => window.removeEventListener(e, markActive))
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", onLeave)
    }
  }, [])

  return null
}
