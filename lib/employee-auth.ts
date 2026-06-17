import { cookies } from "next/headers"
import { queryOne } from "@/lib/db"

export type EmployeeSession = {
  id: string; name: string; avatar: string; role: string
  department: string; status: string; email: string; jiraAccountId: string
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
  const store = await cookies()
  const id = store.get("employee_token")?.value
  if (!id) return null
  const row = await queryOne<EmployeeSession>(
    `SELECT id, name, avatar, role, department, status, email, "jiraAccountId" FROM "Employee" WHERE id = $1`,
    [id]
  )
  return row ?? null
}
