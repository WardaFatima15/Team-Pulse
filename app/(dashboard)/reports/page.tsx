import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import ReportsClient from "./ReportsClient"

export default async function ReportsPage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId

  const employees = await queryAll<{
    id: string; name: string; role: string; department: string; avatar: string; status: string
  }>(`SELECT id, name, role, department, avatar, status FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`, [orgId])

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Daily Reports</h1>
        <p className="text-white/50 text-sm mt-1">AI summaries per employee, or one team-wide view of what everyone did on a given day</p>
      </div>
      <ReportsClient employees={employees} />
    </div>
  )
}
