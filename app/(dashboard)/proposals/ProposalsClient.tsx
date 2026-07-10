"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, FileSignature, Download, Copy, Check, Plus, Trash2, ExternalLink, Globe, Sparkles, Save, Eye } from "lucide-react"
import {
  ALL_ROLES, PROJECT_TYPES, PROPOSAL_API_URL, PROPOSAL_FETCH_URL_API, PROPOSAL_AUDIT_API, PROPOSAL_STATUSES,
  type AuditResult, type SavedProposal, type ProposalStatus, type ProposalResult, type PdfPod,
} from "@/lib/proposal-roles"
import { saveProposal, updateProposalStatus, deleteProposal } from "@/lib/proposal-actions"
import { exportProposalPdf } from "@/lib/proposal-pdf"

type LeadOption = {
  id: string; name: string; company: string
  painPoint: string; offerPitched: string; resourceTypePitched: string
}

type RoleRow = { roleId: string; count: number }

type ResultMeta = {
  leadId: string; clientName: string; projectType: string
  totalHeadcount: number; totalMonthly: number
  pods: PdfPod[]; timeline: string
}

// Content persisted for a saved proposal — the generated AI content plus
// enough of the team/timeline snapshot to re-render the same PDF later.
type StoredProposalContent = { ai: ProposalResult; pods: PdfPod[]; timeline: string }

function isStoredContent(c: unknown): c is StoredProposalContent {
  return !!c && typeof c === "object" && "ai" in c
}

const STATUS_META: Record<ProposalStatus, { label: string; color: string }> = {
  draft:          { label: "Draft",          color: "bg-white/10 text-white/60" },
  sent:           { label: "Sent",           color: "bg-blue-500/15 text-blue-400" },
  viewed:         { label: "Viewed",         color: "bg-violet-500/15 text-violet-400" },
  accepted:       { label: "Accepted",       color: "bg-green-500/15 text-green-400" },
  rejected:       { label: "Rejected",       color: "bg-red-500/15 text-red-400" },
  needs_revision: { label: "Needs Revision", color: "bg-amber-500/15 text-amber-400" },
}

function newRow(): RoleRow {
  return { roleId: ALL_ROLES[0].id, count: 1 }
}

const inputCls = "bg-white/5 border-white/10 text-white placeholder:text-white/30"
const selectCls = "w-full text-sm border border-white/10 rounded-lg px-3 py-2 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#512feb]/50"

type Provider = { name: string; preparedBy: string; email: string }

export default function ProposalsClient({ leads, savedProposals, provider }: { leads: LeadOption[]; savedProposals: SavedProposal[]; provider: Provider }) {
  const router = useRouter()
  const [leadId, setLeadId] = useState("")
  const [clientName, setClientName] = useState("")
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0])
  const [timeline, setTimeline] = useState("3-5 business days to deploy")
  const [budget, setBudget] = useState("")
  const [overview, setOverview] = useState("")
  const [roles, setRoles] = useState<RoleRow[]>([newRow()])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<ProposalResult | null>(null)
  const [resultMeta, setResultMeta] = useState<ResultMeta | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const [siteUrl, setSiteUrl] = useState("")
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [urlError, setUrlError] = useState("")
  const [auditing, setAuditing] = useState(false)
  const [auditError, setAuditError] = useState("")
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null)

  async function pullPageText() {
    const url = siteUrl.trim()
    if (!url) return
    setFetchingUrl(true)
    setUrlError("")
    try {
      const res = await fetch(PROPOSAL_FETCH_URL_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Couldn't fetch that URL")
      setOverview(prev => prev ? `${prev}\n\n[From ${url}]:\n${data.text}` : `[From ${url}]:\n${data.text}`)
    } catch (e: unknown) {
      setUrlError(e instanceof Error ? e.message : String(e))
    } finally {
      setFetchingUrl(false)
    }
  }

  async function runAudit() {
    const url = siteUrl.trim()
    if (!url) return
    setAuditing(true)
    setAuditError("")
    setAuditResult(null)
    try {
      const res = await fetch(PROPOSAL_AUDIT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Audit failed")
      setAuditResult(data)
    } catch (e: unknown) {
      setAuditError(e instanceof Error ? e.message : String(e))
    } finally {
      setAuditing(false)
    }
  }

  function applyAudit() {
    if (!auditResult) return
    const flatRoles: RoleRow[] = auditResult.recommendedTeam.flatMap(pod =>
      pod.roles.map(r => ({ roleId: r.roleId, count: r.count || 1 }))
    ).filter(r => ALL_ROLES.some(x => x.id === r.roleId))
    if (flatRoles.length) setRoles(flatRoles)
    if (auditResult.auditSummary) {
      setOverview(prev => prev ? `${prev}\n\n[Website Audit]:\n${auditResult.auditSummary}` : `[Website Audit]:\n${auditResult.auditSummary}`)
    }
    const match = PROJECT_TYPES.find(t => t === auditResult.projectTypeSuggestion)
    if (match) setProjectType(match)
    setAuditResult(null)
  }

  function applyLead(id: string) {
    setLeadId(id)
    const lead = leads.find(l => l.id === id)
    if (!lead) return
    setClientName(lead.company || lead.name)
    const bits = [lead.painPoint, lead.offerPitched && `Offer pitched: ${lead.offerPitched}`, lead.resourceTypePitched && `Resource type: ${lead.resourceTypePitched}`]
      .filter(Boolean)
    if (bits.length) setOverview(bits.join(". "))
  }

  function updateRole(i: number, patch: Partial<RoleRow>) {
    setRoles(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  const totalHeadcount = roles.reduce((s, r) => s + r.count, 0)
  const totalMonthly = roles.reduce((s, r) => {
    const role = ALL_ROLES.find(x => x.id === r.roleId)
    return s + (role ? role.monthlyRate * r.count : 0)
  }, 0)

  async function generate() {
    setLoading(true)
    setError("")
    setResult(null)
    setSavedId(null)
    try {
      const pods: PdfPod[] = [{
        type: "pod",
        name: "Proposed Team",
        roles: roles.map(r => {
          const role = ALL_ROLES.find(x => x.id === r.roleId)!
          return { roleLabel: role.label, count: r.count, hourlyRate: role.hourlyRate, monthlyRate: role.monthlyRate }
        }),
      }]
      const res = await fetch(PROPOSAL_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, projectType, timeline, budget, pods, overview }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Couldn't generate proposal")
      setResult(await res.json())
      setResultMeta({ leadId, clientName, projectType, totalHeadcount, totalMonthly, pods, timeline })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function saveCurrent() {
    if (!result || !resultMeta || savedId) return
    setSaving(true)
    setError("")
    try {
      const content: StoredProposalContent = { ai: result, pods: resultMeta.pods, timeline: resultMeta.timeline }
      const { id } = await saveProposal({
        leadId: resultMeta.leadId || null,
        clientName: resultMeta.clientName,
        projectType: resultMeta.projectType,
        totalHeadcount: resultMeta.totalHeadcount,
        totalMonthly: resultMeta.totalMonthly,
        content,
      })
      setSavedId(id)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  function viewSaved(p: SavedProposal) {
    const stored = isStoredContent(p.content) ? p.content : { ai: p.content as ProposalResult, pods: [], timeline: "" }
    setResult(stored.ai)
    setResultMeta({
      leadId: p.leadId ?? "", clientName: p.clientName, projectType: p.projectType,
      totalHeadcount: p.totalHeadcount, totalMonthly: p.totalMonthly,
      pods: stored.pods, timeline: stored.timeline,
    })
    setSavedId(p.id)
    setError("")
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })
  }

  async function changeStatus(id: string, status: ProposalStatus) {
    await updateProposalStatus(id, status)
    router.refresh()
  }

  async function removeSaved(id: string) {
    await deleteProposal(id)
    if (savedId === id) { setResult(null); setResultMeta(null); setSavedId(null) }
    router.refresh()
  }

  function asPlainText(r: ProposalResult): string {
    const m = resultMeta
    return [
      `Proposal — ${m?.clientName ?? clientName}`,
      `${m?.projectType ?? projectType} · ${m?.totalHeadcount ?? totalHeadcount} people · $${(m?.totalMonthly ?? totalMonthly).toLocaleString()}/mo`,
      "",
      "EXECUTIVE SUMMARY", r.executiveSummary, "",
      "CORE CHALLENGE", r.coreChallenge, "",
      "THE HIRING PROBLEM", r.hiringProblem, "",
      "HOW BINARYNEXT FITS", r.howBinaryNextFits, "",
      "WHAT YOU NEED RIGHT NOW",
      ...r.clientNeeds.flatMap(n => [`- ${n.title}: ${n.description}`]), "",
      "POSITIONING", r.positioning, "",
      "COMPETITIVE LANDSCAPE", r.competitiveLandscape, "",
      "WHY THIS IS HARD TO REFUSE",
      ...r.whyHardToRefuse.map(b => `- ${b}`), "",
      "TEAM RATIONALE", r.teamRationale, "",
      "SUCCESS METRICS", r.successMetrics, "",
      "CLOSING", r.closingStatement,
    ].join("\n")
  }

  function copyText() {
    if (!result) return
    navigator.clipboard.writeText(asPlainText(result)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function downloadPdf() {
    if (!result || !resultMeta) return
    exportProposalPdf({
      clientName: resultMeta.clientName, projectType: resultMeta.projectType,
      timeline: resultMeta.timeline, pods: resultMeta.pods, ai: result, provider,
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-sm text-white/70 bg-[#512feb]/8 border border-[#512feb]/20 rounded-xl px-4 py-3 print:hidden">
        <Sparkles className="size-4 text-[#7c5af5] shrink-0" />
        <p className="text-xs text-white/70">
          This calls Binary Next&apos;s existing internal proposal generator (propsalgen) — same engine, connected here so you don&apos;t have to leave the CRM.
        </p>
        <a href="https://propsalgen.vercel.app" target="_blank" rel="noopener noreferrer" className="ml-auto text-xs text-[#7c5af5] hover:underline flex items-center gap-1 shrink-0">
          Open standalone <ExternalLink className="size-3" />
        </a>
      </div>

      <div className="grid grid-cols-2 gap-4 print:hidden">
        <div>
          <label className="text-xs font-medium text-white/60 mb-1 block">Prefill from lead (optional)</label>
          <select value={leadId} onChange={e => applyLead(e.target.value)} className={selectCls}>
            <option value="">— Manual entry —</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.company || l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-white/60 mb-1 block">Client name</label>
          <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Acme Inc." className={inputCls} />
        </div>
        <div>
          <label className="text-xs font-medium text-white/60 mb-1 block">Project type</label>
          <select value={projectType} onChange={e => setProjectType(e.target.value)} className={selectCls}>
            {PROJECT_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-white/60 mb-1 block">Timeline</label>
          <Input value={timeline} onChange={e => setTimeline(e.target.value)} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-white/60 mb-1 block">Client context / overview</label>
          <textarea value={overview} onChange={e => setOverview(e.target.value)} rows={3}
            placeholder="Their situation, pain points, what they need"
            className="w-full text-sm border border-white/10 rounded-lg px-3 py-2 bg-white/5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#512feb]/50" />
        </div>
        <div>
          <label className="text-xs font-medium text-white/60 mb-1 block">Monthly budget (optional, $)</label>
          <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="print:hidden">
        <label className="text-xs font-medium text-white/60 mb-1 flex items-center gap-1.5"><Globe className="size-3.5" /> Client website (optional)</label>
        <div className="flex items-center gap-2">
          <Input value={siteUrl} onChange={e => setSiteUrl(e.target.value)} placeholder="https://clientwebsite.com" className={`${inputCls} flex-1`} />
          <Button size="sm" variant="outline" onClick={pullPageText} disabled={fetchingUrl || !siteUrl.trim()} className="border-white/10 text-white/70 hover:bg-white/8 shrink-0">
            {fetchingUrl ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
            Pull page text
          </Button>
          <Button size="sm" onClick={runAudit} disabled={auditing || !siteUrl.trim()} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white shrink-0">
            {auditing ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Sparkles className="size-3.5 mr-1.5" />}
            {auditing ? "Auditing…" : "Run AI Audit"}
          </Button>
        </div>
        {urlError && <p className="text-xs text-red-400 mt-1.5">{urlError}</p>}
        {auditError && <p className="text-xs text-red-400 mt-1.5">{auditError}</p>}

        {auditResult && (
          <div className="mt-3 bg-[#512feb]/8 border border-[#512feb]/20 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-[#7c5af5] uppercase tracking-wide mb-1">{auditResult.businessType}</p>
              <p className="text-sm text-white/80">{auditResult.businessSummary}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1.5">Gaps identified</p>
              <ul className="space-y-1">
                {auditResult.identifiedGaps.map((g, i) => (
                  <li key={i} className="text-xs text-white/70"><span className="font-medium text-white">{g.gap}</span> — {g.impact}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-1.5">Recommended team</p>
              <ul className="space-y-1">
                {auditResult.recommendedTeam.flatMap(pod => pod.roles).map((r, i) => (
                  <li key={i} className="text-xs text-white/70">{r.count}x {r.roleLabel} — ${r.monthlyRate}/mo</li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyAudit} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white">
                Apply to proposal
              </Button>
              <Button size="sm" variant="outline" onClick={() => setAuditResult(null)} className="border-white/10 text-white/70 hover:bg-white/8">
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="print:hidden">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-white/60">Proposed team</label>
          <span className="text-xs text-white/40">{totalHeadcount} people · ${totalMonthly.toLocaleString()}/mo</span>
        </div>
        <div className="space-y-2">
          {roles.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={r.roleId} onChange={e => updateRole(i, { roleId: e.target.value })} className={`${selectCls} flex-1 py-1.5`}>
                {ALL_ROLES.map(role => <option key={role.id} value={role.id}>{role.label} — ${role.monthlyRate}/mo</option>)}
              </select>
              <Input type="number" min={1} value={r.count} onChange={e => updateRole(i, { count: Math.max(1, Number(e.target.value)) })}
                className={`${inputCls} w-16 text-center`} />
              <button onClick={() => setRoles(rows => rows.filter((_, idx) => idx !== i))} disabled={roles.length === 1}
                className="text-white/30 hover:text-red-400 shrink-0 px-1 disabled:opacity-20 disabled:hover:text-white/30">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setRoles(rows => [...rows, newRow()])} className="mt-2 text-xs text-[#7c5af5] hover:underline flex items-center gap-1">
          <Plus className="size-3.5" /> Add role
        </button>
      </div>

      <div className="flex items-center gap-3 print:hidden">
        <Button size="sm" onClick={generate} disabled={loading || !clientName} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white">
          {loading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <FileSignature className="size-3.5 mr-1.5" />}
          {loading ? "Generating…" : "Generate Proposal"}
        </Button>
        {result && (
          <>
            {savedId ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-green-400 font-medium px-2.5 py-1.5 rounded-lg bg-green-500/10">
                <Check className="size-3.5" /> Saved
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={saveCurrent} disabled={saving} className="border-white/10 text-white/70 hover:bg-white/8">
                {saving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Save className="size-3.5 mr-1.5" />}
                {saving ? "Saving…" : "Save proposal"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={downloadPdf} className="border-white/10 text-white/70 hover:bg-white/8">
              <Download className="size-3.5 mr-1.5" /> Download PDF
            </Button>
            <Button size="sm" variant="outline" onClick={copyText} className="border-white/10 text-white/70 hover:bg-white/8">
              {copied ? <Check className="size-3.5 mr-1.5 text-green-400" /> : <Copy className="size-3.5 mr-1.5" />}
              {copied ? "Copied" : "Copy as Text"}
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {result && (
        <div className="bg-[#0d0d12] print:bg-white border border-white/10 print:border-0 rounded-2xl print:rounded-none p-6 space-y-5">
          <div className="border-b border-white/10 print:border-black/20 pb-4">
            <h2 className="text-lg font-bold text-white print:text-black">Proposal — {resultMeta?.clientName ?? clientName}</h2>
            <p className="text-xs text-white/50 print:text-black/60 mt-0.5">
              {resultMeta?.projectType ?? projectType} · {resultMeta?.totalHeadcount ?? totalHeadcount} people · ${(resultMeta?.totalMonthly ?? totalMonthly).toLocaleString()}/mo
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            {[
              ["What they need", result.strategicFrame.clientNeed],
              ["What Binary Next provides", result.strategicFrame.binaryNextProvides],
              ["The goal", result.strategicFrame.goal],
            ].map(([label, val]) => (
              <div key={label} className="bg-white/5 print:bg-black/5 rounded-lg p-3">
                <p className="font-semibold text-[#7c5af5] print:text-black uppercase tracking-wide mb-1">{label}</p>
                <p className="text-white/80 print:text-black">{val}</p>
              </div>
            ))}
          </div>

          {[
            ["Executive Summary", result.executiveSummary],
            ["Core Challenge", result.coreChallenge],
            ["The Hiring Problem", result.hiringProblem],
            ["How Binary Next Fits", result.howBinaryNextFits],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-[#7c5af5] print:text-black uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm text-white/85 print:text-black leading-relaxed whitespace-pre-wrap">{val}</p>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold text-[#7c5af5] print:text-black uppercase tracking-wide mb-2">What You Need Right Now</p>
            <div className="space-y-2">
              {result.clientNeeds.map((n, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium text-white print:text-black">{n.title}: </span>
                  <span className="text-white/75 print:text-black/80">{n.description}</span>
                </div>
              ))}
            </div>
          </div>

          {[
            ["Positioning", result.positioning],
            ["Competitive Landscape", result.competitiveLandscape],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-[#7c5af5] print:text-black uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm text-white/85 print:text-black leading-relaxed whitespace-pre-wrap">{val}</p>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold text-[#7c5af5] print:text-black uppercase tracking-wide mb-2">Why This Is Hard To Refuse</p>
            <ul className="space-y-1 list-disc list-inside">
              {result.whyHardToRefuse.map((b, i) => (
                <li key={i} className="text-sm text-white/85 print:text-black">{b}</li>
              ))}
            </ul>
          </div>

          {[
            ["Team Rationale", result.teamRationale],
            ["Success Metrics", result.successMetrics],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-xs font-semibold text-[#7c5af5] print:text-black uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm text-white/85 print:text-black leading-relaxed whitespace-pre-wrap">{val}</p>
            </div>
          ))}

          <div className="border-t border-white/10 print:border-black/20 pt-4">
            <p className="text-sm font-medium text-white print:text-black">{result.closingStatement}</p>
          </div>
        </div>
      )}

      {savedProposals.length > 0 && (
        <div className="print:hidden pt-2">
          <h2 className="text-sm font-semibold text-white mb-3">Saved proposals</h2>
          <div className="space-y-2.5">
            {savedProposals.map(p => (
              <div key={p.id} className={`bg-[#0d0d12] border rounded-xl px-4 py-3 flex items-center gap-3 ${savedId === p.id ? "border-[#512feb]/50" : "border-white/10"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{p.clientName}</p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {p.projectType} · {p.totalHeadcount} people · ${p.totalMonthly.toLocaleString()}/mo · {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <select
                  value={p.status}
                  onChange={e => changeStatus(p.id, e.target.value as ProposalStatus)}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#512feb]/50 shrink-0 ${STATUS_META[p.status].color}`}
                >
                  {PROPOSAL_STATUSES.map(s => (
                    <option key={s} value={s} className="bg-[#0d0d12] text-white">{STATUS_META[s].label}</option>
                  ))}
                </select>
                <button onClick={() => viewSaved(p)} title="View proposal" className="text-white/40 hover:text-white shrink-0 p-1">
                  <Eye className="size-4" />
                </button>
                <button onClick={() => removeSaved(p.id)} title="Delete proposal" className="text-white/30 hover:text-red-400 shrink-0 p-1">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
