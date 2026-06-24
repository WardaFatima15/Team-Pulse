import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import TicketsClient from "./TicketsClient"

type Employee = { id: string; name: string; avatar: string }
type Ticket = { id: string; employeeId: string; title: string; description: string; status: string; priority: string; createdAt: string; updatedAt: string }
type TicketReply = { id: string; ticketId: string; authorId: string; authorName: string; isAdmin: number; message: string; createdAt: string }

export default async function TicketsPage() {
  const admin = await getAdminSession()
  const orgId = admin!.organizationId

  const [tickets, replies, employees] = await Promise.all([
    queryAll<Ticket>(`SELECT t.* FROM "Ticket" t JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 ORDER BY t."createdAt" DESC`, [orgId]),
    queryAll<TicketReply>(`SELECT tr.* FROM "TicketReply" tr JOIN "Ticket" t ON t.id = tr."ticketId" JOIN "Employee" e ON e.id = t."employeeId" WHERE e."organizationId" = $1 ORDER BY tr."createdAt" ASC`, [orgId]),
    queryAll<Employee>(`SELECT id, name, avatar FROM "Employee" WHERE "organizationId" = $1`, [orgId]),
  ])
  return <TicketsClient tickets={tickets} replies={replies} employees={employees} />
}
