import { NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

export async function GET() {
  const [leaves, tickets, messages] = await Promise.all([
    queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM "LeaveRequest" WHERE status = 'pending'`),
    queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM "Ticket" WHERE status != 'resolved'`),
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
