import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  let domain = searchParams.get("domain")
  let email = searchParams.get("email")
  let token = searchParams.get("token")

  if (!domain || !email || !token) {
    const row = await queryOne<{ value: string }>(`SELECT value FROM "Settings" WHERE key = 'jiraConfig'`)
    if (!row) return NextResponse.json({ error: "No Jira config" })
    const cfg = JSON.parse(row.value)
    domain = cfg.domain; email = cfg.email; token = cfg.apiToken
  }

  const base = domain!.startsWith("http") ? domain! : `https://${domain}`
  const auth = Buffer.from(`${email}:${token}`).toString("base64")
  const headers = { Authorization: `Basic ${auth}`, Accept: "application/json" }

  const results: Record<string, unknown> = { domain: base }

  // Test 1: myself
  try {
    const r = await fetch(`${base}/rest/api/3/myself`, { headers })
    results.myself = { status: r.status, body: await r.json() }
  } catch (e) { results.myself = { error: String(e) } }

  // Test 2: project search
  try {
    const r = await fetch(`${base}/rest/api/3/project/search?maxResults=10`, { headers })
    results.projectSearch = { status: r.status, body: await r.json() }
  } catch (e) { results.projectSearch = { error: String(e) } }

  // Test 3: classic project list
  try {
    const r = await fetch(`${base}/rest/api/3/project?maxResults=10`, { headers })
    results.projectList = { status: r.status, body: await r.json() }
  } catch (e) { results.projectList = { error: String(e) } }

  // Test 4: search with project IS NOT EMPTY
  try {
    const jql = encodeURIComponent('project IS NOT EMPTY ORDER BY updated DESC')
    const r = await fetch(`${base}/rest/api/3/search?jql=${jql}&maxResults=5`, { headers })
    results.searchNotEmpty = { status: r.status, body: await r.json() }
  } catch (e) { results.searchNotEmpty = { error: String(e) } }

  // Test 5: search with projectsWhereUserHasPermission
  try {
    const jql = encodeURIComponent('project in projectsWhereUserHasPermission("BROWSE_PROJECTS") ORDER BY updated DESC')
    const r = await fetch(`${base}/rest/api/3/search?jql=${jql}&maxResults=5`, { headers })
    results.searchPermission = { status: r.status, body: await r.json() }
  } catch (e) { results.searchPermission = { error: String(e) } }

  // Test 6: search all with new endpoint
  try {
    const jql = encodeURIComponent('project in projectsWhereUserHasPermission("BROWSE_PROJECTS") ORDER BY updated DESC')
    const r = await fetch(`${base}/rest/api/3/search/jql?jql=${jql}&maxResults=5`, { headers })
    results.searchJql = { status: r.status, body: await r.json() }
  } catch (e) { results.searchJql = { error: String(e) } }

  return NextResponse.json(results)
}
