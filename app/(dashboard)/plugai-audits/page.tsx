import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import { ScanSearch, ExternalLink } from "lucide-react"

const PLUGAI_URL = "https://www.plugai.tech/"

export default async function PlugAIAuditsPage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">PlugAI Audits</h1>
        <p className="text-white/50 text-sm mt-1">Run an AI business audit on a lead before pitching</p>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[360px] text-center space-y-4">
        <div className="size-14 rounded-full bg-[#512feb]/10 flex items-center justify-center">
          <ScanSearch className="size-6 text-[#7c5af5]" />
        </div>
        <div className="max-w-sm">
          <p className="font-semibold text-white text-lg">PlugAI is a separate deployed tool</p>
          <p className="text-white/60 text-sm mt-1">
            It runs on its own domain, so audits happen there for now rather than embedded in the CRM.
            Pulling results back into a lead&apos;s timeline would need PlugAI to expose an API for that —
            worth asking about if this becomes a daily workflow.
          </p>
        </div>
        <a
          href={PLUGAI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#512feb] hover:bg-[#3f1fd4] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Open PlugAI <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  )
}
