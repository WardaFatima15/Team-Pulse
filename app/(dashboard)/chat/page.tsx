import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { queryOne, queryAll } from "@/lib/db"
import ChatClient from "@/components/chat/ChatClient"

export default async function AdminChatPage() {
  const store = await cookies()
  const adminId = store.get("auth_token")?.value
  if (!adminId) redirect("/login")

  let admin: { id: string } | undefined
  try {
    admin = await queryOne<{ id: string }>(`SELECT id FROM "Admin" WHERE id = $1`, [adminId])
  } catch {
    // DB temporarily unavailable — trust the cookie rather than logging out
    admin = { id: adminId }
  }
  if (!admin) redirect("/login")

  const employees = await queryAll<{ id: string; name: string; role: string; avatar: string }>(
    `SELECT id, name, role, avatar FROM "Employee" ORDER BY name`
  )

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">Chat</h1>
        <p className="text-slate-500 text-sm mt-1">Message your team directly</p>
      </div>
      <ChatClient
        currentUserId={adminId}
        currentUserName="Admin"
        contacts={employees}
      />
    </div>
  )
}
