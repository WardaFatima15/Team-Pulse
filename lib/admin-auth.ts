import { cookies } from "next/headers"
import { queryOne } from "@/lib/db"

export type AdminSession = {
  id: string
  name: string
  email: string
  organizationId: string
  orgName: string
}

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies()
  const adminId = store.get("auth_token")?.value
  if (!adminId) return null
  const row = await queryOne<AdminSession>(
    `SELECT a.id, COALESCE(a.name, 'Admin') as name, a.email, a."organizationId", COALESCE(o.name, 'My Workspace') as "orgName"
     FROM "Admin" a
     LEFT JOIN "Organization" o ON o.id = a."organizationId"
     WHERE a.id = $1`,
    [adminId]
  )
  return row ?? null
}
