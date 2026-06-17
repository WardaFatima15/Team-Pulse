"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"
import { cookies } from "next/headers"

async function getEmpId() {
  return (await cookies()).get("employee_token")?.value ?? null
}

export async function clockIn() {
  const id = await getEmpId()
  if (!id) return { ok: false, error: "Not authenticated" }
  const today = new Date().toISOString().split("T")[0]
  const exists = db.prepare("SELECT id FROM TimeRecord WHERE employeeId = ? AND date = ?").get(id, today)
  if (exists) return { ok: false, error: "Already clocked in today" }
  const t = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  db.prepare(
    "INSERT INTO TimeRecord (id, employeeId, date, clockIn, hours, notes, createdAt) VALUES (?, ?, ?, ?, 0, '', ?)"
  ).run(randomUUID(), id, today, t, new Date().toISOString())
  revalidatePath("/employee/dashboard")
  revalidatePath("/time-tracking")
  return { ok: true }
}

export async function clockOut() {
  const id = await getEmpId()
  if (!id) return { ok: false, error: "Not authenticated" }
  const today = new Date().toISOString().split("T")[0]
  const rec = db.prepare(
    "SELECT id, clockIn FROM TimeRecord WHERE employeeId = ? AND date = ? AND clockOut IS NULL"
  ).get(id, today) as { id: string; clockIn: string } | undefined
  if (!rec) return { ok: false, error: "Not clocked in" }
  const now = new Date()
  const tout = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  const [h, m] = rec.clockIn.split(":").map(Number)
  const hours = Math.max(0, Math.round(((now.getHours() * 60 + now.getMinutes()) - (h * 60 + m)) / 6) / 10)
  db.prepare("UPDATE TimeRecord SET clockOut = ?, hours = ? WHERE id = ?").run(tout, hours, rec.id)
  revalidatePath("/employee/dashboard")
  revalidatePath("/time-tracking")
  return { ok: true }
}

export async function setMyStatus(status: "online" | "away" | "offline") {
  const id = await getEmpId()
  if (!id) return
  db.prepare("UPDATE Employee SET status = ? WHERE id = ?").run(status, id)
  revalidatePath("/employee/dashboard")
  revalidatePath("/dashboard")
  revalidatePath("/employees")
}

export async function submitLeave(data: { type: string; startDate: string; endDate: string; reason: string }) {
  const id = await getEmpId()
  if (!id) return { ok: false }
  const days = Math.max(1, Math.round((new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 86400000) + 1)
  const today = new Date().toISOString().split("T")[0]
  db.prepare(
    "INSERT INTO LeaveRequest (id, employeeId, type, startDate, endDate, days, reason, status, appliedOn, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)"
  ).run(randomUUID(), id, data.type, data.startDate, data.endDate, days, data.reason, today, new Date().toISOString())
  revalidatePath("/employee/leaves")
  revalidatePath("/leaves")
  return { ok: true }
}

export async function submitTicket(data: { title: string; description: string; priority: string }) {
  const id = await getEmpId()
  if (!id) return { ok: false }
  const now = new Date().toISOString()
  db.prepare(
    "INSERT INTO Ticket (id, employeeId, title, description, status, priority, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'open', ?, ?, ?)"
  ).run(randomUUID(), id, data.title, data.description, data.priority, now, now)
  revalidatePath("/employee/tickets")
  revalidatePath("/tickets")
  return { ok: true }
}

export async function addMyReply(ticketId: string, message: string) {
  const id = await getEmpId()
  if (!id) return { ok: false }
  const emp = db.prepare("SELECT name FROM Employee WHERE id = ?").get(id) as { name: string }
  const now = new Date().toISOString()
  db.prepare(
    "INSERT INTO TicketReply (id, ticketId, authorId, authorName, isAdmin, message, createdAt) VALUES (?, ?, ?, ?, 0, ?, ?)"
  ).run(randomUUID(), ticketId, id, emp.name, message, now)
  revalidatePath("/employee/tickets")
  revalidatePath("/tickets")
  return { ok: true }
}
