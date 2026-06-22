"use server"

import { queryOne, execute } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import { sendWelcomeEmail, sendPasswordResetEmail } from "@/lib/email"

// ── Leave Requests ────────────────────────────────────────────────────────────

export async function updateLeaveStatus(id: string, status: "approved" | "rejected") {
  await execute(`UPDATE "LeaveRequest" SET status = $1 WHERE id = $2`, [status, id])
  revalidatePath("/leaves")
  revalidatePath("/approvals")
  revalidatePath("/dashboard")
}

export async function approveLeave(id: string) {
  return updateLeaveStatus(id, "approved")
}

export async function rejectLeave(id: string) {
  return updateLeaveStatus(id, "rejected")
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export async function updateTicketStatus(id: string, status: string) {
  const now = new Date().toISOString()
  await execute(`UPDATE "Ticket" SET status = $1, "updatedAt" = $2 WHERE id = $3`, [status, now, id])
  revalidatePath("/tickets")
}

export async function addTicketReply(ticketId: string, message: string) {
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "TicketReply" (id, "ticketId", "authorId", "authorName", "isAdmin", message, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [randomUUID(), ticketId, "admin", "Admin", 1, message, now]
  )
  await execute(
    `UPDATE "Ticket" SET status = CASE WHEN status = 'open' THEN 'in-progress' ELSE status END, "updatedAt" = $1 WHERE id = $2`,
    [now, ticketId]
  )
  revalidatePath("/tickets")
}

// ── Announcements ─────────────────────────────────────────────────────────────

export async function createAnnouncement(title: string, body: string, pinned: boolean) {
  await execute(
    `INSERT INTO "Announcement" (id, title, body, "authorId", "authorName", pinned, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [randomUUID(), title, body, "admin", "Admin", pinned ? 1 : 0, new Date().toISOString()]
  )
  revalidatePath("/announcements")
  revalidatePath("/dashboard")
}

export async function toggleAnnouncementPin(id: string, pinned: boolean) {
  await execute(`UPDATE "Announcement" SET pinned = $1 WHERE id = $2`, [pinned ? 1 : 0, id])
  revalidatePath("/announcements")
}

export async function deleteAnnouncement(id: string) {
  await execute(`DELETE FROM "Announcement" WHERE id = $1`, [id])
  revalidatePath("/announcements")
}

// ── Employees ─────────────────────────────────────────────────────────────────

export async function updateEmployeeStatus(id: string, status: "online" | "away" | "offline") {
  await execute(`UPDATE "Employee" SET status = $1 WHERE id = $2`, [status, id])
  revalidatePath("/employees")
  revalidatePath("/dashboard")
}

export async function createEmployee(data: {
  name: string; email: string; role: string; department: string
  phone: string; location: string; password: string
}) {
  const initials = data.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  const password = data.password || "employee123"
  const passwordHash = bcrypt.hashSync(password, 10)
  await execute(
    `INSERT INTO "Employee" (id, name, email, role, department, avatar, status, phone, location, "jiraAccountId", "joinDate", "createdAt", "passwordHash")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
    [
      randomUUID(), data.name, data.email, data.role, data.department,
      initials, "offline", data.phone, data.location, "",
      new Date().toISOString(), new Date().toISOString(), passwordHash,
    ]
  )
  // Fire-and-forget welcome email
  sendWelcomeEmail({ name: data.name, email: data.email, role: data.role, department: data.department, password }).catch(() => {})
  revalidatePath("/employees")
  revalidatePath("/dashboard")
}

export async function resetEmployeePassword(id: string, newPassword: string) {
  const hash = bcrypt.hashSync(newPassword, 10)
  await execute(`UPDATE "Employee" SET "passwordHash" = $1 WHERE id = $2`, [hash, id])
  const emp = await queryOne<{ name: string; email: string }>(`SELECT name, email FROM "Employee" WHERE id = $1`, [id])
  if (emp) sendPasswordResetEmail({ name: emp.name, email: emp.email, newPassword }).catch(() => {})
}

export async function updateEmployee(id: string, data: {
  name: string; email: string; role: string; department: string
  phone: string; location: string; jiraAccountId: string
}) {
  const initials = data.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
  await execute(
    `UPDATE "Employee" SET name=$1, email=$2, role=$3, department=$4, avatar=$5, phone=$6, location=$7, "jiraAccountId"=$8 WHERE id=$9`,
    [data.name, data.email, data.role, data.department, initials, data.phone, data.location, data.jiraAccountId, id]
  )
  revalidatePath(`/employees/${id}`)
  revalidatePath("/employees")
  revalidatePath("/dashboard")
}

