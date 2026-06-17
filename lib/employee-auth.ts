import { cookies } from "next/headers"
import { db, serialize } from "@/lib/db"

export type EmployeeSession = {
  id: string; name: string; avatar: string; role: string
  department: string; status: string; email: string; jiraAccountId: string
}

export async function getEmployeeSession(): Promise<EmployeeSession | null> {
  const store = await cookies()
  const id = store.get("employee_token")?.value
  if (!id) return null
  const row = db.prepare(
    "SELECT id, name, avatar, role, department, status, email, jiraAccountId FROM Employee WHERE id = ?"
  ).get(id)
  if (!row) return null
  return serialize(row) as EmployeeSession
}
