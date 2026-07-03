import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { execute } from "@/lib/db"
import { settleStaleOpenSessions } from "@/lib/time"

export async function POST(req: NextRequest) {
  const empId = (await cookies()).get("employee_token")?.value
  if (!empId) return NextResponse.json({ ok: false }, { status: 401 })

  let state: "online" | "away" = "online"
  try {
    const body = await req.json()
    if (body?.state === "away") state = "away"
  } catch {}

  const now = new Date()

  await execute(
    `UPDATE "Employee" SET status = $1, "lastSeenAt" = $2 WHERE id = $3`,
    [state, now.toISOString(), empId]
  )

  // Real-time auto clock-out: closes any open session that has hit its shift
  // length (or the 12h safety cap). Runs every heartbeat so it's near-instant.
  const closed = await settleStaleOpenSessions(empId)

  return NextResponse.json({ ok: true, autoClockOut: closed > 0 })
}
