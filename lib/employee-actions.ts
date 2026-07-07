"use server"

import { queryOne, execute, logActivity } from "@/lib/db"
import { computeHours, settleStaleOpenSessions } from "@/lib/time"
import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"
import { cookies } from "next/headers"

async function getEmpId() {
  return (await cookies()).get("employee_token")?.value ?? null
}

async function getEmp() {
  const id = await getEmpId()
  if (!id) return null
  return queryOne<{ id: string; name: string }>(`SELECT id, name FROM "Employee" WHERE id = $1`, [id])
}

export async function clockIn(localTime?: string) {
  const emp = await getEmp()
  if (!emp) return { ok: false, error: "Not authenticated" }
  // Close out any long-abandoned open session first (crediting hours worked),
  // so a forgotten shift can never block a fresh clock-in or steal its timer.
  await settleStaleOpenSessions(emp.id)
  // Block only if there is a genuine, still-running open session (not a stale one).
  const open = await queryOne(`SELECT id FROM "TimeRecord" WHERE "employeeId" = $1 AND "clockOut" IS NULL`, [emp.id])
  if (open) return { ok: false, error: "You're already clocked in." }
  const today = new Date().toISOString().split("T")[0]
  // Display time comes from the employee's own device (their timezone).
  const t = localTime || new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  // createdAt is the real UTC instant — used to compute exact hours later.
  await execute(
    `INSERT INTO "TimeRecord" (id, "employeeId", date, "clockIn", hours, notes, "createdAt") VALUES ($1, $2, $3, $4, 0, '', $5)`,
    [randomUUID(), emp.id, today, t, new Date().toISOString()]
  )
  await logActivity(emp.id, emp.name, "clock_in", `Clocked in at ${t}`)
  revalidatePath("/employee/dashboard")
  revalidatePath("/time-tracking")
  return { ok: true }
}

export type DailyUpdateInput = {
  workedOn?: string
  completed?: string
  pending?: string
  blocked?: string
  needed?: string
  tomorrow?: string
}

const DAILY_UPDATE_SECTIONS: { key: keyof DailyUpdateInput; label: string }[] = [
  { key: "workedOn", label: "Worked on" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "blocked", label: "Blocked" },
  { key: "needed", label: "Needed" },
  { key: "tomorrow", label: "Tomorrow" },
]

// Composes the 6 structured fields into one readable block — kept in the
// legacy `notes` column so every existing report/history view that already
// reads it (Team-Daily report, per-employee AI report, EmployeeDetailClient)
// keeps working without changes.
function composeNotes(update: DailyUpdateInput): string {
  return DAILY_UPDATE_SECTIONS
    .map(s => { const v = (update[s.key] ?? "").trim(); return v ? `${s.label}: ${v}` : "" })
    .filter(Boolean)
    .join("\n")
}

export async function clockOut(localTime?: string, update?: DailyUpdateInput) {
  const emp = await getEmp()
  if (!emp) return { ok: false, error: "Not authenticated" }
  // Find the open session by clockOut IS NULL — NOT by today's UTC date. On a
  // late-night / overnight shift the clock-in UTC date can differ from the
  // clock-out UTC date, which used to make this silently fail and leave the
  // session open at 0 hours. Take the most recent open one.
  const rec = await queryOne<{ id: string; clockIn: string; createdAt: string; shiftHours: number }>(
    `SELECT t.id, t."clockIn", t."createdAt", e."shiftHours"
     FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId"
     WHERE t."employeeId" = $1 AND t."clockOut" IS NULL
     ORDER BY t."createdAt" DESC LIMIT 1`,
    [emp.id]
  )
  if (!rec) return { ok: false, error: "You're not clocked in." }
  const now = new Date()
  const tout = localTime || now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  // Exact elapsed from the real clock-in instant — timezone & midnight proof, capped at the shift length.
  const hours = computeHours(rec.createdAt, now, rec.shiftHours)
  const clean = (s?: string) => (s ?? "").trim().slice(0, 500)
  const workedOn = clean(update?.workedOn), completed = clean(update?.completed), pending = clean(update?.pending)
  const blocked = clean(update?.blocked), needed = clean(update?.needed), tomorrow = clean(update?.tomorrow)
  const notes = composeNotes({ workedOn, completed, pending, blocked, needed, tomorrow }).slice(0, 3000)
  await execute(
    `UPDATE "TimeRecord" SET "clockOut" = $1, hours = $2, notes = $3,
       "workedOn" = $4, "completedToday" = $5, "pendingWork" = $6, blockers = $7, "neededSupport" = $8, "tomorrowFocus" = $9
     WHERE id = $10`,
    [tout, hours, notes, workedOn, completed, pending, blocked, needed, tomorrow, rec.id]
  )
  await logActivity(emp.id, emp.name, "clock_out", `Clocked out at ${tout} · ${hours}h logged`)
  if (notes) await logActivity(emp.id, emp.name, "checkin", notes)
  revalidatePath("/employee/dashboard")
  revalidatePath("/time-tracking")
  return { ok: true, hours }
}

export async function setFocus(focus: string) {
  const emp = await getEmp()
  if (!emp) return { ok: false, error: "Not authenticated" }
  const text = focus.trim().slice(0, 200)
  await execute(
    `UPDATE "Employee" SET "currentFocus" = $1, "focusSince" = $2 WHERE id = $3`,
    [text, new Date().toISOString(), emp.id]
  )
  if (text) await logActivity(emp.id, emp.name, "focus", text)
  revalidatePath("/employee/dashboard")
  revalidatePath("/dashboard")
  revalidatePath("/employees")
  return { ok: true }
}

export async function setMyStatus(status: "online" | "away" | "offline") {
  const emp = await getEmp()
  if (!emp) return
  await execute(`UPDATE "Employee" SET status = $1 WHERE id = $2`, [status, emp.id])
  await logActivity(emp.id, emp.name, "status_change", `Status set to ${status}`)
  revalidatePath("/employee/dashboard")
  revalidatePath("/dashboard")
  revalidatePath("/employees")
}

export async function submitLeave(data: { type: string; startDate: string; endDate: string; reason: string }) {
  const emp = await getEmp()
  if (!emp) return { ok: false }
  const days = Math.max(1, Math.round((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86400000) + 1)
  const today = new Date().toISOString().split("T")[0]
  await execute(
    `INSERT INTO "LeaveRequest" (id, "employeeId", type, "startDate", "endDate", days, reason, status, "appliedOn", "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)`,
    [randomUUID(), emp.id, data.type, data.startDate, data.endDate, days, data.reason, today, new Date().toISOString()]
  )
  await logActivity(emp.id, emp.name, "leave_request", `${data.type} leave · ${data.startDate} to ${data.endDate} (${days}d)`)
  revalidatePath("/employee/leaves")
  revalidatePath("/leaves")
  revalidatePath("/approvals")
  return { ok: true }
}

export async function submitTicket(data: { title: string; description: string; priority: string }) {
  const emp = await getEmp()
  if (!emp) return { ok: false }
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "Ticket" (id, "employeeId", title, description, status, priority, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, 'open', $5, $6, $7)`,
    [randomUUID(), emp.id, data.title, data.description, data.priority, now, now]
  )
  await logActivity(emp.id, emp.name, "ticket_created", `"${data.title}" (${data.priority} priority)`)
  revalidatePath("/employee/tickets")
  revalidatePath("/tickets")
  revalidatePath("/approvals")
  return { ok: true }
}

export async function addMyReply(ticketId: string, message: string) {
  const emp = await getEmp()
  if (!emp) return { ok: false }
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "TicketReply" (id, "ticketId", "authorId", "authorName", "isAdmin", message, "createdAt")
     VALUES ($1, $2, $3, $4, 0, $5, $6)`,
    [randomUUID(), ticketId, emp.id, emp.name, message, now]
  )
  revalidatePath("/employee/tickets")
  revalidatePath("/tickets")
  return { ok: true }
}
