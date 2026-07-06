"use server"

import { revalidatePath } from "next/cache"
import { queryOne, queryAll, execute } from "@/lib/db"
import { randomUUID } from "crypto"
import { getActor } from "@/lib/actor"
import { getAdminSession } from "@/lib/admin-auth"

export type Project = {
  id: string
  name: string
  key: string
  color: string
  createdAt: string
  taskCount?: number
}

export type Task = {
  id: string
  projectId: string
  projectKey: string
  projectName: string
  projectColor: string
  number: number
  title: string
  description: string
  status: "todo" | "in_progress" | "in_review" | "done"
  priority: "low" | "medium" | "high" | "critical"
  assigneeId: string | null
  assigneeName: string | null
  assigneeAvatar: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

export async function getProjects(): Promise<Project[]> {
  const actor = await getActor()
  if (!actor) return []
  return queryAll<Project>(`
    SELECT p.id, p.name, p.key, p.color, p."createdAt", COUNT(t.id)::int AS "taskCount"
    FROM "Project" p
    LEFT JOIN "Task" t ON t."projectId" = p.id
    WHERE p."organizationId" = $1
    GROUP BY p.id
    ORDER BY p."createdAt" ASC
  `, [actor.organizationId])
}

export async function getTasks(projectId?: string, assigneeId?: string): Promise<Task[]> {
  const actor = await getActor()
  if (!actor) return []
  const conditions: string[] = [`p."organizationId" = $1`]
  const values: unknown[] = [actor.organizationId]
  if (projectId) { conditions.push(`t."projectId" = $${values.length + 1}`); values.push(projectId) }
  if (assigneeId) { conditions.push(`t."assigneeId" = $${values.length + 1}`); values.push(assigneeId) }
  const where = `WHERE ${conditions.join(" AND ")}`
  return queryAll<Task>(`
    SELECT
      t.id, t."projectId", p.key AS "projectKey", p.name AS "projectName", p.color AS "projectColor",
      t.number, t.title, t.description, t.status, t.priority,
      t."assigneeId", e.name AS "assigneeName", e.avatar AS "assigneeAvatar",
      t."dueDate", t."createdAt", t."updatedAt"
    FROM "Task" t
    JOIN "Project" p ON p.id = t."projectId"
    LEFT JOIN "Employee" e ON e.id = t."assigneeId"
    ${where}
    ORDER BY t."createdAt" DESC
  `, values)
}

export async function createProject(name: string, key: string, color: string) {
  const admin = await getAdminSession()
  if (!admin) throw new Error("Unauthorized")
  const existing = await queryOne(`SELECT id FROM "Project" WHERE key = $1`, [key.toUpperCase()])
  if (existing) throw new Error(`Project key "${key.toUpperCase()}" already exists`)
  await execute(
    `INSERT INTO "Project" (id, name, key, color, "organizationId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), name.trim(), key.toUpperCase().trim(), color, admin.organizationId, new Date().toISOString()]
  )
  revalidatePath("/tasks")
}

export async function deleteProject(id: string) {
  const admin = await getAdminSession()
  if (!admin) throw new Error("Unauthorized")
  const project = await queryOne<{ organizationId: string }>(`SELECT "organizationId" FROM "Project" WHERE id = $1`, [id])
  if (!project || project.organizationId !== admin.organizationId) return
  await execute(`DELETE FROM "Project" WHERE id = $1`, [id])
  revalidatePath("/tasks")
}

export async function createTask(data: {
  projectId: string
  title: string
  description: string
  status: string
  priority: string
  assigneeId: string
  dueDate: string
}) {
  const admin = await getAdminSession()
  if (!admin) throw new Error("Unauthorized")
  const project = await queryOne<{ organizationId: string }>(`SELECT "organizationId" FROM "Project" WHERE id = $1`, [data.projectId])
  if (!project || project.organizationId !== admin.organizationId) throw new Error("Project not found")

  const row = await queryOne<{ max: number }>(`SELECT COALESCE(MAX(number), 0) AS max FROM "Task" WHERE "projectId" = $1`, [data.projectId])
  const number = (row?.max ?? 0) + 1
  const now = new Date().toISOString()
  await execute(
    `INSERT INTO "Task" (id, "projectId", number, title, description, status, priority, "assigneeId", "dueDate", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      randomUUID(), data.projectId, number,
      data.title.trim(), data.description.trim(),
      data.status, data.priority,
      data.assigneeId || null,
      data.dueDate || null,
      now, now,
    ]
  )
  revalidatePath("/tasks")
  revalidatePath("/employee/tasks")
}

export async function updateTask(id: string, data: {
  title?: string
  description?: string
  status?: string
  priority?: string
  assigneeId?: string | null
  dueDate?: string | null
}) {
  const actor = await getActor()
  if (!actor) throw new Error("Unauthorized")
  const task = await queryOne<{ organizationId: string }>(
    `SELECT p."organizationId" FROM "Task" t JOIN "Project" p ON p.id = t."projectId" WHERE t.id = $1`,
    [id]
  )
  if (!task || task.organizationId !== actor.organizationId) throw new Error("Task not found")

  const fields: string[] = []
  const values: unknown[] = []
  if (data.title !== undefined) { fields.push(`title = $${values.length + 1}`); values.push(data.title) }
  if (data.description !== undefined) { fields.push(`description = $${values.length + 1}`); values.push(data.description) }
  if (data.status !== undefined) { fields.push(`status = $${values.length + 1}`); values.push(data.status) }
  if (data.priority !== undefined) { fields.push(`priority = $${values.length + 1}`); values.push(data.priority) }
  if ("assigneeId" in data) { fields.push(`"assigneeId" = $${values.length + 1}`); values.push(data.assigneeId ?? null) }
  if ("dueDate" in data) { fields.push(`"dueDate" = $${values.length + 1}`); values.push(data.dueDate ?? null) }
  if (!fields.length) return
  fields.push(`"updatedAt" = $${values.length + 1}`)
  values.push(new Date().toISOString())
  values.push(id)
  await execute(`UPDATE "Task" SET ${fields.join(", ")} WHERE id = $${values.length}`, values)
  revalidatePath("/tasks")
  revalidatePath("/employee/tasks")
}

export async function deleteTask(id: string) {
  const admin = await getAdminSession()
  if (!admin) throw new Error("Unauthorized")
  const task = await queryOne<{ organizationId: string }>(
    `SELECT p."organizationId" FROM "Task" t JOIN "Project" p ON p.id = t."projectId" WHERE t.id = $1`,
    [id]
  )
  if (!task || task.organizationId !== admin.organizationId) return
  await execute(`DELETE FROM "Task" WHERE id = $1`, [id])
  revalidatePath("/tasks")
}
