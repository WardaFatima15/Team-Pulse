"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"

// ── Leave Requests ────────────────────────────────────────────────────────────

export async function updateLeaveStatus(id: string, status: "approved" | "rejected") {
  db.prepare("UPDATE LeaveRequest SET status = ? WHERE id = ?").run(status, id)
  revalidatePath("/leaves")
  revalidatePath("/dashboard")
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export async function updateTicketStatus(id: string, status: string) {
  const now = new Date().toISOString()
  db.prepare("UPDATE Ticket SET status = ?, updatedAt = ? WHERE id = ?").run(status, now, id)
  revalidatePath("/tickets")
}

export async function addTicketReply(ticketId: string, message: string) {
  const now = new Date().toISOString()
  db.prepare(`INSERT INTO TicketReply (id, ticketId, authorId, authorName, isAdmin, message, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    randomUUID(), ticketId, "admin", "Admin", 1, message, now
  )
  db.prepare("UPDATE Ticket SET status = CASE WHEN status = 'open' THEN 'in-progress' ELSE status END, updatedAt = ? WHERE id = ?").run(now, ticketId)
  revalidatePath("/tickets")
}

// ── Announcements ─────────────────────────────────────────────────────────────

export async function createAnnouncement(title: string, body: string, pinned: boolean) {
  db.prepare(`INSERT INTO Announcement (id, title, body, authorId, authorName, pinned, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(
    randomUUID(), title, body, "admin", "Admin", pinned ? 1 : 0, new Date().toISOString()
  )
  revalidatePath("/announcements")
  revalidatePath("/dashboard")
}

export async function toggleAnnouncementPin(id: string, pinned: boolean) {
  db.prepare("UPDATE Announcement SET pinned = ? WHERE id = ?").run(pinned ? 1 : 0, id)
  revalidatePath("/announcements")
}

export async function deleteAnnouncement(id: string) {
  db.prepare("DELETE FROM Announcement WHERE id = ?").run(id)
  revalidatePath("/announcements")
}

// ── Employees ─────────────────────────────────────────────────────────────────

export async function updateEmployeeStatus(id: string, status: "online" | "away" | "offline") {
  db.prepare("UPDATE Employee SET status = ? WHERE id = ?").run(status, id)
  revalidatePath("/employees")
  revalidatePath("/dashboard")
}

export async function createEmployee(data: {
  name: string; email: string; role: string; department: string
  phone: string; location: string; password: string
}) {
  const initials = data.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
  const passwordHash = bcrypt.hashSync(data.password || "employee123", 10)
  db.prepare(`INSERT INTO Employee (id, name, email, role, department, avatar, status, phone, location, jiraAccountId, joinDate, createdAt, passwordHash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    randomUUID(), data.name, data.email, data.role, data.department,
    initials, "offline", data.phone, data.location, "", new Date().toISOString(), new Date().toISOString(), passwordHash
  )
  revalidatePath("/employees")
  revalidatePath("/dashboard")
}

export async function resetEmployeePassword(id: string, newPassword: string) {
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare("UPDATE Employee SET passwordHash = ? WHERE id = ?").run(hash, id)
}

export async function updateEmployee(id: string, data: {
  name: string; email: string; role: string; department: string
  phone: string; location: string; jiraAccountId: string
}) {
  const initials = data.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
  db.prepare(
    "UPDATE Employee SET name=?, email=?, role=?, department=?, avatar=?, phone=?, location=?, jiraAccountId=? WHERE id=?"
  ).run(data.name, data.email, data.role, data.department, initials, data.phone, data.location, data.jiraAccountId, id)
  revalidatePath(`/employees/${id}`)
  revalidatePath("/employees")
  revalidatePath("/dashboard")
}
