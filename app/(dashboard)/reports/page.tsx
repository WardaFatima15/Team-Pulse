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
    <div className="max-w-5xl print:max-w-full">
      <div className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold text-white">Daily Reports</h1>
        <p className="text-white/50 text-sm mt-1">Per-employee AI summaries, a team-wide daily view, or a client-ready weekly report you can export as a PDF</p>
      </div>
      <ReportsClient employees={employees} />
    </div>
  )
}
