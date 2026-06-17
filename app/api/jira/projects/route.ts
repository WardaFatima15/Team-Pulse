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

  try {
    const res = await fetch(`${base}/rest/api/3/project/search?maxResults=50`, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: text }, { status: res.status })
    return NextResponse.json(JSON.parse(text))
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
