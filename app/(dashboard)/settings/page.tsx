import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import { queryAll } from "@/lib/db"
import SettingsClient from "./SettingsClient"

type AdminRow = { id: string; name: string; email: string; createdAt: string }

export default async function SettingsPage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  const admins = await queryAll<AdminRow>(
    `SELECT id, COALESCE(name, 'Admin') as name, email, "createdAt"
     FROM "Admin"
     WHERE "organizationId" = $1
     ORDER BY "createdAt" ASC`,
    [admin.organizationId]
  )

  return (
    <SettingsClient
      currentAdminId={admin.id}
      currentAdminName={admin.name}
      currentAdminEmail={admin.email}
      orgName={admin.orgName}
      admins={admins}
    />
  )
}
