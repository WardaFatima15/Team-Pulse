import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { execute } from "@/lib/db"

// Heartbeat from the employee's browser. Records lastSeenAt + reported activity
// state (online/away). Offline is never reported — it's derived from silence.
export async function POST(req: NextRequest) {
  const empId = (await cookies()).get("employee_token")?.value
  if (!empId) return NextResponse.json({ ok: false }, { status: 401 })

  let state: "online" | "away" = "online"
  try {
    const body = await req.json()
    if (body?.state === "away") state = "away"
  } catch {
    // sendBeacon may send no/blob body — default to online
  }

  await execute(
    `UPDATE "Employee" SET status = $1, "lastSeenAt" = $2 WHERE id = $3`,
    [state, new Date().toISOString(), empId]
  )
  return NextResponse.json({ ok: true })
}
