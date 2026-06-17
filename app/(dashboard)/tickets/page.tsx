import { db, serialize } from "@/lib/db"
import TicketsClient from "./TicketsClient"

type Employee = { id: string; name: string; avatar: string }
type Ticket = { id: string; employeeId: string; title: string; description: string; status: string; priority: string; createdAt: string; updatedAt: string }
type TicketReply = { id: string; ticketId: string; authorId: string; authorName: string; isAdmin: number; message: string; createdAt: string }

export default function TicketsPage() {
  const tickets = serialize(db.prepare("SELECT * FROM Ticket ORDER BY createdAt DESC").all() as Ticket[])
  const replies = serialize(db.prepare("SELECT * FROM TicketReply ORDER BY createdAt ASC").all() as TicketReply[])
  const employees = serialize(db.prepare("SELECT id, name, avatar FROM Employee").all() as Employee[])
  return <TicketsClient tickets={tickets} replies={replies} employees={employees} />
}
