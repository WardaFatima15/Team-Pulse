import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import AnnouncementsClient from "./AnnouncementsClient"

type Announcement = { id: string; title: string; body: string; authorName: string; pinned: number; createdAt: string }

export default async function AnnouncementsPage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId

  const announcements = await queryAll<Announcement>(
    `SELECT * FROM "Announcement" WHERE "organizationId" = $1 ORDER BY pinned DESC, "createdAt" DESC`,
    [orgId]
  )
  return <AnnouncementsClient announcements={announcements} />
}
