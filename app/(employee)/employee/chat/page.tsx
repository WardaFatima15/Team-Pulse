import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { queryAll, queryOne } from "@/lib/db"
import ChatClient from "@/components/chat/ChatClient"

export default async function EmployeeChatPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")

  const [otherEmployees, adminRow] = await Promise.all([
    queryAll<{ id: string; name: string; role: string; avatar: string }>(
      `SELECT id, name, role, avatar FROM "Employee"
       WHERE id != $1 AND "organizationId" = $2
       ORDER BY name`,
      [emp.id, emp.organizationId]
    ),
    queryOne<{ id: string; email: string }>(
      `SELECT id, email FROM "Admin" WHERE "organizationId" = $1 LIMIT 1`,
      [emp.organizationId]
    ),
  ])

  const adminContact = {
    id: adminRow?.id ?? "admin",
    name: "Admin",
    role: "Administrator",
    avatar: "A",
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-white">Chat</h1>
        <p className="text-white/50 text-sm mt-1">Message your team and admin</p>
      </div>
      <ChatClient
        currentUserId={emp.id}
        contacts={[adminContact, ...otherEmployees]}
      />
    </div>
  )
}
