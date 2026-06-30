import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { queryOne, execute } from "@/lib/db"

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

  // Check if this employee has an open session that's exceeded their shift length
  const openRec = await queryOne<{ recId: string; createdAt: string; shiftHours: number }>(
    `SELECT t.id as "recId", t."createdAt", e."shiftHours"
     FROM "TimeRecord" t
     JOIN "Employee" e ON e.id = t."employeeId"
     WHERE t."employeeId" = $1 AND t."clockOut" IS NULL AND e."shiftHours" > 0`,
    [empId]
  )

  if (openRec) {
    const elapsedHours = (now.getTime() - new Date(openRec.createdAt).getTime()) / 3_600_000
    if (elapsedHours >= openRec.shiftHours) {
      const tout = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      const hours = Math.round(Math.min(elapsedHours, openRec.shiftHours) * 10) / 10
      await execute(
        `UPDATE "TimeRecord" SET "clockOut" = $1, hours = $2 WHERE id = $3`,
        [tout, hours, openRec.recId]
      )
      return NextResponse.json({ ok: true, autoClockOut: true })
    }
  }

  return NextResponse.json({ ok: true })
}
