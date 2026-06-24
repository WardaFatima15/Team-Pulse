import { cookies } from "next/headers"
import { queryOne, queryAll } from "@/lib/db"

export type WorkspaceInfo = {
  empId: string
  orgName: string
  role: string
  department: string
}

export type EmployeeSession = {
  id: string; name: string; avatar: string; role: string
  department: string; status: string; email: string; jiraAccountId: string
  orgName: string
  organizationId: string
  workspaces: WorkspaceInfo[]
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
  const store = await cookies()
  const id = store.get("employee_token")?.value
  if (!id) return null

  const row = await queryOne<EmployeeSession & { organizationId: string }>(
    `SELECT e.id, e.name, e.avatar, e.role, e.department, e.status, e.email, e."jiraAccountId", e."organizationId", o.name as "orgName"
     FROM "Employee" e
     LEFT JOIN "Organization" o ON o.id = e."organizationId"
     WHERE e.id = $1`,
    [id]
  )
  if (!row) return null

  // Find all other workspaces this email belongs to
  const allWorkspaces = await queryAll<WorkspaceInfo>(
    `SELECT e.id as "empId", o.name as "orgName", e.role, e.department
     FROM "Employee" e
     LEFT JOIN "Organization" o ON o.id = e."organizationId"
     WHERE e.email = $1
     ORDER BY o.name`,
    [row.email]
  )

  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    role: row.role,
    department: row.department,
    status: row.status,
    email: row.email,
    jiraAccountId: row.jiraAccountId,
    orgName: row.orgName ?? "My Workspace",
    organizationId: row.organizationId,
    workspaces: allWorkspaces,
  }
}
