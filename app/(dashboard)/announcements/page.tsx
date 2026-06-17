import { queryAll } from "@/lib/db"
import AnnouncementsClient from "./AnnouncementsClient"

type Announcement = { id: string; title: string; body: string; authorName: string; pinned: number; createdAt: string }

export default async function AnnouncementsPage() {
  const announcements = await queryAll<Announcement>(`SELECT * FROM "Announcement" ORDER BY pinned DESC, "createdAt" DESC`)
  return <AnnouncementsClient announcements={announcements} />
}
