import { db, serialize } from "@/lib/db"
import AnnouncementsClient from "./AnnouncementsClient"

type Announcement = { id: string; title: string; body: string; authorName: string; pinned: number; createdAt: string }

export default function AnnouncementsPage() {
  const announcements = serialize(db.prepare("SELECT * FROM Announcement ORDER BY pinned DESC, createdAt DESC").all() as Announcement[])
  return <AnnouncementsClient announcements={announcements} />
}
