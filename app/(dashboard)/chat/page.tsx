import { redirect } from "next/navigation"
import { queryAll } from "@/lib/db"
import { getAdminSession } from "@/lib/admin-auth"
import ChatClient from "@/components/chat/ChatClient"

export default async function AdminChatPage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  const employees = await queryAll<{ id: string; name: string; role: string; avatar: string }>(
    `SELECT id, name, role, avatar FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`,
    [admin.organizationId]
  )

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-white">Chat</h1>
        <p className="text-white/50 text-sm mt-1">Message your team directly</p>
      </div>
      <ChatClient
        currentUserId={admin.id}
        currentUserName="Admin"
        contacts={employees}
      />
    </div>
  )
}
