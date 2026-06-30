import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import { effectiveStatus } from "@/lib/presence"
import EmployeesClient from "./EmployeesClient"

export default async function EmployeesPage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId

  const rows = await queryAll<{
    id: string; name: string; email: string; role: string; department: string
    avatar: string; status: string; location: string; phone: string; lastSeenAt: string
  }>(`SELECT * FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`, [orgId])

  // Presence derived from heartbeats, not self-claimed
  const employees = rows.map(e => ({ ...e, status: effectiveStatus(e.status, e.lastSeenAt) }))

  return <EmployeesClient employees={employees} />
}
