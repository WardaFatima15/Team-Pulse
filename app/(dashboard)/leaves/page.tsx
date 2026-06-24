import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import LeavesClient from "./LeavesClient"

type Employee = { id: string; name: string; avatar: string; role: string; department: string }
type LeaveRequest = { id: string; employeeId: string; type: string; startDate: string; endDate: string; days: number; reason: string; status: string; appliedOn: string }

export default async function LeavesPage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId

  const [leaves, employees] = await Promise.all([
    queryAll<LeaveRequest>(`SELECT l.* FROM "LeaveRequest" l JOIN "Employee" e ON e.id = l."employeeId" WHERE e."organizationId" = $1 ORDER BY l."createdAt" DESC`, [orgId]),
    queryAll<Employee>(`SELECT id, name, avatar, role, department FROM "Employee" WHERE "organizationId" = $1`, [orgId]),
  ])
  return <LeavesClient leaves={leaves} employees={employees} />
}
