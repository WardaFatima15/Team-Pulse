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

  const jqlParts: string[] = ["project IS NOT EMPTY"]
  if (project) jqlParts.push(`project = "${project}"`)
  if (assignee) jqlParts.push(`assignee = "${assignee}"`)
  const jql = jqlParts.join(" AND ") + " ORDER BY updated DESC"

  const url = `${base}/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&maxResults=50&fields=summary,status,priority,assignee,reporter,project,created,updated,duedate,issuetype,description`

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: text }, { status: res.status })
    return NextResponse.json(JSON.parse(text))
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
