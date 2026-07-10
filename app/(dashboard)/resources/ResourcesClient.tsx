"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { updateAvailability } from "@/lib/actions"

type Resource = {
  id: string; name: string; avatar: string; role: string; department: string
  accessRole: string; availabilityStatus: string; status: string
}

const AVAILABILITY: { key: string; label: string; color: string }[] = [
  { key: "available", label: "Available", color: "bg-green-500/15 text-green-400" },
  { key: "interviewing", label: "Interviewing", color: "bg-amber-500/15 text-amber-400" },
  { key: "assigned", label: "Assigned", color: "bg-blue-500/15 text-blue-400" },
  { key: "backup", label: "Backup", color: "bg-cyan-500/15 text-cyan-400" },
  { key: "on_hold", label: "On Hold", color: "bg-orange-500/15 text-orange-400" },
  { key: "inactive", label: "Inactive", color: "bg-white/10 text-white/50" },
]

const ACCESS_ROLE_LABEL: Record<string, string> = {
  salesperson: "Salesperson",
  account_manager: "Account Manager",
  resource: "Resource",
}

function availabilityMeta(key: string) {
  return AVAILABILITY.find(a => a.key === key) ?? AVAILABILITY[0]
}

function ResourceAvatar({ name, avatar }: { name: string; avatar: string }) {
  if (avatar) return <img src={avatar} alt={name} className="size-9 rounded-full object-cover shrink-0" />
  return (
    <span className="size-9 rounded-full bg-[#512feb]/15 text-[#7c5af5] font-bold text-sm flex items-center justify-center shrink-0">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

export default function ResourcesClient({ resources }: { resources: Resource[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  function setAvailability(id: string, status: string) {
    startTransition(async () => { await updateAvailability(id, status); router.refresh() })
  }

  const counts = Object.fromEntries(AVAILABILITY.map(a => [a.key, resources.filter(r => r.availabilityStatus === a.key).length]))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {AVAILABILITY.map(a => (
          <Card key={a.key}><CardContent className="pt-4">
            <p className="text-lg font-bold text-white tabular-nums">{counts[a.key] ?? 0}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/45 mt-1">{a.label}</p>
          </CardContent></Card>
        ))}
      </div>

      <div className="space-y-2.5">
        {resources.map(r => (
          <Card key={r.id}>
            <CardContent className="py-3.5 px-4 flex items-center gap-3">
              <ResourceAvatar name={r.name} avatar={r.avatar} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{r.name}</p>
                  {ACCESS_ROLE_LABEL[r.accessRole] && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#512feb]/15 text-[#7c5af5] font-medium shrink-0">
                      {ACCESS_ROLE_LABEL[r.accessRole]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40">{r.role} · {r.department}</p>
              </div>
              <select
                value={r.availabilityStatus}
                onChange={e => setAvailability(r.id, e.target.value)}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-[#512feb]/50 shrink-0 ${availabilityMeta(r.availabilityStatus).color}`}
              >
                {AVAILABILITY.map(a => <option key={a.key} value={a.key} className="bg-[#0d0d12] text-white">{a.label}</option>)}
              </select>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
