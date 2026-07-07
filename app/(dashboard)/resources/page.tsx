import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import { queryAll } from "@/lib/db"
import ResourcesClient from "./ResourcesClient"

export default async function ResourcesPage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  const resources = await queryAll<{
    id: string; name: string; avatar: string; role: string; department: string
    accessRole: string; availabilityStatus: string; status: string
  }>(
    `SELECT id, name, avatar, role, department, "accessRole", "availabilityStatus", status
     FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`,
    [admin.organizationId]
  )

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Resources</h1>
        <p className="text-white/50 text-sm mt-1">Staffing view of the team — who&apos;s available, assigned, or on hold. Client assignment is still ahead.</p>
      </div>
      <ResourcesClient resources={resources} />
    </div>
  )
}
