import { redirect } from "next/navigation"
import { getEmployeeSession } from "@/lib/employee-auth"
import { getLeads } from "@/lib/lead-actions"
import PipelineBoard from "@/components/pipeline/PipelineBoard"

export default async function EmployeePipelinePage() {
  const emp = await getEmployeeSession()
  if (!emp) redirect("/login")

  const leads = await getLeads()

  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Sales Pipeline</h1>
        <p className="text-white/60 text-sm mt-0.5">Leads and accounts the whole team is working on</p>
      </div>
      <PipelineBoard leads={leads} currentUserId={emp.id} isAdmin={false} />
    </div>
  )
}
