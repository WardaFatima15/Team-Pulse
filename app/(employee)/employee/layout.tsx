export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { serialize } from "@/lib/db"
import EmployeeSidebar from "@/components/employee/EmployeeSidebar"
import PresenceTracker from "@/components/employee/PresenceTracker"

export default async function EmployeePortalLayout({ children }: { children: React.ReactNode }) {
  const raw = await getEmployeeSession()
  if (!raw) redirect("/login")
  const emp = serialize(raw)

  return (
    <div className="dark flex h-screen overflow-hidden bg-[#060608]">
      <PresenceTracker />
      <EmployeeSidebar employee={emp} />
      <main className="flex-1 overflow-y-auto p-6 bg-[#060608]">
        {children}
      </main>
    </div>
  )
}
