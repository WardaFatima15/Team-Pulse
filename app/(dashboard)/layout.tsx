import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  return (
    <div className="dark flex h-screen overflow-hidden bg-[#0a0a0c]">
      <Sidebar orgName={admin.orgName} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header orgName={admin.orgName} adminEmail={admin.email} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
