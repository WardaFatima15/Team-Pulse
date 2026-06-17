"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pin, Plus, Megaphone, X } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { createAnnouncement, toggleAnnouncementPin, deleteAnnouncement } from "@/lib/actions"
import { useRouter } from "next/navigation"

type Announcement = { id: string; title: string; body: string; authorName: string; pinned: number; createdAt: string }

export default function AnnouncementsClient({ announcements }: { announcements: Announcement[] }) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [pinned, setPinned] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function handleCreate() {
    if (!title.trim() || !body.trim()) return
    startTransition(async () => {
      await createAnnouncement(title.trim(), body.trim(), pinned)
      setTitle(""); setBody(""); setPinned(false); setShowForm(false)
      router.refresh()
    })
  }

  function handlePin(id: string, currentPinned: number) {
    startTransition(async () => { await toggleAnnouncementPin(id, currentPinned === 0); router.refresh() })
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteAnnouncement(id); router.refresh() })
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{announcements.length} total · {announcements.filter(a => a.pinned).length} pinned</p>
        <Button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 hover:bg-indigo-700 text-white h-8" size="sm">
          <Plus className="size-3.5 mr-1.5" />New Announcement
        </Button>
      </div>

      {showForm && (
        <Card className="border-indigo-200 bg-indigo-50/40">
          <CardContent className="pt-5 space-y-3">
            <Input placeholder="Announcement title..." value={title} onChange={e => setTitle(e.target.value)} className="bg-white" />
            <textarea placeholder="Write your announcement here..." value={body} onChange={e => setBody(e.target.value)} rows={4}
              className="w-full px-3 py-2 rounded-lg border border-input bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} className="rounded" />
                Pin this announcement
              </label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="h-7">Cancel</Button>
                <Button size="sm" onClick={handleCreate} disabled={pending} className="h-7 bg-indigo-600 hover:bg-indigo-700 text-white">
                  {pending ? "Publishing..." : "Publish"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {announcements.map(ann => (
          <Card key={ann.id} className={ann.pinned ? "border-indigo-200" : ""}>
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${ann.pinned ? "bg-indigo-100" : "bg-slate-100"}`}>
                  {ann.pinned ? <Pin className="size-4 text-indigo-500" /> : <Megaphone className="size-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 text-sm">{ann.title}</p>
                      {ann.pinned ? <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-medium">Pinned</span> : null}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handlePin(ann.id, ann.pinned)} disabled={pending} title={ann.pinned ? "Unpin" : "Pin"} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-500 transition-colors"><Pin className="size-3.5" /></button>
                      <button onClick={() => handleDelete(ann.id)} disabled={pending} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-red-500 transition-colors"><X className="size-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{ann.body}</p>
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
        {announcements.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">No announcements yet.</div>}
      </div>
    </div>
  )
}
