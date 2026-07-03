"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X, Loader2, Trash2, Building2, Mail, Phone, DollarSign, Filter, Upload } from "lucide-react"
import { createLead, updateLead, deleteLead, type Lead, type LeadStage } from "@/lib/lead-actions"
import ImportLeadsModal from "./ImportLeadsModal"

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: "new",       label: "New",           color: "bg-white/10 text-white/70" },
  { key: "contacted", label: "Contacted",     color: "bg-blue-500/15 text-blue-400" },
  { key: "qualified", label: "Qualified",     color: "bg-amber-500/15 text-amber-400" },
  { key: "proposal",  label: "Proposal Sent", color: "bg-purple-500/15 text-purple-400" },
  { key: "won",       label: "Won",           color: "bg-green-500/15 text-green-400" },
]
const BOARD_STAGES = STAGES.map(s => s.key) // "lost" is filtered separately, not a board column

function stageMeta(stage: string) {
  return STAGES.find(s => s.key === stage) ?? { key: stage as LeadStage, label: stage, color: "bg-white/10 text-white/60" }
}
function money(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${v.toFixed(0)}`
}

function OwnerAvatar({ name }: { name: string }) {
  return (
    <span className="size-5 rounded-full bg-[#512feb]/15 flex items-center justify-center text-[10px] font-semibold text-[#7c5af5] shrink-0">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function LeadModal({ lead, onClose, onDelete }: { lead: Lead | null; onClose: () => void; onDelete?: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: lead?.name ?? "",
    company: lead?.company ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    value: lead ? String(lead.value) : "",
    stage: lead?.stage ?? "new",
    source: lead?.source ?? "",
    notes: lead?.notes ?? "",
  })

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); setError("") }

  function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required."); return }
    startTransition(async () => {
      try {
        const payload = { ...form, value: parseFloat(form.value) || 0 }
        if (lead) await updateLead(lead.id, payload)
        else await createLead(payload)
        router.refresh()
        onClose()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  const inputCls = "bg-white/5 border-white/10 text-white placeholder:text-white/30"
  const selectCls = "w-full text-sm border border-white/10 rounded-lg px-3 py-2 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#512feb]/50"

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131318] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="font-semibold text-white">{lead ? "Edit Lead" : "New Lead"}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Contact Name *</label>
              <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Jane Doe" autoFocus className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Company / Account</label>
              <Input value={form.company} onChange={e => set("company", e.target.value)} placeholder="Acme Inc." className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Email</label>
              <Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="jane@acme.com" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Phone</label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 555 0100" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Deal Value ($)</label>
              <Input type="number" min="0" step="1" value={form.value} onChange={e => set("value", e.target.value)} placeholder="0" className={inputCls} />
            </div>
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Stage</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)} className={selectCls}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-white/60 mb-1 block">Source</label>
              <Input value={form.source} onChange={e => set("source", e.target.value)} placeholder="Referral, website…" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-white/60 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Context, next steps…" rows={3}
              className="w-full text-sm border border-white/10 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#512feb]/50 bg-white/5 text-white placeholder:text-white/30" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
        <div className="flex items-center gap-3 px-5 py-4 border-t border-white/10">
          {lead && onDelete && (
            <button onClick={onDelete} disabled={pending}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mr-auto">
              <Trash2 className="size-3.5" /> Delete lead
            </button>
          )}
          <Button variant="outline" size="sm" onClick={onClose} disabled={pending} className="border-white/10 text-white/70 hover:bg-white/5 ml-auto">Cancel</Button>
          <Button size="sm" onClick={handleSubmit} disabled={pending || !form.name.trim()} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white">
            {pending ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            {lead ? "Save changes" : "Add lead"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function PipelineBoard({ leads, currentUserId, isAdmin }: {
  leads: Lead[]
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showNew, setShowNew] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editLead, setEditLead] = useState<Lead | null>(null)
  const [view, setView] = useState<"active" | "lost" | "all">("active")

  const visible = useMemo(() => {
    if (view === "active") return leads.filter(l => l.stage !== "lost")
    if (view === "lost") return leads.filter(l => l.stage === "lost")
    return leads
  }, [leads, view])

  const activeValue = leads.filter(l => l.stage !== "lost" && l.stage !== "won").reduce((s, l) => s + l.value, 0)
  const wonValue = leads.filter(l => l.stage === "won").reduce((s, l) => s + l.value, 0)
  const lostCount = leads.filter(l => l.stage === "lost").length

  function moveStage(lead: Lead, stage: LeadStage | "lost") {
    startTransition(async () => { await updateLead(lead.id, { stage }); router.refresh() })
  }

  function handleDelete(lead: Lead) {
    if (!confirm(`Delete lead "${lead.name}"?`)) return
    startTransition(async () => { await deleteLead(lead.id); router.refresh() })
  }

  const canDelete = (lead: Lead) => isAdmin || lead.ownerId === currentUserId

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4">
          <p className="text-xl font-bold text-white">{money(activeValue)}</p>
          <p className="text-xs text-white/50 mt-0.5">Active pipeline value</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xl font-bold text-green-400">{money(wonValue)}</p>
          <p className="text-xs text-white/50 mt-0.5">Won value</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xl font-bold text-white">{leads.length}</p>
          <p className="text-xs text-white/50 mt-0.5">Total leads · {lostCount} lost</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-white/8 rounded-xl p-1">
          {([
            { key: "active", label: "Active" },
            { key: "lost", label: "Lost" },
            { key: "all", label: "All" },
          ] as const).map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === v.key ? "bg-[#131318] shadow-sm text-white" : "text-white/50 hover:text-white/80"}`}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="border-white/10 text-white/70 hover:bg-white/8">
            <Upload className="size-3.5 mr-1" /> Import Excel
          </Button>
          <Button size="sm" onClick={() => setShowNew(true)} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white">
            <Plus className="size-3.5 mr-1" /> Add Lead
          </Button>
        </div>
      </div>

      {view === "active" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {STAGES.map(col => {
            const colLeads = visible.filter(l => l.stage === col.key)
            return (
              <div key={col.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${col.color}`}>{col.label}</span>
                  <span className="text-xs text-white/40 font-medium">{colLeads.length}</span>
                </div>

                {colLeads.map(lead => (
                  <Card key={lead.id} className="cursor-pointer hover:ring-white/20 transition-all" onClick={() => setEditLead(lead)}>
                    <CardContent className="pt-3.5 pb-3.5 px-3.5">
                      <p className="text-sm font-medium text-white mb-0.5 line-clamp-1">{lead.name}</p>
                      {lead.company && (
                        <p className="text-xs text-white/50 flex items-center gap-1 mb-2">
                          <Building2 className="size-3 shrink-0" /> {lead.company}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#7c5af5] flex items-center gap-0.5">
                          <DollarSign className="size-3" />{lead.value > 0 ? money(lead.value).replace("$", "") : "—"}
                        </span>
                        <OwnerAvatar name={lead.ownerName} />
                      </div>
                      <div className="mt-2.5 pt-2.5 border-t border-white/10 flex gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
                        {col.key !== "won" && (
                          <button onClick={() => moveStage(lead, BOARD_STAGES[BOARD_STAGES.indexOf(col.key) + 1] ?? "won")}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-white/50 hover:border-[#512feb]/50 hover:text-[#7c5af5] transition-colors">
                            → {stageMeta(BOARD_STAGES[BOARD_STAGES.indexOf(col.key) + 1] ?? "won").label}
                          </button>
                        )}
                        {col.key !== "lost" && (
                          <button onClick={() => moveStage(lead, "lost")}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-white/40 hover:border-red-500/50 hover:text-red-400 transition-colors">
                            Mark lost
                          </button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {colLeads.length === 0 && (
                  <div className="border-2 border-dashed border-white/8 rounded-xl h-20 flex items-center justify-center">
                    <span className="text-xs text-white/25">No leads</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map(lead => (
            <Card key={lead.id} className="cursor-pointer hover:ring-white/20 transition-all" onClick={() => setEditLead(lead)}>
              <CardContent className="py-3.5 px-4 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{lead.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${stageMeta(lead.stage).color}`}>{stageMeta(lead.stage).label}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                    {lead.company && <span className="flex items-center gap-1"><Building2 className="size-3" />{lead.company}</span>}
                    {lead.email && <span className="flex items-center gap-1"><Mail className="size-3" />{lead.email}</span>}
                    {lead.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{lead.phone}</span>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-white shrink-0">{lead.value > 0 ? money(lead.value) : "—"}</span>
                <OwnerAvatar name={lead.ownerName} />
                {canDelete(lead) && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(lead) }} className="text-white/30 hover:text-red-400 shrink-0">
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
          {visible.length === 0 && (
            <div className="text-center py-12 text-white/40 text-sm flex flex-col items-center gap-2">
              <Filter className="size-5 text-white/20" />
              No leads in this view.
            </div>
          )}
        </div>
      )}

      {showNew && <LeadModal lead={null} onClose={() => setShowNew(false)} />}
      {showImport && <ImportLeadsModal onClose={() => setShowImport(false)} />}
      {editLead && (
        <LeadModal
          lead={editLead}
          onClose={() => setEditLead(null)}
          onDelete={canDelete(editLead) ? () => { handleDelete(editLead); setEditLead(null) } : undefined}
        />
      )}
    </div>
  )
}
