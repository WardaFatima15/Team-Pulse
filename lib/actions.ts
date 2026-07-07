"use server"

import { queryOne, execute } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import { sendWelcomeEmail, sendPasswordResetEmail, sendAdminInviteEmail } from "@/lib/email"

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
  const admin = await getAdminSession()
  const adminName = admin?.orgName ? `${admin.orgName} Admin` : "Admin"
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "TicketReply" (id, "ticketId", "authorId", "authorName", "isAdmin", message, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [randomUUID(), ticketId, admin?.id ?? "admin", adminName, 1, message, now]
  )
  await execute(
    `UPDATE "Ticket" SET status = CASE WHEN status = 'open' THEN 'in-progress' ELSE status END, "updatedAt" = $1 WHERE id = $2`,
    [now, ticketId]
  )
  revalidatePath("/tickets")
}

// ── Announcements ─────────────────────────────────────────────────────────────

export async function createAnnouncement(title: string, body: string, pinned: boolean) {
  const admin = await getAdminSession()
  if (!admin) return
  await execute(
    `INSERT INTO "Announcement" (id, title, body, "authorId", "authorName", pinned, "organizationId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [randomUUID(), title, body, admin.id, "Admin", pinned ? 1 : 0, admin.organizationId, new Date().toISOString()]
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
  phone: string; location: string; password: string; shiftHours?: number; shiftStart?: string
  accessRole?: string
}) {
  const admin = await getAdminSession()
  if (!admin) throw new Error("Unauthorized")

  const initials = data.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  const password = data.password || "employee123"
  const passwordHash = bcrypt.hashSync(password, 10)
  try {
    await execute(
      `INSERT INTO "Employee" (id, name, email, role, department, avatar, status, phone, location, "jiraAccountId", "joinDate", "createdAt", "passwordHash", "organizationId", "shiftHours", "shiftStart", "accessRole")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        randomUUID(), data.name, data.email, data.role, data.department,
        initials, "offline", data.phone, data.location, "",
        new Date().toISOString(), new Date().toISOString(), passwordHash,
        admin.organizationId, data.shiftHours ?? 0, data.shiftStart ?? "", data.accessRole ?? "",
      ]
    )
  } catch (err: unknown) {
    throw new Error("Failed to create employee: " + String(err))
  }
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

export async function inviteAdmin(data: { name: string; email: string; password: string }) {
  const admin = await getAdminSession()
  if (!admin) throw new Error("Unauthorized")

  const passwordHash = bcrypt.hashSync(data.password, 10)
  try {
    await execute(
      `INSERT INTO "Admin" (id, name, email, "passwordHash", "organizationId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), data.name, data.email, passwordHash, admin.organizationId, new Date().toISOString()]
    )
  } catch (err: unknown) {
    const msg = String(err)
    if (msg.includes("unique") || msg.includes("duplicate")) throw new Error("An admin with this email already exists")
    throw new Error("Failed to add admin: " + msg)
  }

  sendAdminInviteEmail({ name: data.name, email: data.email, password: data.password, orgName: admin.orgName }).catch(() => {})
  revalidatePath("/settings")
}

export async function removeAdmin(id: string) {
  const admin = await getAdminSession()
  if (!admin) throw new Error("Unauthorized")
  if (id === admin.id) throw new Error("You cannot remove yourself")
  await execute(`DELETE FROM "Admin" WHERE id = $1 AND "organizationId" = $2`, [id, admin.organizationId])
  revalidatePath("/settings")
}

export async function updateEmployee(id: string, data: {
  name: string; email: string; role: string; department: string
  phone: string; location: string; jiraAccountId: string; shiftHours?: number; shiftStart?: string
  accessRole?: string
}) {
  const initials = data.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
  await execute(
    `UPDATE "Employee" SET name=$1, email=$2, role=$3, department=$4, avatar=$5, phone=$6, location=$7, "jiraAccountId"=$8, "shiftHours"=$9, "shiftStart"=$10, "accessRole"=$11 WHERE id=$12`,
    [data.name, data.email, data.role, data.department, initials, data.phone, data.location, data.jiraAccountId, data.shiftHours ?? 0, data.shiftStart ?? "", data.accessRole ?? "", id]
  )
  revalidatePath(`/employees/${id}`)
  revalidatePath("/employees")
  revalidatePath("/dashboard")
}

export async function updateAvailability(id: string, availabilityStatus: string) {
  const admin = await getAdminSession()
  if (!admin) throw new Error("Unauthorized")
  await execute(`UPDATE "Employee" SET "availabilityStatus" = $1 WHERE id = $2`, [availabilityStatus, id])
  revalidatePath("/resources")
  revalidatePath("/employees")
}
