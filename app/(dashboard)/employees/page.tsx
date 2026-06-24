import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import EmployeesClient from "./EmployeesClient"

export default async function EmployeesPage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId

  const employees = await queryAll<{
    id: string; name: string; email: string; role: string; department: string
    avatar: string; status: string; location: string; phone: string
  }>(`SELECT * FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`, [orgId])

  return <EmployeesClient employees={employees} />
}
