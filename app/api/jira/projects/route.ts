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

  if (!domain || !email || !token) {
    const cfg = await getDbConfig()
    if (!cfg) return NextResponse.json({ error: "Jira not configured" }, { status: 400 })
    domain = cfg.domain; email = cfg.email; token = cfg.apiToken
  }

  const base = domain.startsWith("http") ? domain : `https://${domain}`
  const auth = Buffer.from(`${email}:${token}`).toString("base64")
  const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" }

  try {
    // Try project search API first (returns software + other project types)
    const res = await fetch(`${base}/rest/api/3/project/search?maxResults=50&expand=issueTypes`, { headers })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: text }, { status: res.status })
    const data = JSON.parse(text)
    const projects = data.values ?? data ?? []

    // If search returns empty, fall back to the classic projects endpoint
    if (projects.length === 0) {
      const res2 = await fetch(`${base}/rest/api/3/project?maxResults=50`, { headers })
      if (res2.ok) {
        const data2 = await res2.json()
        return NextResponse.json(Array.isArray(data2) ? { values: data2 } : data2)
      }
    }

    return NextResponse.json(data)
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
