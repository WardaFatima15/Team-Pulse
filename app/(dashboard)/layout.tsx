import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import Sidebar from "@/components/layout/Sidebar"
import Header from "@/components/layout/Header"

export const dynamic = "force-dynamic"

// Note: no page-wide AutoRefresh here anymore — it used to call router.refresh()
// every 30s, which remounted the whole page (including the live dashboard) and
// caused visible flicker. The dashboard now stays live via polling in
// LiveTeamStatusProvider; pages without their own live polling (employees list,
// employee detail) mount a local <AutoRefresh /> instead.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  return (
    <div className="dark flex h-screen overflow-hidden bg-[#0a0a0c] print:h-auto print:overflow-visible print:bg-white">
      <Sidebar orgName={admin.orgName} />
      <div className="flex-1 flex flex-col overflow-hidden print:overflow-visible">
        <Header orgName={admin.orgName} adminEmail={admin.email} />
        <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
