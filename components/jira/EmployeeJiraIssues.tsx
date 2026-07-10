"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import { format } from "date-fns"

type JiraIssueLite = {
  key: string; summary: string; statusName: string; statusColor: string
  priorityName: string; duedate: string | null; issuetype: string
}
type Result = { issues: JiraIssueLite[]; error?: "not_configured" | "auth" | "fetch_failed" | "no_account" }

// Dark-theme badge styles (lib/jira.ts's statusColor/priorityColor are built
// for a light UI and don't fit this app's translucent-badge dark theme).
function statusBadge(colorName: string) {
  if (colorName === "green") return "bg-green-500/15 text-green-400"
  if (colorName === "yellow") return "bg-[#512feb]/15 text-[#7c5af5]"
  if (colorName === "red" || colorName === "orange") return "bg-red-500/15 text-red-400"
  return "bg-white/10 text-white/60"
}
function priorityText(name: string) {
  const n = name.toLowerCase()
  if (n === "highest" || n === "critical") return "text-red-400"
  if (n === "high") return "text-orange-400"
  if (n === "medium") return "text-yellow-400"
  if (n === "low") return "text-blue-400"
  return "text-white/40"
}

export default function EmployeeJiraIssues({ employeeId }: { employeeId: string }) {
  const [data, setData] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/employees/${employeeId}/jira-issues`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setData({ issues: [], error: "fetch_failed" }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [employeeId])

  return (
    <Card>
      <CardHeader className="border-b border-white/10 pb-4">
        <CardTitle className="font-mono text-[11px] uppercase tracking-[0.15em] text-white/55">In-Progress Jira Issues</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {loading && <p className="text-white/40 text-sm py-4">Loading…</p>}

        {!loading && data?.error === "no_account" && (
          <p className="text-xs text-white/40 py-2">No Jira account linked. Add one in this employee&apos;s Account tab.</p>
        )}
        {!loading && data?.error === "not_configured" && (
          <p className="text-xs text-white/40 py-2 flex items-center gap-1.5"><AlertCircle className="size-3.5" /> Jira isn&apos;t connected for this workspace yet.</p>
        )}
        {!loading && (data?.error === "auth" || data?.error === "fetch_failed") && (
          <p className="text-xs text-red-400 py-2 flex items-center gap-1.5"><AlertCircle className="size-3.5" /> Couldn&apos;t reach Jira — check the connection in Settings.</p>
        )}

        {!loading && data && !data.error && data.issues.length === 0 && (
          <p className="text-xs text-white/40 py-2">Nothing in progress right now.</p>
        )}

        {!loading && data && data.issues.length > 0 && (
          <div className="space-y-2">
            {data.issues.map(issue => (
              <div key={issue.key} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/40">{issue.key}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${statusBadge(issue.statusColor)}`}>{issue.statusName}</span>
                  </div>
                  <p className="text-sm text-white mt-1 truncate" title={issue.summary}>{issue.summary}</p>
                  {issue.duedate && <p className="text-xs text-white/35 mt-0.5">Due {format(new Date(issue.duedate), "MMM d")}</p>}
                </div>
                <span className={`text-xs font-medium shrink-0 ${priorityText(issue.priorityName)}`}>{issue.priorityName}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
