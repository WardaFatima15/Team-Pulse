import { queryAll } from "@/lib/db"
import TicketsClient from "./TicketsClient"

type Employee = { id: string; name: string; avatar: string }
type Ticket = { id: string; employeeId: string; title: string; description: string; status: string; priority: string; createdAt: string; updatedAt: string }
type TicketReply = { id: string; ticketId: string; authorId: string; authorName: string; isAdmin: number; message: string; createdAt: string }

export default async function TicketsPage() {
  const [tickets, replies, employees] = await Promise.all([
    queryAll<Ticket>(`SELECT * FROM "Ticket" ORDER BY "createdAt" DESC`),
    queryAll<TicketReply>(`SELECT * FROM "TicketReply" ORDER BY "createdAt" ASC`),
    queryAll<Employee>(`SELECT id, name, avatar FROM "Employee"`),
  ])
  return <TicketsClient tickets={tickets} replies={replies} employees={employees} />
}
