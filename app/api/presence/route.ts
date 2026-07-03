import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { execute, queryOne } from "@/lib/db"
import { settleStaleOpenSessions } from "@/lib/time"

// A heartbeat gap wider than this means the browser/machine was actually
// asleep or the tab was closed — don't credit "active" time across that gap.
const MAX_CONTINUOUS_GAP_MS = 90 * 1000

export async function POST(req: NextRequest) {
  const empId = (await cookies()).get("employee_token")?.value
  if (!empId) return NextResponse.json({ ok: false }, { status: 401 })

  let state: "online" | "away" = "online"
  try {
    const body = await req.json()
    if (body?.state === "away") state = "away"
  } catch {}

  const now = new Date()

  const prev = await queryOne<{ status: string; lastSeenAt: string }>(
    `SELECT status, "lastSeenAt" FROM "Employee" WHERE id = $1`,
    [empId]
  )

  await execute(
    `UPDATE "Employee" SET status = $1, "lastSeenAt" = $2 WHERE id = $3`,
    [state, now.toISOString(), empId]
  )

  // Credit active seconds to the open session only for continuous "online"
  // heartbeats — a gap (sleep, closed tab) or an "away" state contributes nothing.
  if (prev?.lastSeenAt && prev.status === "online") {
    const gapMs = now.getTime() - new Date(prev.lastSeenAt).getTime()
    if (gapMs > 0 && gapMs <= MAX_CONTINUOUS_GAP_MS) {
      const deltaSec = Math.round(gapMs / 1000)
      await execute(
        `UPDATE "TimeRecord" SET "activeSeconds" = "activeSeconds" + $1 WHERE "employeeId" = $2 AND "clockOut" IS NULL`,
        [deltaSec, empId]
      )
    }
  }

  // Real-time auto clock-out: closes any open session that has hit its shift
  // length (or the 12h safety cap). Runs every heartbeat so it's near-instant.
  const closed = await settleStaleOpenSessions(empId)

  return NextResponse.json({ ok: true, autoClockOut: closed > 0 })
}
