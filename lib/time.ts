import { queryAll, execute } from "@/lib/db"

// Hard ceiling on a single work session. If someone forgets to clock out, we
// never credit (or hoard open) more than this — prevents "200h open" zombies.
export const MAX_SHIFT_HOURS = 12

// Exact hours worked between the real clock-in instant (UTC ISO) and `now`,
// capped at the employee's shift length (or MAX_SHIFT_HOURS if none set).
// Timezone- and midnight-proof because it uses absolute UTC timestamps.
export function computeHours(createdAtIso: string, now: Date, shiftHours = 0): number {
  const start = new Date(createdAtIso).getTime()
  let h = (now.getTime() - start) / 3_600_000
  if (!Number.isFinite(h) || h < 0) h = 0
  const cap = shiftHours && shiftHours > 0 ? shiftHours : MAX_SHIFT_HOURS
  return Math.round(Math.min(h, cap) * 100) / 100
}

// A readable "HH:MM" clock-out label for an auto/settled close, derived from
// the real elapsed time so it lines up with the credited hours.
function autoOutLabel(createdAtIso: string, hours: number): string {
  const end = new Date(new Date(createdAtIso).getTime() + hours * 3_600_000)
  return end.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
}

// Close any OPEN session for this employee that has clearly ended — i.e. it has
// been open longer than its cap. Credits the hours actually worked (capped),
// NEVER zeroes them. Genuine ongoing shifts (still within cap) are left open.
// This is the single mechanism behind login cleanup, clock-in cleanup, the
// presence heartbeat, and the daily cron — so behaviour is always consistent.
export async function settleStaleOpenSessions(empId: string): Promise<number> {
  const open = await queryAll<{ id: string; createdAt: string; shiftHours: number }>(
    `SELECT t.id, t."createdAt", e."shiftHours"
     FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId"
     WHERE t."employeeId" = $1 AND t."clockOut" IS NULL`,
    [empId]
  )
  const now = new Date()
  let closed = 0
  for (const r of open) {
    const cap = r.shiftHours && r.shiftHours > 0 ? r.shiftHours : MAX_SHIFT_HOURS
    const elapsed = (now.getTime() - new Date(r.createdAt).getTime()) / 3_600_000
    if (!Number.isFinite(elapsed) || elapsed >= cap) {
      const hours = computeHours(r.createdAt, now, r.shiftHours)
      await execute(
        `UPDATE "TimeRecord" SET "clockOut" = $1, hours = $2 WHERE id = $3`,
        [autoOutLabel(r.createdAt, hours), hours, r.id]
      )
      closed++
    }
  }
  return closed
}

// Org-wide sweep for the daily cron — settles every stale open session.
export async function settleAllStaleOpenSessions(): Promise<number> {
  const open = await queryAll<{ id: string; createdAt: string; shiftHours: number }>(
    `SELECT t.id, t."createdAt", e."shiftHours"
     FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId"
     WHERE t."clockOut" IS NULL`
  )
  const now = new Date()
  let closed = 0
  for (const r of open) {
    const cap = r.shiftHours && r.shiftHours > 0 ? r.shiftHours : MAX_SHIFT_HOURS
    const elapsed = (now.getTime() - new Date(r.createdAt).getTime()) / 3_600_000
    if (!Number.isFinite(elapsed) || elapsed >= cap) {
      const hours = computeHours(r.createdAt, now, r.shiftHours)
      await execute(
        `UPDATE "TimeRecord" SET "clockOut" = $1, hours = $2 WHERE id = $3`,
        [autoOutLabel(r.createdAt, hours), hours, r.id]
      )
      closed++
    }
  }
  return closed
}
