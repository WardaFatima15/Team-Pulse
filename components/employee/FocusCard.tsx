"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setFocus } from "@/lib/employee-actions"
import { Target, Check, Pencil } from "lucide-react"
import { timeAgo } from "@/lib/utils"

export default function FocusCard({ focus, since }: { focus: string; since: string }) {
  const [editing, setEditing] = useState(!focus)
  const [text, setText] = useState(focus)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function save() {
    startTransition(async () => {
      await setFocus(text)
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <div className="bg-[#131318] rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/50 font-medium uppercase tracking-widest flex items-center gap-1.5">
          <Target className="size-3.5" /> What are you working on?
        </p>
        {!editing && focus && (
          <button onClick={() => setEditing(true)} className="text-xs text-white/40 hover:text-white/80 flex items-center gap-1">
            <Pencil className="size-3" /> Update
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2.5">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={200}
            rows={2}
            autoFocus
            placeholder="e.g. Building the checkout flow · Reviewing PRs · On a client call"
            className="w-full resize-none rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-[#512feb]"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save() } }}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/30">Your manager sees this live</span>
            <div className="flex gap-2">
              {focus && (
                <button onClick={() => { setText(focus); setEditing(false) }} disabled={pending}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:bg-white/5">Cancel</button>
              )}
              <button onClick={save} disabled={pending}
                className="text-xs px-3 py-1.5 rounded-lg bg-[#512feb] hover:bg-[#3f1fd4] text-white font-medium flex items-center gap-1 disabled:opacity-50">
                <Check className="size-3" /> {pending ? "Saving…" : "Set focus"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm font-medium text-white">{focus}</p>
          {since && <p className="text-xs text-white/40 mt-1">since {timeAgo(since)}</p>}
        </div>
      )}
    </div>
  )
}
