import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { queryAll } from "@/lib/db"
import TicketsClient from "./TicketsClient"

type Ticket = { id: string; title: string; description: string; status: string; priority: string; createdAt: string }
type Reply = { id: string; ticketId: string; authorName: string; isAdmin: number; message: string; createdAt: string }

export default async function EmployeeTicketsPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")

  const tickets = await queryAll<Ticket>(
    `SELECT id, title, description, status, priority, "createdAt" FROM "Ticket" WHERE "employeeId" = $1 ORDER BY "createdAt" DESC`,
    [emp.id]
  )

  const ticketIds = tickets.map(t => t.id)
  const replies = ticketIds.length
    ? await queryAll<Reply>(
        `SELECT id, "ticketId", "authorName", "isAdmin", message, "createdAt" FROM "TicketReply" WHERE "ticketId" = ANY($1) ORDER BY "createdAt" ASC`,
        [ticketIds]
      )
    : []

  return <TicketsClient tickets={tickets} replies={replies} />
}
