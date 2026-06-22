import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { queryAll, queryOne } from "@/lib/db"
import ChatClient from "@/components/chat/ChatClient"

export default async function EmployeeChatPage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")

  // Contacts = Admin + all other employees
  const otherEmployees = await queryAll<{ id: string; name: string; role: string; avatar: string }>(
    `SELECT id, name, role, avatar FROM "Employee" WHERE id != $1 ORDER BY name`,
    [emp.id]
  )

  const adminContact = { id: "admin-1", name: "Admin", role: "Administrator", avatar: "" }
  const contacts = [adminContact, ...otherEmployees]

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900">Chat</h1>
        <p className="text-slate-500 text-sm mt-1">Message your team and admin</p>
      </div>
      <ChatClient
        currentUserId={emp.id}
        currentUserName={emp.name}
        contacts={contacts}
      />
    </div>
  )
}
