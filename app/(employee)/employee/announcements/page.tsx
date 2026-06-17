import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { db } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Pin, Megaphone } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

type Announcement = { id: string; title: string; body: string; authorName: string; pinned: number; createdAt: string }

export default async function EmployeeAnnouncementsPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")

  const announcements = db.prepare(
    "SELECT * FROM Announcement ORDER BY pinned DESC, createdAt DESC"
  ).all() as Announcement[]

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Announcements</h1>
        <p className="text-sm text-slate-500 mt-0.5">{announcements.length} total · {announcements.filter(a => a.pinned).length} pinned</p>
      </div>

      <div className="space-y-3">
        {announcements.map(ann => (
          <Card key={ann.id} className={ann.pinned ? "border-indigo-200" : ""}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${ann.pinned ? "bg-indigo-100" : "bg-slate-100"}`}>
                  {ann.pinned
                    ? <Pin className="size-4 text-indigo-500" />
                    : <Megaphone className="size-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-semibold text-slate-900 text-sm">{ann.title}</p>
                    {ann.pinned ? <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">Pinned</span> : null}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{ann.body}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <span>{ann.authorName}</span>
                    <span>·</span>
                    <span>{format(new Date(ann.createdAt), "MMM d, yyyy")}</span>
                    <span>·</span>
                    <span>{formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {announcements.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Megaphone className="size-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No announcements yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
