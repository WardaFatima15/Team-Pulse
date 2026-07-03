import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import { fetchAssigneeInProgressIssues } from "@/lib/jira-server"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const emp = await queryOne<{ jiraAccountId: string }>(
    `SELECT "jiraAccountId" FROM "Employee" WHERE id = $1 AND "organizationId" = $2`,
    [id, admin.organizationId]
  )
  if (!emp) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!emp.jiraAccountId) return NextResponse.json({ issues: [], error: "no_account" })

  const result = await fetchAssigneeInProgressIssues(emp.jiraAccountId)
  return NextResponse.json(result)
}
