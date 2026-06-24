import { NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"

export async function GET() {
  const admin = await getAdminSession()
  const orgId = admin?.organizationId

  const [leaves, tickets, messages] = await Promise.all([
    orgId
      ? queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM "LeaveRequest" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.status = 'pending'`, [orgId])
      : queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM "LeaveRequest" WHERE status = 'pending'`),
    orgId
      ? queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM "Ticket" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 AND t.status != 'resolved'`, [orgId])
      : queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM "Ticket" WHERE status != 'resolved'`),
    queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM "ChatMessage" WHERE "toId" = 'admin' AND "isRead" = 0`),
  ])

  const pendingLeaves = Number(leaves?.n ?? 0)
  const openTickets = Number(tickets?.n ?? 0)
  const unreadMessages = Number(messages?.n ?? 0)

  return NextResponse.json({
    pendingLeaves,
    openTickets,
    unreadMessages,
    total: pendingLeaves + openTickets + unreadMessages,
  }, { headers: { "Cache-Control": "no-store" } })
}
