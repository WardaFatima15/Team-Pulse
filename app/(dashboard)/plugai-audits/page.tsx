import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import { ScanSearch } from "lucide-react"

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
          <p className="font-semibold text-white text-lg">PlugAI integration — not built yet</p>
          <p className="text-white/60 text-sm mt-1">
            PlugAI isn&apos;t referenced anywhere in the codebase. Before this can be scoped: is it an
            existing product with an API key we already have, or something to build from scratch?
            Those are very different timelines.
          </p>
        </div>
      </div>
    </div>
  )
}
