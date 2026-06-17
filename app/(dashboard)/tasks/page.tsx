"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getJiraConfig, fetchJiraProjects, fetchJiraIssues, statusColor, priorityColor, type JiraProject, type JiraIssue } from "@/lib/jira"
import { Search, RefreshCw, ExternalLink, AlertCircle, Settings, ChevronDown } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"

function PriorityIcon({ name }: { name: string }) {
  const color = priorityColor(name)
  const n = name.toLowerCase()
  const size = n === "highest" || n === "critical" || n === "high" ? 10 : 8
  return <span className={`inline-block size-2.5 rounded-sm ${color.replace("text-", "bg-")} shrink-0`} title={name} />
}

export default function TasksPage() {
  const [config, setConfig] = useState(getJiraConfig())
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [selectedProject, setSelectedProject] = useState<string>("")
  const [issues, setIssues] = useState<JiraIssue[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const loadProjects = useCallback(async () => {
    if (!config) return
    try {
      const data = await fetchJiraProjects(config)
      setProjects(data)
      if (data.length > 0 && !selectedProject) setSelectedProject(data[0].key)
    } catch (e: unknown) {
      setError("Failed to load projects: " + String(e))
    }
  }, [config, selectedProject])

  const loadIssues = useCallback(async () => {
    if (!config) return
    setLoading(true)
    setError("")
    try {
      const data = await fetchJiraIssues(config, selectedProject || undefined)
      setIssues(data)
    } catch (e: unknown) {
      setError("Failed to load issues: " + String(e))
    } finally {
      setLoading(false)
    }
  }, [config, selectedProject])

  useEffect(() => {
    const cfg = getJiraConfig()
    setConfig(cfg)
  }, [])

  useEffect(() => {
    if (config) loadProjects()
  }, [config])

  useEffect(() => {
    if (config && selectedProject !== undefined) loadIssues()
  }, [config, selectedProject])

  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="size-14 rounded-full bg-indigo-50 flex items-center justify-center">
          <Settings className="size-6 text-indigo-400" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-lg">Jira not connected</p>
          <p className="text-slate-500 text-sm mt-1">Connect your Jira account in Settings to view and manage tasks.</p>
        </div>
        <Link href="/settings">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Go to Settings</Button>
        </Link>
      </div>
    )
  }

  const allStatuses = Array.from(new Set(issues.map(i => i.fields.status.name)))
  const filtered = issues.filter(issue => {
    const matchSearch = issue.fields.summary.toLowerCase().includes(search.toLowerCase()) ||
      issue.key.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || issue.fields.status.name === statusFilter
    return matchSearch && matchStatus
  })

  const grouped = filtered.reduce<Record<string, JiraIssue[]>>((acc, issue) => {
    const status = issue.fields.status.name
    acc[status] = acc[status] ?? []
    acc[status].push(issue)
    return acc
  }, {})

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Project selector */}
        <div className="relative">
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">All projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.key}>{p.name} ({p.key})</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input
            placeholder="Search issues..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {["all", ...allStatuses].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadIssues}
          disabled={loading}
          className="ml-auto"
        >
          <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Summary */}
      {!loading && issues.length > 0 && (
        <div className="flex gap-4 text-sm text-slate-500">
          <span><span className="font-semibold text-slate-900">{issues.length}</span> total issues</span>
          <span><span className="font-semibold text-slate-900">{filtered.length}</span> shown</span>
          <span><span className="font-semibold text-slate-900">{projects.length}</span> projects</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Issues grouped by status */}
      {!loading && Object.keys(grouped).length > 0 && (
        <div className="space-y-6">
          {Object.entries(grouped).map(([status, statusIssues]) => (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-700">{status}</h3>
                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{statusIssues.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {statusIssues.map(issue => {
                  const sc = statusColor(issue.fields.status.name)
                  const jiraBase = config.domain.startsWith("http") ? config.domain : `https://${config.domain}`
                  return (
                    <Card key={issue.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-slate-400">{issue.key}</span>
                            <a
                              href={`${jiraBase}/browse/${issue.key}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-300 hover:text-indigo-500 transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <ExternalLink className="size-3" />
                            </a>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${sc}`}>
                            {issue.fields.status.name}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-900 mb-3 line-clamp-2">{issue.fields.summary}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-block size-2 rounded-sm ${priorityColor(issue.fields.priority?.name ?? "medium").replace("text-", "bg-")}`} />
                            {issue.fields.priority?.name ?? "Medium"}
                          </div>
                          {issue.fields.assignee ? (
                            <div className="flex items-center gap-1">
                              <span className="size-5 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                                {issue.fields.assignee.displayName.charAt(0)}
                              </span>
                              <span className="truncate max-w-[80px]">{issue.fields.assignee.displayName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300">Unassigned</span>
                          )}
                        </div>
                        {issue.fields.duedate && (
                          <p className="text-xs text-slate-400 mt-2">
                            Due: {new Date(issue.fields.duedate).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && !error && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">{issues.length === 0 ? "No issues found in Jira." : "No issues match your filter."}</p>
        </div>
      )}
    </div>
  )
}
