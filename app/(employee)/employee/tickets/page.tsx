import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { db, serialize } from "@/lib/db"
import TicketsClient from "./TicketsClient"

type Ticket = { id: string; title: string; description: string; status: string; priority: string; createdAt: string }
type Reply = { id: string; ticketId: string; authorName: string; isAdmin: number; message: string; createdAt: string }

export default async function EmployeeTicketsPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")

  const tickets = serialize(
    db.prepare("SELECT id, title, description, status, priority, createdAt FROM Ticket WHERE employeeId = ? ORDER BY createdAt DESC").all(emp.id) as Ticket[]
  )
  const ticketIds = tickets.map(t => t.id)
  const replies = ticketIds.length
    ? serialize(db.prepare(
        `SELECT id, ticketId, authorName, isAdmin, message, createdAt FROM TicketReply WHERE ticketId IN (${ticketIds.map(() => "?").join(",")}) ORDER BY createdAt ASC`
      ).all(...ticketIds) as Reply[])
    : []

  return <TicketsClient tickets={tickets} replies={replies} />
}
