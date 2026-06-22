"use server"

import { queryOne, execute, logActivity } from "@/lib/db"
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

export async function clockIn() {
  const emp = await getEmp()
  if (!emp) return { ok: false, error: "Not authenticated" }
  const today = new Date().toISOString().split("T")[0]
  const exists = await queryOne(`SELECT id FROM "TimeRecord" WHERE "employeeId" = $1 AND date = $2`, [emp.id, today])
  if (exists) return { ok: false, error: "Already clocked in today" }
  const t = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  await execute(
    `INSERT INTO "TimeRecord" (id, "employeeId", date, "clockIn", hours, notes, "createdAt") VALUES ($1, $2, $3, $4, 0, '', $5)`,
    [randomUUID(), emp.id, today, t, new Date().toISOString()]
  )
  await logActivity(emp.id, emp.name, "clock_in", `Clocked in at ${t}`)
  revalidatePath("/employee/dashboard")
  revalidatePath("/time-tracking")
  return { ok: true }
}

export async function clockOut() {
  const emp = await getEmp()
  if (!emp) return { ok: false, error: "Not authenticated" }
  const today = new Date().toISOString().split("T")[0]
  const rec = await queryOne<{ id: string; clockIn: string }>(
    `SELECT id, "clockIn" FROM "TimeRecord" WHERE "employeeId" = $1 AND date = $2 AND "clockOut" IS NULL`,
    [emp.id, today]
  )
  if (!rec) return { ok: false, error: "Not clocked in" }
  const now = new Date()
  const tout = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  const [h, m] = rec.clockIn.split(":").map(Number)
  const hours = Math.max(0, Math.round(((now.getHours() * 60 + now.getMinutes()) - (h * 60 + m)) / 6) / 10)
  await execute(`UPDATE "TimeRecord" SET "clockOut" = $1, hours = $2 WHERE id = $3`, [tout, hours, rec.id])
  await logActivity(emp.id, emp.name, "clock_out", `Clocked out at ${tout} · ${hours}h logged`)
  revalidatePath("/employee/dashboard")
  revalidatePath("/time-tracking")
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
