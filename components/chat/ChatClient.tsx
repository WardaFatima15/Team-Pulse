"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Hash, MessageSquare, Users, Phone, PhoneIncoming, Plus, X, Check,
  Trash2, Pencil, ChevronDown, Send, Settings,
} from "lucide-react"
import CallModal from "./CallModal"

// ── Types ──────────────────────────────────────────────────────────────────────
type Contact = { id: string; name: string; role?: string; avatar?: string }
type Msg = { id: string; fromId: string; fromName: string; content: string; createdAt: string; edited?: boolean }
type Group = { id: string; name: string; memberCount: number; createdAt: string }
type IncomingCall = { id: string; callerId: string; callerName: string; sdpOffer: string }
type ActiveCall =
  | { mode: "caller"; calleeId: string; calleeName: string }
  | { mode: "callee"; callId: string; callerName: string; sdpOffer: string }

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
}

function fmtDateSep(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d >= today) return "Today"
  if (d >= yesterday) return "Yesterday"
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

function isGrouped(msg: Msg, prev: Msg | undefined) {
  if (!prev || msg.fromId !== prev.fromId) return false
  return new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000
}

function ChatHeader({ name, sub, onCall, onSettings }: { name: string; sub?: string; onCall?: () => void; onSettings?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-5 h-14 border-b border-slate-100 bg-white shrink-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold text-slate-900 text-sm truncate">{name}</p>
          <ChevronDown className="size-3.5 text-slate-400 shrink-0" />
        </div>
        {sub && <p className="text-[11px] text-slate-400">{sub}</p>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {onSettings && (
          <button
            onClick={onSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all"
          >
            <Settings className="size-3.5" /> Manage
          </button>
        )}
        {onCall && (
          <button
            onClick={onCall}
            title="Start call"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-[#512feb] hover:text-white hover:border-[#512feb] transition-all"
          >
            <Phone className="size-3.5" /> Call
          </button>
        )}
      </div>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Av({ name, size = 9 }: { name: string; size?: number }) {
  const cls = `rounded-lg bg-[#512feb]/15 text-[#512feb] font-bold flex items-center justify-center shrink-0 text-xs`
  return (
    <span className={cls} style={{ width: size * 4, height: size * 4 }}>
      {initials(name)}
    </span>
  )
}

// ── Slack-style message row ───────────────────────────────────────────────────
function MessageRow({
  msg, prev, currentUserId,
  onDelete, onEdit,
}: {
  msg: Msg
  prev: Msg | undefined
  currentUserId: string
  onDelete: (id: string) => void
  onEdit: (id: string, content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(msg.content)
  const grouped = isGrouped(msg, prev)
  const isMe = msg.fromId === currentUserId
  const editRef = useRef<HTMLTextAreaElement>(null)

  function startEdit() { setEditing(true); setEditVal(msg.content) }
  useEffect(() => { if (editing) editRef.current?.focus() }, [editing])

  function saveEdit() {
    if (editVal.trim() && editVal.trim() !== msg.content) onEdit(msg.id, editVal.trim())
    setEditing(false)
  }

  function handleEditKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit() }
    if (e.key === "Escape") setEditing(false)
  }

  return (
    // `group` enables CSS group-hover on children — avoids the JS onMouseLeave bug
    // where the action bar at negative top offset exits the div's bounding box
    <div className={`group relative flex gap-3 px-4 py-1.5 hover:bg-slate-50/80 rounded transition-colors ${grouped ? "mt-0" : "mt-3"}`}>
      {/* Avatar column */}
      <div className="w-9 shrink-0 pt-0.5">
        {!grouped ? (
          <Av name={msg.fromName} />
        ) : (
          <span className="text-[9px] text-slate-300 font-mono leading-none select-none opacity-0 group-hover:opacity-100 transition-opacity w-9 text-right block pt-1.5">
            {fmtTime(msg.createdAt)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-16">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-bold text-sm text-slate-900">{msg.fromName}</span>
            {isMe && <span className="text-[10px] text-[#512feb] font-medium">You</span>}
            <span className="text-[11px] text-slate-400">{fmtTime(msg.createdAt)}</span>
          </div>
        )}

        {editing ? (
          <div className="mt-1">
            <textarea
              ref={editRef}
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onKeyDown={handleEditKey}
              className="w-full text-sm text-slate-800 border border-[#512feb]/40 rounded-lg px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-[#512feb]/30 bg-white"
              rows={Math.min(6, editVal.split("\n").length + 1)}
            />
            <div className="flex items-center gap-2 mt-1.5">
              <button onClick={saveEdit} className="text-[11px] bg-[#512feb] text-white px-2.5 py-1 rounded-md hover:bg-[#3f1fd4]">Save</button>
              <button onClick={() => setEditing(false)} className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md hover:bg-slate-100">Cancel</button>
              <span className="text-[10px] text-slate-400">Enter to save · Esc to cancel</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-800 whitespace-pre-wrap break-words leading-relaxed">
            {msg.content}
            {msg.edited && <span className="text-[10px] text-slate-400 ml-1">(edited)</span>}
          </p>
        )}
      </div>

      {/* Action bar — CSS group-hover keeps it visible while cursor moves to it */}
      {isMe && !editing && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg shadow-sm px-1 py-0.5 z-10">
          <button
            onClick={startEdit}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors text-[11px] font-medium"
          >
            <Pencil className="size-3" /> Edit
          </button>
          <div className="w-px h-4 bg-slate-200" />
          <button
            onClick={() => onDelete(msg.id)}
            className="flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors text-[11px] font-medium"
          >
            <Trash2 className="size-3" /> Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Slack-style message input ─────────────────────────────────────────────────
function MessageInput({
  placeholder, onSend, disabled,
}: {
  placeholder: string
  onSend: (content: string) => Promise<void>
  disabled?: boolean
}) {
  const [value, setValue] = useState("")
  const [sending, setSending] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  async function send() {
    if (!value.trim() || sending || disabled) return
    setSending(true)
    const content = value; setValue("")
    await onSend(content).finally(() => setSending(false))
    ref.current?.focus()
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Auto-resize
  useEffect(() => {
    const el = ref.current; if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 160) + "px"
  }, [value])

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm focus-within:border-[#512feb]/50 focus-within:shadow-[0_0_0_3px_rgba(81,47,235,0.08)] transition-all">
        <textarea
          ref={ref}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="w-full px-4 pt-3 pb-2 text-sm text-slate-900 placeholder-slate-400 resize-none outline-none bg-transparent leading-relaxed"
          style={{ minHeight: 44, maxHeight: 160 }}
        />
        <div className="flex items-center justify-between px-3 pb-2">
          <div className="flex items-center gap-0.5 text-slate-400">
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono border border-slate-200 text-slate-400">Shift+↩</span>
            <span className="text-[10px] text-slate-400 ml-1">new line</span>
          </div>
          <button
            onClick={send}
            disabled={!value.trim() || sending || disabled}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#512feb] text-white hover:bg-[#3f1fd4] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="size-3.5" />
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New Group Modal ────────────────────────────────────────────────────────────
function NewGroupModal({
  contacts, onClose, onCreate,
}: {
  contacts: Contact[]
  onClose: () => void
  onCreate: (group: Group) => void
}) {
  const [name, setName] = useState("")
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  function toggle(id: string) {
    setSel(p => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function create() {
    if (!name.trim() || sel.size === 0) return
    setSaving(true)
    const members = contacts.filter(c => sel.has(c.id)).map(c => ({ id: c.id, name: c.name }))
    const res = await fetch("/api/chat/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), members }),
    })
    if (res.ok) onCreate(await res.json())
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-900">Create a group</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Group name</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Design Team"
              autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#512feb] focus:ring-2 focus:ring-[#512feb]/20 transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Add members <span className="text-[#512feb]">({sel.size})</span>
            </label>
            <div className="space-y-0.5 max-h-52 overflow-y-auto rounded-lg border border-slate-100">
              {contacts.map(c => (
                <button key={c.id} onClick={() => toggle(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${sel.has(c.id) ? "bg-[#512feb]/5" : "hover:bg-slate-50"}`}>
                  <Av name={c.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                    {c.role && <p className="text-xs text-slate-400 truncate">{c.role}</p>}
                  </div>
                  <div className={`size-5 rounded border-2 flex items-center justify-center transition-colors ${sel.has(c.id) ? "border-[#512feb] bg-[#512feb]" : "border-slate-300"}`}>
                    {sel.has(c.id) && <Check className="size-3 text-white" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 px-5 pb-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={create} disabled={!name.trim() || sel.size === 0 || saving}
            className="flex-1 py-2.5 rounded-xl bg-[#512feb] hover:bg-[#3f1fd4] text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {saving ? "Creating…" : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Group Settings Modal ───────────────────────────────────────────────────────
type GroupMember = { id: string; name: string }

function GroupSettingsModal({
  group, contacts, currentUserId, onClose, onUpdate,
}: {
  group: Group
  contacts: Contact[]
  currentUserId: string
  onClose: () => void
  onUpdate: (updated: Group, members: GroupMember[]) => void
}) {
  const [name, setName] = useState(group.name)
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addSel, setAddSel] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/chat/groups/${group.id}`)
      .then(r => r.json())
      .then(d => { setMembers(d.members ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [group.id])

  const memberIds = new Set(members.map(m => m.id))
  const addable = contacts.filter(c => !memberIds.has(c.id))

  function toggleAdd(id: string) {
    setAddSel(p => {
      const n = new Set(p)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  async function save() {
    setSaving(true)
    const addMembers = contacts.filter(c => addSel.has(c.id)).map(c => ({ id: c.id, name: c.name }))
    const res = await fetch(`/api/chat/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || group.name, addMembers }),
    })
    if (res.ok) {
      const data = await res.json()
      onUpdate(
        { ...group, name: data.name, memberCount: data.members?.length ?? group.memberCount },
        data.members ?? members
      )
    }
    setSaving(false)
  }

  async function removeMember(memberId: string) {
    await fetch(`/api/chat/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeMembers: [memberId] }),
    })
    setMembers(prev => prev.filter(m => m.id !== memberId))
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <p className="font-bold text-slate-900">Group Settings</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X className="size-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Rename */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Group name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#512feb] focus:ring-2 focus:ring-[#512feb]/20 transition-all"
            />
          </div>

          {/* Current members */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Members ({members.length})
            </label>
            {loading ? (
              <p className="text-xs text-slate-400 py-2">Loading…</p>
            ) : (
              <div className="space-y-0.5 max-h-36 overflow-y-auto rounded-lg border border-slate-100">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2">
                    <Av name={m.name} />
                    <p className="flex-1 text-sm font-medium text-slate-800 truncate">{m.name}</p>
                    {m.id !== currentUserId && (
                      <button
                        onClick={() => removeMember(m.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors p-1 rounded"
                        title="Remove"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add members */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
              Add people {addSel.size > 0 && <span className="text-[#512feb]">({addSel.size} selected)</span>}
            </label>
            {addable.length === 0 ? (
              <p className="text-xs text-slate-400 py-2 px-1">Everyone is already in this group.</p>
            ) : (
              <div className="space-y-0.5 max-h-40 overflow-y-auto rounded-lg border border-slate-100">
                {addable.map(c => (
                  <button key={c.id} onClick={() => toggleAdd(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${addSel.has(c.id) ? "bg-[#512feb]/5" : "hover:bg-slate-50"}`}>
                    <Av name={c.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                      {c.role && <p className="text-xs text-slate-400 truncate">{c.role}</p>}
                    </div>
                    <div className={`size-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${addSel.has(c.id) ? "border-[#512feb] bg-[#512feb]" : "border-slate-300"}`}>
                      {addSel.has(c.id) && <Check className="size-3 text-white" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2.5 px-5 pb-5 pt-3 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-[#512feb] hover:bg-[#3f1fd4] text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ChatClient ───────────────────────────────────────────────────────────
export default function ChatClient({
  currentUserId, contacts,
}: {
  currentUserId: string
  contacts: Contact[]
}) {
  const [tab, setTab] = useState<"dm" | "groups">("dm")

  // DM
  const [selected, setSelected] = useState<Contact | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [unread, setUnread] = useState<Record<string, number>>({})
  const lastCreatedAt = useRef("")
  const dmEnd = useRef<HTMLDivElement>(null)
  const dmList = useRef<HTMLDivElement>(null)
  const dmAtBottom = useRef(true)

  // Groups
  const [groups, setGroups] = useState<Group[]>([])
  const [selGroup, setSelGroup] = useState<Group | null>(null)
  const [groupMsgs, setGroupMsgs] = useState<Msg[]>([])
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const lastGroupAt = useRef("")
  const grpEnd = useRef<HTMLDivElement>(null)
  const grpList = useRef<HTMLDivElement>(null)
  const grpAtBottom = useRef(true)

  // Calls
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)

  // ── DM logic ────────────────────────────────────────────────────────────────
  const fetchMsgs = useCallback(async (contact: Contact, since?: string) => {
    const url = `/api/chat/messages?with=${contact.id}${since ? `&since=${encodeURIComponent(since)}` : ""}`
    const r = await fetch(url); if (!r.ok) return []
    return r.json() as Promise<Msg[]>
  }, [])

  const markRead = useCallback(async (fromId: string) => {
    await fetch("/api/chat/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromId }) })
    setUnread(u => ({ ...u, [fromId]: 0 }))
  }, [])

  useEffect(() => {
    if (!selected) return
    lastCreatedAt.current = ""
    fetchMsgs(selected).then(msgs => {
      setMessages(msgs)
      if (msgs.length) lastCreatedAt.current = msgs[msgs.length - 1].createdAt
      setTimeout(() => dmEnd.current?.scrollIntoView(), 50)
    })
    markRead(selected.id)
  }, [selected, fetchMsgs, markRead])

  useEffect(() => {
    if (!selected) return
    const poll = async () => {
      const fresh = await fetchMsgs(selected, lastCreatedAt.current)
      if (!fresh.length) return
      setMessages(prev => {
        const ids = new Set(prev.map(m => m.id))
        const newOnes = fresh.filter(m => !ids.has(m.id))
        if (!newOnes.length) return prev
        lastCreatedAt.current = newOnes[newOnes.length - 1].createdAt
        return [...prev, ...newOnes]
      })
      if (dmAtBottom.current) setTimeout(() => dmEnd.current?.scrollIntoView({ behavior: "smooth" }), 50)
    }
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [selected, fetchMsgs])

  async function deleteDM(msgId: string) {
    await fetch(`/api/chat/messages/${msgId}`, { method: "DELETE" })
    setMessages(prev => prev.filter(m => m.id !== msgId))
  }

  async function editDM(msgId: string, content: string) {
    await fetch(`/api/chat/messages/${msgId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content, edited: true } : m))
  }

  // ── Groups logic ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/chat/groups").then(r => r.json()).then(setGroups).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selGroup) return
    lastGroupAt.current = ""
    fetch(`/api/chat/groups/${selGroup.id}/messages`).then(r => r.json()).then((msgs: Msg[]) => {
      setGroupMsgs(msgs)
      if (msgs.length) lastGroupAt.current = msgs[msgs.length - 1].createdAt
      setTimeout(() => grpEnd.current?.scrollIntoView(), 50)
    })
  }, [selGroup])

  useEffect(() => {
    if (!selGroup) return
    const poll = async () => {
      const since = lastGroupAt.current
      const url = `/api/chat/groups/${selGroup.id}/messages${since ? `?since=${encodeURIComponent(since)}` : ""}`
      const fresh: Msg[] = await fetch(url).then(r => r.json()).catch(() => [])
      if (!fresh.length) return
      setGroupMsgs(prev => {
        const ids = new Set(prev.map(m => m.id))
        const newOnes = fresh.filter(m => !ids.has(m.id))
        if (!newOnes.length) return prev
        lastGroupAt.current = newOnes[newOnes.length - 1].createdAt
        return [...prev, ...newOnes]
      })
      if (grpAtBottom.current) setTimeout(() => grpEnd.current?.scrollIntoView({ behavior: "smooth" }), 50)
    }
    const id = setInterval(poll, 3000)
    return () => clearInterval(id)
  }, [selGroup])

  async function deleteGroupMsg(msgId: string) {
    await fetch(`/api/chat/groups/${selGroup!.id}/messages/${msgId}`, { method: "DELETE" })
    setGroupMsgs(prev => prev.filter(m => m.id !== msgId))
  }

  async function editGroupMsg(msgId: string, content: string) {
    await fetch(`/api/chat/groups/${selGroup!.id}/messages/${msgId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }),
    })
    setGroupMsgs(prev => prev.map(m => m.id === msgId ? { ...m, content, edited: true } : m))
  }

  // ── Calls ────────────────────────────────────────────────────────────────────
  const [permError, setPermError] = useState<string | null>(null)

  useEffect(() => {
    if (activeCall) return
    const poll = async () => {
      const call: IncomingCall | null = await fetch("/api/calls/incoming")
        .then(r => r.json()).catch(() => null)
      // Always sync state from DB — if call is null, clears any stale notification
      // (previously `!incomingCall` check caused second calls to never ring after a missed/expired call)
      setIncomingCall(prev => {
        if (!call) return null
        if (prev?.id === call.id) return prev  // same call, stable reference
        return call
      })
    }
    const id = setInterval(poll, 2500)
    return () => clearInterval(id)
  }, [activeCall])

  async function checkPerms(): Promise<boolean> {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
      s.getTracks().forEach(t => t.stop())
      return true
    } catch {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true })
        s.getTracks().forEach(t => t.stop())
        return true
      } catch {
        setPermError("Microphone access is blocked. Click the camera icon in your browser's address bar to allow it, then try again.")
        setTimeout(() => setPermError(null), 8000)
        return false
      }
    }
  }

  async function initiateCall(calleeId: string, calleeName: string) {
    if (!await checkPerms()) return
    setActiveCall({ mode: "caller", calleeId, calleeName })
  }

  async function answerCall(call: IncomingCall) {
    if (!await checkPerms()) return
    setIncomingCall(null)
    setActiveCall({ mode: "callee", callId: call.id, callerName: call.callerName, sdpOffer: call.sdpOffer })
  }

  async function rejectCall() {
    if (!incomingCall) return
    await fetch(`/api/calls/${incomingCall.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rejected" }),
    }).catch(() => {})
    setIncomingCall(null)
  }

  // ── Render message list ───────────────────────────────────────────────────────
  function renderMessages(
    msgs: Msg[],
    listRef: React.RefObject<HTMLDivElement | null>,
    endRef: React.RefObject<HTMLDivElement | null>,
    atBottomRef: React.MutableRefObject<boolean>,
    onDelete: (id: string) => void,
    onEdit: (id: string, content: string) => void,
  ) {
    const byDate = msgs.reduce<{ date: string; msgs: Msg[] }[]>((acc, m) => {
      const d = m.createdAt.slice(0, 10)
      const last = acc[acc.length - 1]
      if (last?.date === d) last.msgs.push(m)
      else acc.push({ date: d, msgs: [m] })
      return acc
    }, [])

    return (
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto py-2"
        onScroll={() => {
          const el = listRef.current; if (!el) return
          atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
      >
        {byDate.map(({ date, msgs: dayMsgs }) => (
          <div key={date}>
            <div className="flex items-center gap-3 px-4 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs font-semibold text-slate-500 bg-white px-2">{fmtDateSep(date)}</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            {dayMsgs.map((msg, i) => (
              <MessageRow
                key={msg.id}
                msg={msg}
                prev={i > 0 ? dayMsgs[i - 1] : undefined}
                currentUserId={currentUserId}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </div>
        ))}
        <div ref={endRef} className="h-4" />
      </div>
    )
  }

  // ── Send helpers ──────────────────────────────────────────────────────────────
  async function sendDM(content: string) {
    if (!selected) return
    const res = await fetch("/api/chat/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toId: selected.id, toName: selected.name, content }),
    })
    const msg: Msg = await res.json()
    setMessages(prev => [...prev, msg])
    lastCreatedAt.current = msg.createdAt
    setTimeout(() => dmEnd.current?.scrollIntoView({ behavior: "smooth" }), 50)
  }

  async function sendGroup(content: string) {
    if (!selGroup) return
    const res = await fetch(`/api/chat/groups/${selGroup.id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }),
    })
    const msg: Msg = await res.json()
    setGroupMsgs(prev => [...prev, msg])
    lastGroupAt.current = msg.createdAt
    setTimeout(() => grpEnd.current?.scrollIntoView({ behavior: "smooth" }), 50)
  }

  // ── Sidebar item ─────────────────────────────────────────────────────────────
  function SidebarItem({ label, sub, unreadCount, active, onClick, icon }: {
    label: string; sub?: string; unreadCount?: number; active: boolean; onClick: () => void; icon?: React.ReactNode
  }) {
    return (
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-left transition-colors group ${active ? "bg-[#512feb] text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        {icon}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${unreadCount ? "font-bold" : ""} ${active ? "text-white" : "text-slate-800"}`}>{label}</p>
          {sub && <p className={`text-[10px] truncate ${active ? "text-white/70" : "text-slate-400"}`}>{sub}</p>}
        </div>
        {(unreadCount ?? 0) > 0 && !active && (
          <span className="size-5 rounded-full bg-[#512feb] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
            {unreadCount}
          </span>
        )}
      </button>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm"
        style={{ height: "calc(100vh - 9rem)", minHeight: 480 }}>

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <div className="w-60 shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col">
          {/* Tab switcher */}
          <div className="flex gap-1 px-3 pt-3 pb-2 border-b border-slate-200">
            <button onClick={() => setTab("dm")}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${tab === "dm" ? "bg-white shadow-sm text-slate-900 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
              Messages
            </button>
            <button onClick={() => setTab("groups")}
              className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-colors ${tab === "groups" ? "bg-white shadow-sm text-slate-900 border border-slate-200" : "text-slate-500 hover:text-slate-700"}`}>
              Groups
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
            {tab === "dm" ? (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 pb-1 pt-1">Direct Messages</p>
                {contacts.map(c => (
                  <SidebarItem
                    key={c.id}
                    label={c.name}
                    sub={c.role}
                    unreadCount={unread[c.id]}
                    active={selected?.id === c.id}
                    onClick={() => setSelected(c)}
                    icon={<Av name={c.name} size={7} />}
                  />
                ))}
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 pb-1 pt-1">Groups</p>
                {groups.map(g => (
                  <SidebarItem
                    key={g.id}
                    label={g.name}
                    sub={`${g.memberCount} members`}
                    active={selGroup?.id === g.id}
                    onClick={() => setSelGroup(g)}
                    icon={<Hash className="size-4 shrink-0 text-slate-400" />}
                  />
                ))}
                <button
                  onClick={() => setShowNewGroup(true)}
                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors mt-1"
                >
                  <Plus className="size-3.5" /> New Group
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Main area ───────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {tab === "dm" ? (
            selected ? (
              <>
                <ChatHeader
                  name={selected.name}
                  sub={selected.role}
                  onCall={() => initiateCall(selected.id, selected.name)}
                />
                {renderMessages(messages, dmList, dmEnd, dmAtBottom, deleteDM, editDM)}
                <MessageInput
                  placeholder={`Message ${selected.name}`}
                  onSend={sendDM}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <MessageSquare className="size-7 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-600 text-sm">Pick a conversation</p>
                  <p className="text-xs text-slate-400 mt-0.5">Select a contact to start messaging</p>
                </div>
              </div>
            )
          ) : (
            selGroup ? (
              <>
                <ChatHeader name={`# ${selGroup.name}`} sub={`${selGroup.memberCount} members`} onSettings={() => setShowGroupSettings(true)} />
                {renderMessages(groupMsgs, grpList, grpEnd, grpAtBottom, deleteGroupMsg, editGroupMsg)}
                <MessageInput
                  placeholder={`Message # ${selGroup.name}`}
                  onSend={sendGroup}
                />
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="size-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Users className="size-7 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-slate-600 text-sm">No group selected</p>
                  <p className="text-xs text-slate-400 mt-0.5">Select a group or create a new one</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Permission error toast ───────────────────────────────────────────── */}
      {permError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-xl flex items-center gap-2.5 max-w-md">
          <span className="text-lg shrink-0">⚠</span>
          <span>{permError}</span>
          <button onClick={() => setPermError(null)} className="ml-2 text-white/70 hover:text-white shrink-0"><X className="size-4" /></button>
        </div>
      )}

      {/* ── Incoming call banner ─────────────────────────────────────────────── */}
      {incomingCall && !activeCall && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#08080b] rounded-2xl shadow-2xl border border-white/10 p-4 w-80">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="size-12 rounded-xl bg-[#512feb]/20 flex items-center justify-center text-white font-bold text-lg">
                {initials(incomingCall.callerName)}
              </div>
              <span className="absolute -top-1 -right-1 size-4 rounded-full bg-green-400 border-2 border-[#08080b] animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{incomingCall.callerName}</p>
              <p className="text-white/50 text-xs flex items-center gap-1">
                <PhoneIncoming className="size-3" /> Incoming video call
              </p>
            </div>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => answerCall(incomingCall)}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-1.5"
            >
              <Phone className="size-4" /> Answer
            </button>
            <button
              onClick={rejectCall}
              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <X className="size-4" /> Decline
            </button>
          </div>
        </div>
      )}

      {/* ── Active call ──────────────────────────────────────────────────────── */}
      {activeCall && <CallModal {...activeCall} onEnd={() => setActiveCall(null)} />}

      {/* ── New group modal ───────────────────────────────────────────────────── */}
      {showNewGroup && (
        <NewGroupModal
          contacts={contacts}
          onClose={() => setShowNewGroup(false)}
          onCreate={group => {
            setGroups(prev => [group, ...prev])
            setSelGroup(group)
            setShowNewGroup(false)
            setTab("groups")
          }}
        />
      )}

      {/* ── Group settings modal ──────────────────────────────────────────────── */}
      {showGroupSettings && selGroup && (
        <GroupSettingsModal
          group={selGroup}
          contacts={contacts}
          currentUserId={currentUserId}
          onClose={() => setShowGroupSettings(false)}
          onUpdate={(updated) => {
            setGroups(prev => prev.map(g => g.id === updated.id ? updated : g))
            setSelGroup(updated)
            setShowGroupSettings(false)
          }}
        />
      )}
    </>
  )
}
