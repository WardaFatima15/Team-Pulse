// Slack-style automatic presence.
// Status is derived from heartbeats, never self-claimed.
// The employee's browser pings /api/presence every 30s while active.
// If we haven't heard from them in OFFLINE_AFTER_MS, they're offline —
// regardless of whatever status was last written.

export const OFFLINE_AFTER_MS = 90 * 1000 // 90s of silence = offline

export type EffectiveStatus = "online" | "away" | "offline"

export function effectiveStatus(status: string, lastSeenAt: string | null | undefined): EffectiveStatus {
  // Legacy rows with no heartbeat yet — trust nothing, show offline.
  if (!lastSeenAt) return "offline"
  const last = new Date(lastSeenAt).getTime()
  if (Number.isNaN(last)) return "offline"
  if (Date.now() - last > OFFLINE_AFTER_MS) return "offline"
  // Heard recently — honour reported online/away, default online.
  return status === "away" ? "away" : "online"
}
