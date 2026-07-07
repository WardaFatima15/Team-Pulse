import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import { queryAll } from "@/lib/db"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, Mail, Phone, DollarSign } from "lucide-react"

type ClientLead = {
  id: string; name: string; company: string; email: string; phone: string
  value: number; ownerName: string; updatedAt: string
}

function money(v: number) {
  return v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${v.toFixed(0)}`
}

export default async function ClientsPage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  // A "client" is any lead that's closed won — there's no separate client
  // entity yet, so this view is derived from the pipeline rather than a
  // second source of truth that could drift out of sync with it.
  const clients = await queryAll<ClientLead>(
    `SELECT id, name, company, email, phone, value, "ownerName", "updatedAt"
     FROM "Lead" WHERE "organizationId" = $1 AND stage = 'won' ORDER BY "updatedAt" DESC`,
    [admin.organizationId]
  )
  const totalValue = clients.reduce((s, c) => s + c.value, 0)

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Clients</h1>
        <p className="text-white/50 text-sm mt-1">Leads that closed won — full client onboarding (contracts, invoicing, workspace) is still ahead</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card><CardContent className="pt-4">
          <p className="text-xl font-bold text-white">{clients.length}</p>
          <p className="text-xs text-white/50 mt-0.5">Total clients</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <p className="text-xl font-bold text-green-400">{money(totalValue)}</p>
          <p className="text-xs text-white/50 mt-0.5">Combined deal value</p>
        </CardContent></Card>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16 text-white/40 text-sm flex flex-col items-center gap-2">
          <Building2 className="size-6 text-white/20" />
          No clients yet — mark a lead &quot;Closed Won&quot; in the Sales Pipeline to see it here.
        </div>
      ) : (
        <div className="space-y-2.5">
          {clients.map(c => (
            <Card key={c.id}>
              <CardContent className="py-3.5 px-4 flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{c.company || c.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-white/40">
                    {c.company && <span>{c.name}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail className="size-3" />{c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{c.phone}</span>}
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-400 shrink-0 flex items-center gap-0.5">
                  <DollarSign className="size-3.5" />{c.value > 0 ? money(c.value).replace("$", "") : "—"}
                </span>
                <span className="text-xs text-white/40 shrink-0">Owner: {c.ownerName}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
