import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import { FileSignature } from "lucide-react"

export default async function ProposalsPage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Proposals</h1>
        <p className="text-white/50 text-sm mt-1">Generate, track, and export proposals for leads</p>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[360px] text-center space-y-4">
        <div className="size-14 rounded-full bg-[#512feb]/10 flex items-center justify-center">
          <FileSignature className="size-6 text-[#7c5af5]" />
        </div>
        <div className="max-w-sm">
          <p className="font-semibold text-white text-lg">Proposal generator — not built yet</p>
          <p className="text-white/60 text-sm mt-1">
            This needs a real design pass: offer templates, pricing/scope builder, a status lifecycle
            (Draft → Sent → Accepted), and PDF/email export. Estimated 3–4 weeks — it&apos;s scheduled
            as its own phase, not a Week 1 stub.
          </p>
        </div>
      </div>
    </div>
  )
}
