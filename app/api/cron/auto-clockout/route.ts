import { NextRequest, NextResponse } from "next/server"
import { queryAll, execute } from "@/lib/db"

// Called by Vercel Cron every 15 minutes.
// Clocks out any employee whose shift duration has been exceeded.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // Find all open time records with employee shift info
  const open = await queryAll<{
    recordId: string
    empId: string
    empName: string
    createdAt: string
    shiftHours: number
  }>(
    `SELECT t.id as "recordId", e.id as "empId", e.name as "empName",
            t."createdAt", e."shiftHours"
     FROM "TimeRecord" t
     JOIN "Employee" e ON e.id = t."employeeId"
     WHERE t."clockOut" IS NULL AND e."shiftHours" > 0`
  )

  let count = 0
  for (const rec of open) {
    const elapsedHours = (now.getTime() - new Date(rec.createdAt).getTime()) / 3_600_000
    const isStale = elapsedHours > 20 // always clean up zombie sessions

    if (elapsedHours >= rec.shiftHours || isStale) {
      const tout = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      const hours = Math.min(Math.round(elapsedHours * 10) / 10, rec.shiftHours || elapsedHours)
      await execute(
        `UPDATE "TimeRecord" SET "clockOut" = $1, hours = $2 WHERE id = $3`,
        [tout, hours, rec.recordId]
      )
      count++
    }
  }

  // Also clean up truly stale sessions with no shiftHours set (older than 20h)
  const stale = await queryAll<{ recordId: string; createdAt: string }>(
    `SELECT t.id as "recordId", t."createdAt"
     FROM "TimeRecord" t
     JOIN "Employee" e ON e.id = t."employeeId"
     WHERE t."clockOut" IS NULL AND (e."shiftHours" = 0 OR e."shiftHours" IS NULL)`
  )
  for (const rec of stale) {
    const elapsedHours = (now.getTime() - new Date(rec.createdAt).getTime()) / 3_600_000
    if (elapsedHours > 20) {
      await execute(
        `UPDATE "TimeRecord" SET "clockOut" = $1, hours = $2 WHERE id = $3`,
        [now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), Math.round(elapsedHours * 10) / 10, rec.recordId]
      )
      count++
    }
  }

  return NextResponse.json({ ok: true, closedSessions: count })
}
