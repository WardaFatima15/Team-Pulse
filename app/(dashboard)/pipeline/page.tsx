import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import { getLeads } from "@/lib/lead-actions"
import PipelineBoard from "@/components/pipeline/PipelineBoard"

export default async function PipelinePage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  const leads = await getLeads()

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Sales Pipeline</h1>
        <p className="text-white/50 text-sm mt-1">Leads and accounts the whole team is working on</p>
      </div>
      <PipelineBoard leads={leads} currentUserId={admin.id} isAdmin={true} />
    </div>
  )
}
