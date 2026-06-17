import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

function getDbConfig(): { domain: string; email: string; apiToken: string } | null {
  const row = db.prepare("SELECT value FROM Settings WHERE key = 'jiraConfig'").get() as { value: string } | undefined
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
    const cfg = getDbConfig()
    if (!cfg) return NextResponse.json({ error: "Jira not configured" }, { status: 400 })
    domain = cfg.domain; email = cfg.email; token = cfg.apiToken
  }

  const base = domain.startsWith("http") ? domain : `https://${domain}`
  const auth = Buffer.from(`${email}:${token}`).toString("base64")

  const jqlParts: string[] = []
  if (project) jqlParts.push(`project = "${project}"`)
  if (assignee) jqlParts.push(`assignee = "${assignee}"`)
  const jql = jqlParts.length ? jqlParts.join(" AND ") + " ORDER BY updated DESC" : "ORDER BY updated DESC"

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
