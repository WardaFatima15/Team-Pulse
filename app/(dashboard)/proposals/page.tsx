import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import { getLeads } from "@/lib/lead-actions"
import { getProposals } from "@/lib/proposal-actions"
import ProposalsClient from "./ProposalsClient"

export default async function ProposalsPage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  const [leads, savedProposals] = await Promise.all([getLeads(), getProposals()])

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Proposals</h1>
        <p className="text-white/50 text-sm mt-1">
          Generate a client proposal from a lead — pick a role team, and it&apos;s written for you
        </p>
      </div>
      <ProposalsClient
        leads={leads.map(l => ({
          id: l.id, name: l.name, company: l.company, painPoint: l.painPoint,
          offerPitched: l.offerPitched, resourceTypePitched: l.resourceTypePitched,
        }))}
        savedProposals={savedProposals}
      />
    </div>
  )
}
