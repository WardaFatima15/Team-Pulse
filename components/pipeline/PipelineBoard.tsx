"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, X, Loader2, Trash2, Building2, Mail, Phone, DollarSign, Filter, Upload, ListPlus, Info, ChevronDown, ChevronUp, CalendarClock, CheckCircle2 } from "lucide-react"
import { createLead, updateLead, deleteLead, markContacted, type Lead, type LeadStage } from "@/lib/lead-actions"
import ImportLeadsModal from "./ImportLeadsModal"

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: "new",             label: "New Lead",        color: "bg-white/10 text-white/70" },
  { key: "connected",       label: "Connected",       color: "bg-cyan-500/15 text-cyan-400" },
  { key: "pitched",         label: "Pitched",         color: "bg-blue-500/15 text-blue-400" },
  { key: "interested",      label: "Interested",      color: "bg-amber-500/15 text-amber-400" },
  { key: "call_booked",     label: "Call Booked",     color: "bg-indigo-500/15 text-indigo-400" },
  { key: "proposal_needed", label: "Proposal Needed", color: "bg-orange-500/15 text-orange-400" },
  { key: "proposal_sent",   label: "Proposal Sent",   color: "bg-purple-500/15 text-purple-400" },
  { key: "negotiation",     label: "Negotiation",     color: "bg-pink-500/15 text-pink-400" },
  { key: "follow_up_later", label: "Follow-Up Later", color: "bg-yellow-500/15 text-yellow-400" },
  { key: "won",             label: "Closed Won",      color: "bg-green-500/15 text-green-400" },
]
const LOST_META = { key: "lost" as LeadStage, label: "Closed Lost", color: "bg-red-500/15 text-red-400" }
const BOARD_STAGES = STAGES.map(s => s.key) // "lost" is filtered separately, not a board column

function stageMeta(stage: string) {
  if (stage === "lost") return LOST_META
  return STAGES.find(s => s.key === stage) ?? { key: stage as LeadStage, label: stage, color: "bg-white/10 text-white/60" }
}
function isOverdue(nextFollowUpAt: string) {
  if (!nextFollowUpAt) return false
  return new Date(nextFollowUpAt).getTime() < Date.now()
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
    title: lead?.title ?? "",
    linkedinUrl: lead?.linkedinUrl ?? "",
    location: lead?.location ?? "",
    industry: lead?.industry ?? "",
    companySize: lead?.companySize ?? "",
    painPoint: lead?.painPoint ?? "",
    offerPitched: lead?.offerPitched ?? "",
    resourceTypePitched: lead?.resourceTypePitched ?? "",
    nextFollowUpAt: lead?.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "",
  })
  const [showSalesDetails, setShowSalesDetails] = useState(false)
  // Arbitrary extra fields — imported columns that don't fit the core schema
  // (e.g. "Title", "Location") land here instead of being dropped, and
  // anyone can add more of their own on any lead.
  const [customRows, setCustomRows] = useState<{ key: string; value: string }[]>(
    lead ? Object.entries(lead.customFields).map(([key, value]) => ({ key, value })) : []
  )

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); setError("") }
  function setCustomRow(i: number, field: "key" | "value", v: string) {
    setCustomRows(rows => rows.map((r, idx) => idx === i ? { ...r, [field]: v } : r))
  }
  function removeCustomRow(i: number) {
    setCustomRows(rows => rows.filter((_, idx) => idx !== i))
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError("Name is required."); return }
    startTransition(async () => {
      try {
        const customFields: Record<string, string> = {}
        for (const row of customRows) {
          if (row.key.trim()) customFields[row.key.trim()] = row.value.trim()
        }
        const { nextFollowUpAt, ...rest } = form
        const payload = {
          ...rest,
          value: parseFloat(form.value) || 0,
          nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : "",
          customFields,
        }
        if (lead) await updateLead(lead.id, payload)
        else await createLead(payload)
        router.refresh()
        onClose()
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })
  }

  function handleMarkContacted() {
    if (!lead) return
    startTransition(async () => { await markContacted(lead.id); router.refresh() })
  }

  const inputCls = "bg-white/5 border-white/10 text-white placeholder:text-white/30"
  const selectCls = "w-full text-sm border border-white/10 rounded-lg px-3 py-2 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#512feb]/50"

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#0d0d12] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                <option value="lost">{LOST_META.label}</option>
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

          <div className="pt-1 border-t border-white/10">
            <button onClick={() => setShowSalesDetails(v => !v)}
              className="flex items-center justify-between w-full text-xs font-medium text-white/60 hover:text-white/80 mt-3 mb-2">
              Sales Details
              {showSalesDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
            {showSalesDetails && (
              <div className="space-y-3 mb-1">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Title</label>
                    <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="VP of Sales" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">LinkedIn URL</label>
                    <Input value={form.linkedinUrl} onChange={e => set("linkedinUrl", e.target.value)} placeholder="linkedin.com/in/…" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Location</label>
                    <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Austin, TX" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Industry</label>
                    <Input value={form.industry} onChange={e => set("industry", e.target.value)} placeholder="SaaS" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Company Size</label>
                    <Input value={form.companySize} onChange={e => set("companySize", e.target.value)} placeholder="11-50" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-white/60 mb-1 block">Pain Point</label>
                  <Input value={form.painPoint} onChange={e => set("painPoint", e.target.value)} placeholder="What's not working for them" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Offer Pitched</label>
                    <Input value={form.offerPitched} onChange={e => set("offerPitched", e.target.value)} placeholder="AI Automation Proposal" className={inputCls} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Resource Type Pitched</label>
                    <Input value={form.resourceTypePitched} onChange={e => set("resourceTypePitched", e.target.value)} placeholder="Full Stack Developer" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="text-xs font-medium text-white/60 mb-1 block">Next Follow-Up</label>
                    <Input type="date" value={form.nextFollowUpAt} onChange={e => set("nextFollowUpAt", e.target.value)} className={inputCls} />
                  </div>
                  {lead && (
                    <div>
                      <label className="text-xs font-medium text-white/60 mb-1 block">Last Contacted</label>
                      <button onClick={handleMarkContacted} disabled={pending}
                        className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:border-green-500/40 hover:text-green-400 transition-colors">
                        <CheckCircle2 className="size-3.5" />
                        {lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString() : "Mark contacted today"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-1 border-t border-white/10">
            <div className="flex items-center justify-between mt-3 mb-2">
              <label className="text-xs font-medium text-white/60">Additional Details</label>
              <button
                onClick={() => setCustomRows(rows => [...rows, { key: "", value: "" }])}
                className="text-xs text-[#7c5af5] hover:underline flex items-center gap-1"
              >
                <ListPlus className="size-3.5" /> Add field
              </button>
            </div>
            {customRows.length === 0 && (
              <p className="text-xs text-white/30">No extra fields — imported columns like Title or Location show up here.</p>
            )}
            <div className="space-y-2">
              {customRows.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={row.key} onChange={e => setCustomRow(i, "key", e.target.value)}
                    placeholder="Field name" className={`${inputCls} w-2/5`} />
                  <Input value={row.value} onChange={e => setCustomRow(i, "value", e.target.value)}
                    placeholder="Value" className={`${inputCls} flex-1`} />
                  <button onClick={() => removeCustomRow(i)} className="text-white/30 hover:text-red-400 shrink-0 px-1">
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
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
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${view === v.key ? "bg-[#0d0d12] shadow-sm text-white" : "text-white/50 hover:text-white/80"}`}>
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
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map(col => {
            const colLeads = visible.filter(l => l.stage === col.key)
            return (
              <div key={col.key} className="space-y-3 w-64 shrink-0">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-[10px] uppercase tracking-[0.12em] font-semibold px-2.5 py-1 rounded-full ${col.color}`}>{col.label}</span>
                  <span className="font-mono text-xs text-white/35 tabular-nums">{colLeads.length}</span>
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
                        <div className="flex items-center gap-1.5">
                          {isOverdue(lead.nextFollowUpAt) && (
                            <span title="Follow-up overdue" className="text-amber-400">
                              <CalendarClock className="size-3" />
                            </span>
                          )}
                          {Object.keys(lead.customFields).length > 0 && (
                            <span title={`${Object.keys(lead.customFields).length} additional field(s)`} className="text-white/25">
                              <Info className="size-3" />
                            </span>
                          )}
                          <OwnerAvatar name={lead.ownerName} />
                        </div>
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
                {Object.keys(lead.customFields).length > 0 && (
                  <span title={`${Object.keys(lead.customFields).length} additional field(s)`} className="text-white/25 shrink-0">
                    <Info className="size-3.5" />
                  </span>
                )}
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
