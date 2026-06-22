import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

async function getDbConfig(): Promise<{ domain: string; email: string; apiToken: string } | null> {
  const row = await queryOne<{ value: string }>(`SELECT value FROM "Settings" WHERE key = 'jiraConfig'`)
  if (!row) return null
  try { return JSON.parse(row.value) } catch { return null }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  let domain = searchParams.get("domain")
  let email = searchParams.get("email")
  let token = searchParams.get("token")
  const project = searchParams.get("project")
  const assignee = searchParams.get("assignee")

  if (!domain || !email || !token) {
    const cfg = await getDbConfig()
    if (!cfg) return NextResponse.json({ error: "Jira not configured" }, { status: 400 })
    domain = cfg.domain; email = cfg.email; token = cfg.apiToken
  }

  const base = domain.startsWith("http") ? domain : `https://${domain}`
  const auth = Buffer.from(`${email}:${token}`).toString("base64")
  const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" }

  // Build JQL — use project-scoped queries to avoid unrestricted-JQL errors
  const jqlParts: string[] = []
  if (project) {
    jqlParts.push(`project = "${project}"`)
  } else {
    jqlParts.push(`project in projectsWhereUserHasPermission("BROWSE_PROJECTS")`)
  }
  if (assignee) jqlParts.push(`assignee = "${assignee}"`)
  const jql = jqlParts.join(" AND ") + " ORDER BY updated DESC"

  const fields = "summary,status,priority,assignee,reporter,project,created,updated,duedate,issuetype,description"

  // Try the newer /rest/api/3/search/jql endpoint, fall back to /rest/api/3/search
  const tryEndpoints = [
    `${base}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=${fields}`,
    `${base}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=50&fields=${fields}`,
  ]

  let lastError = ""
  for (const url of tryEndpoints) {
    try {
      const res = await fetch(url, { headers })
      const text = await res.text()
      if (res.ok) return NextResponse.json(JSON.parse(text))
      lastError = text
      // If it's an auth error, stop trying
      if (res.status === 401 || res.status === 403) break
    } catch (e: unknown) {
      lastError = String(e)
    }
  }

  return NextResponse.json({ error: lastError }, { status: 400 })
}
