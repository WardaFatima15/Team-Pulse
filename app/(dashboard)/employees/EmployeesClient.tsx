"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Mail, Plus, Eye, EyeOff, UserPlus, X } from "lucide-react"
import Link from "next/link"
import { createEmployee } from "@/lib/actions"
import { useRouter } from "next/navigation"

type Employee = {
  id: string; name: string; email: string; role: string; department: string
  avatar: string; status: string; location: string; phone: string
}

const statusConfig = {
  online:  { label: "Online",  dot: "bg-green-500",  badge: "bg-green-500/15 text-green-400" },
  away:    { label: "Away",    dot: "bg-yellow-400", badge: "bg-yellow-500/15 text-yellow-400" },
  offline: { label: "Offline", dot: "bg-white/30",   badge: "bg-white/10 text-white/50" },
}

function StatusBadge({ status }: { status: string }) {
  const sc = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.offline
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${sc.badge}`}>
      <span className={`size-1.5 rounded-full ${sc.dot}`} />
      {sc.label}
    </span>
  )
}

export default function EmployeesClient({ employees }: { employees: Employee[] }) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "online" | "away" | "offline">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()

  const filtered = employees.filter(emp => {
    const matchSearch = emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.role.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === "all" || emp.status === filter
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-white/40" />
          <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "online", "away", "offline"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg font-mono text-[11px] uppercase tracking-wide transition-colors ${filter === s ? "bg-[#512feb]/15 text-white border border-[#512feb]/40" : "bg-white/5 border border-white/10 text-white/55 hover:bg-white/10 hover:text-white"}`}>
              {s}
              {s !== "all" && <span className="ml-1.5 opacity-60 tabular-nums">{employees.filter(e => e.status === s).length}</span>}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white ml-auto h-9">
          <Plus className="size-3.5 mr-1" /> Add Employee
        </Button>
      </div>

      <AddEmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => { setDialogOpen(false); router.refresh() }}
      />

      <div className="flex gap-4 font-mono text-xs text-white/40">
        {["online", "away", "offline"].map(s => (
          <span key={s}><span className="font-semibold text-white tabular-nums">{employees.filter(e => e.status === s).length}</span> {s}</span>
        ))}
        <span className="text-white/15">|</span>
        <span><span className="font-semibold text-white tabular-nums">{filtered.length}</span> shown</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(emp => {
          const sc = statusConfig[emp.status as keyof typeof statusConfig] ?? statusConfig.offline
          return (
            <div key={emp.id} className="relative group">
              <Link href={`/employees/${emp.id}`}>
                <Card className="hover:ring-white/20 transition-all cursor-pointer h-full">
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="relative shrink-0">
                        <Avatar className="size-11">
                          <AvatarFallback className="bg-[#512feb]/20 text-[#7c5af5] font-semibold">{emp.avatar}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#0d0d12] ${sc.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate">{emp.name}</p>
                        <p className="text-xs text-white/65 truncate">{emp.role}</p>
                        <div className="mt-1">
                          <StatusBadge status={emp.status} />
                        </div>
                      </div>
                      <span className="text-xs bg-white/10 text-white/60 px-1.5 py-0.5 rounded shrink-0">{emp.department}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/10 pt-3">
                      <div className="flex items-center gap-1.5 text-white/50"><Mail className="size-3 shrink-0" /><span className="truncate">{emp.email.split("@")[0]}</span></div>
                      <div className="flex items-center gap-1.5 text-white/50"><MapPin className="size-3 shrink-0" /><span className="truncate">{emp.location || "—"}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && <div className="text-center py-16 text-white/40 text-sm">No employees match your search.</div>}
    </div>
  )
}

function AddEmployeeDialog({ open, onOpenChange, onSuccess }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({ name: "", email: "", role: "", department: "", phone: "", location: "", password: "", shiftHours: "", shiftStart: "", accessRole: "" })
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function set(field: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError("")
  }

  function handleAdd() {
    if (!form.name.trim() || !form.email.trim() || !form.role.trim() || !form.department.trim()) {
      setError("Name, email, role, and department are required.")
      return
    }
    startTransition(async () => {
      try {
        await createEmployee({ ...form, password: form.password || "employee123", shiftHours: form.shiftHours ? parseFloat(form.shiftHours) : 0 })
        setForm({ name: "", email: "", role: "", department: "", phone: "", location: "", password: "", shiftHours: "", shiftStart: "", accessRole: "" })
        onSuccess()
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505")) {
          setError("An employee with this email already exists.")
        } else {
          setError(msg || "Failed to create employee. Please try again.")
        }
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => onOpenChange(false)}>
      <div className="bg-[#0d0d12] border border-white/10 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#512feb]/15 flex items-center justify-center">
              <UserPlus className="size-4 text-[#7c5af5]" />
            </div>
            <h2 className="text-base font-semibold text-white">Add New Employee</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="text-white/40 hover:text-white transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: "name", label: "Full Name", required: true },
              { key: "email", label: "Email Address", required: true },
              { key: "role", label: "Job Title", required: true },
              { key: "department", label: "Department", required: true },
              { key: "phone", label: "Phone Number", required: false },
              { key: "location", label: "Location (City, Country)", required: false },
            ] as { key: keyof typeof form; label: string; required: boolean }[]).map(({ key, label, required }) => (
              <div key={key} className={key === "location" ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-white/60 mb-1">
                  {label}{required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                <Input
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={label}
                  className="h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                Shift Start <span className="text-white/30 font-normal">(for late detection)</span>
              </label>
              <Input
                type="time"
                value={form.shiftStart}
                onChange={e => set("shiftStart", e.target.value)}
                className="h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1">
                Shift Length (hours) <span className="text-white/30 font-normal">(0 = no cap)</span>
              </label>
              <Input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={form.shiftHours}
                onChange={e => set("shiftHours", e.target.value)}
                placeholder="0"
                className="h-9 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              Team Role <span className="text-white/30 font-normal">(for internal views, not yet permission-enforced)</span>
            </label>
            <select
              value={form.accessRole}
              onChange={e => set("accessRole", e.target.value)}
              className="w-full h-9 text-sm border border-white/10 rounded-lg px-3 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#512feb]/50"
            >
              <option value="">General Employee</option>
              <option value="salesperson">Salesperson</option>
              <option value="account_manager">Account Manager</option>
              <option value="resource">Resource / Offshore Team Member</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/60 mb-1">
              Portal Password <span className="text-white/30 font-normal">(defaults to employee123)</span>
            </label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder="Leave blank for default"
                className="h-9 text-sm pr-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/15 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={pending} className="border-white/10 text-white/70 hover:bg-white/5">Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={pending} className="bg-[#512feb] hover:bg-[#3f1fd4] text-white gap-1.5">
              <UserPlus className="size-3.5" />
              {pending ? "Creating…" : "Create Account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
