"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Silently re-runs server components on the current page every `ms` milliseconds
// so presence statuses stay current without a manual refresh.
export default function AutoRefresh({ ms = 30000 }: { ms?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), ms)
    return () => clearInterval(id)
  }, [router, ms])
  return null
}
