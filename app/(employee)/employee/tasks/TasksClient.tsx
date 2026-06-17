"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, RefreshCw, ExternalLink, AlertCircle, Settings, ChevronDown } from "lucide-react"
import { statusColor, priorityColor, type JiraIssue, type JiraProject } from "@/lib/jira"
import Link from "next/link"

async function fetchProjects(): Promise<JiraProject[]> {
  const res = await fetch("/api/jira/projects")
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.values ?? data ?? []
}

async function fetchIssues(project?: string, assignee?: string): Promise<JiraIssue[]> {
  const params = new URLSearchParams()
  if (project) params.set("project", project)
  if (assignee) params.set("assignee", assignee)
  const res = await fetch(`/api/jira/issues?${params}`)
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data.issues ?? []
}

export default function TasksClient({ jiraAccountId }: { jiraAccountId: string }) {
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [selectedProject, setSelectedProject] = useState("")
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [domain, setDomain] = useState("")
  const [showAll, setShowAll] = useState(!jiraAccountId)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const assignee = !showAll && jiraAccountId ? jiraAccountId : undefined
      const [projs, issueList] = await Promise.all([
        fetchProjects(),
        fetchIssues(selectedProject || undefined, assignee),
      ])
      setProjects(projs)
      setIssues(issueList)
      const cfgRes = await fetch("/api/settings/jira")
      const cfg = await cfgRes.json()
      if (cfg?.domain) setDomain(cfg.domain.startsWith("http") ? cfg.domain : `https://${cfg.domain}`)
    } catch (e: unknown) {
      const msg = String(e)
      if (msg.includes("not configured")) setError("not-configured")
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }, [selectedProject, showAll, jiraAccountId])

  useEffect(() => { load() }, [load])

  const allStatuses = Array.from(new Set(issues.map(i => i.fields.status.name)))
  const filtered = issues.filter(issue => {
    const matchSearch = issue.fields.summary.toLowerCase().includes(search.toLowerCase()) ||
      issue.key.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || issue.fields.status.name === statusFilter
    return matchSearch && matchStatus
  })

  if (!loading && error === "not-configured") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="size-14 rounded-full bg-indigo-50 flex items-center justify-center">
          <Settings className="size-6 text-indigo-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-lg">Jira not connected</p>
          <p className="text-slate-500 text-sm mt-1 max-w-xs">Ask your admin to connect Jira in Settings. Once connected, your tasks will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Jira Tasks</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {showAll || !jiraAccountId ? "All tasks in workspace" : "Tasks assigned to you"}
          </p>
        </div>
        {jiraAccountId && (
          <button
            onClick={() => setShowAll(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              showAll
                ? "border-slate-200 text-slate-500 hover:bg-slate-50"
                : "border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            }`}
          >
            {showAll ? "Show my tasks only" : "Showing my tasks · Show all"}
          </button>
        )}
      </div>

      {!jiraAccountId && (
        <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5">
          <AlertCircle className="size-4 shrink-0" />
          Your Jira Account ID isn't set — showing all workspace issues. Ask your admin to set it in your employee profile.
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.key}>{p.name} ({p.key})</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {["all", ...allStatuses].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="ml-auto">
          <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && error !== "not-configured" && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="size-4 shrink-0" />{error}
        </div>
      )}

      {!loading && issues.length > 0 && (
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-900">{filtered.length}</span> of <span className="font-semibold text-slate-900">{issues.length}</span> issues
        </p>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(issue => {
            const sc = statusColor(issue.fields.status.name)
            return (
              <Card key={issue.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-slate-400">{issue.key}</span>
                      {domain && (
                        <a href={`${domain}/browse/${issue.key}`} target="_blank" rel="noopener noreferrer"
                          className="text-slate-300 hover:text-indigo-500 transition-colors">
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${sc}`}>
                      {issue.fields.status.name}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-3 line-clamp-2">{issue.fields.summary}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-block size-2 rounded-sm ${priorityColor(issue.fields.priority?.name ?? "medium").replace("text-", "bg-")}`} />
                      {issue.fields.priority?.name ?? "Medium"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {issue.fields.assignee ? (
                        <>
                          <span className="size-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600">
                            {issue.fields.assignee.displayName.charAt(0)}
                          </span>
                          <span className="truncate max-w-[100px]">{issue.fields.assignee.displayName}</span>
                        </>
                      ) : <span className="text-slate-300">Unassigned</span>}
                    </div>
                  </div>
                  {issue.fields.duedate && (
                    <p className="text-xs text-slate-400 mt-1.5">Due: {new Date(issue.fields.duedate).toLocaleDateString()}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="text-center py-16 text-slate-400 text-sm">
          {issues.length === 0 ? "No issues found." : "No issues match your filter."}
        </div>
      )}
    </div>
  )
}
