import { queryOne } from "@/lib/db"

export type JiraIssueLite = {
  key: string
  summary: string
  statusName: string
  statusColor: string
  priorityName: string
  duedate: string | null
  issuetype: string
}

type JiraIssuesResult = { issues: JiraIssueLite[]; error?: "not_configured" | "auth" | "fetch_failed" }

async function getDbJiraConfig(): Promise<{ domain: string; email: string; apiToken: string } | null> {
  const row = await queryOne<{ value: string }>(`SELECT value FROM "Settings" WHERE key = 'jiraConfig'`)
  if (!row) return null
  try { return JSON.parse(row.value) } catch { return null }
}

type RawJiraIssue = {
  key: string
  fields: {
    summary: string
    status?: { name: string; statusCategory?: { colorName: string } }
    priority?: { name: string }
    duedate?: string | null
    issuetype?: { name: string }
  }
}

// Server-only: fetches an assignee's in-progress Jira issues using the org's
// saved Jira credentials (Settings table) — token never reaches the browser.
export async function fetchAssigneeInProgressIssues(assigneeAccountId: string): Promise<JiraIssuesResult> {
  if (!assigneeAccountId) return { issues: [] }
  const cfg = await getDbJiraConfig()
  if (!cfg) return { issues: [], error: "not_configured" }

  const base = cfg.domain.startsWith("http") ? cfg.domain : `https://${cfg.domain}`
  const auth = Buffer.from(`${cfg.email}:${cfg.apiToken}`).toString("base64")
  const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" }
  const jql = `assignee = "${assigneeAccountId}" ORDER BY updated DESC`
  const fields = "summary,status,priority,duedate,issuetype"
  const urls = [
    `${base}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=25&fields=${fields}`,
    `${base}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=25&fields=${fields}`,
  ]

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers, cache: "no-store" })
      const text = await res.text()
      if (res.ok) {
        const data = JSON.parse(text) as { issues?: RawJiraIssue[] }
        const issues: JiraIssueLite[] = (data.issues ?? []).map(i => ({
          key: i.key,
          summary: i.fields.summary,
          statusName: i.fields.status?.name ?? "",
          statusColor: i.fields.status?.statusCategory?.colorName ?? "",
          priorityName: i.fields.priority?.name ?? "",
          duedate: i.fields.duedate ?? null,
          issuetype: i.fields.issuetype?.name ?? "",
        }))
        const inProgress = issues.filter(x => x.statusColor === "yellow" || /progress|review/i.test(x.statusName))
        return { issues: inProgress }
      }
      if (res.status === 401 || res.status === 403) return { issues: [], error: "auth" }
    } catch {
      // try the next endpoint
    }
  }
  return { issues: [], error: "fetch_failed" }
}
