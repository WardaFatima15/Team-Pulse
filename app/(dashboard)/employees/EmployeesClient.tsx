"use client"

import { useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, MapPin, Mail, Plus, ChevronDown, Eye, EyeOff, UserPlus, X } from "lucide-react"
import Link from "next/link"
import { createEmployee, updateEmployeeStatus } from "@/lib/actions"
import { useRouter } from "next/navigation"

type Employee = {
  id: string; name: string; email: string; role: string; department: string
  avatar: string; status: string; location: string; phone: string
}

const statusConfig = {
  online:  { label: "Online",  dot: "bg-green-500",  badge: "bg-green-100 text-green-700" },
  away:    { label: "Away",    dot: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-700" },
  offline: { label: "Offline", dot: "bg-slate-300",  badge: "bg-slate-100 text-slate-500" },
}

function StatusDropdown({ emp }: { emp: Employee }) {
  const [open, setOpen] = useState(false)
  const [pending, start] = useTransition()
  const router = useRouter()

  function change(s: "online" | "away" | "offline") {
    setOpen(false)
    start(async () => { await updateEmployeeStatus(emp.id, s); router.refresh() })
  }

  const sc = statusConfig[emp.status as keyof typeof statusConfig] ?? statusConfig.offline

  return (
    <div className="relative" onClick={e => e.preventDefault()}>
      <button onClick={() => setOpen(!open)} disabled={pending}
        className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${sc.badge}`}>
        {sc.label} <ChevronDown className="size-2.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-30 py-1 min-w-[100px]">
          {(["online", "away", "offline"] as const).map(s => {
            const c = statusConfig[s]
            return (
              <button key={s} onClick={() => change(s)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700">
                <span className={`size-2 rounded-full ${c.dot}`} />{c.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
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
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["all", "online", "away", "offline"] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== "all" && <span className="ml-1.5 opacity-70">{employees.filter(e => e.status === s).length}</span>}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white ml-auto h-9">
          <Plus className="size-3.5 mr-1" /> Add Employee
        </Button>
      </div>

      <AddEmployeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => { setDialogOpen(false); router.refresh() }}
      />

      <div className="flex gap-4 text-sm text-slate-500">
        {["online", "away", "offline"].map(s => (
          <span key={s}><span className="font-semibold text-slate-900">{employees.filter(e => e.status === s).length}</span> {s}</span>
        ))}
        <span className="text-slate-300">|</span>
        <span><span className="font-semibold text-slate-900">{filtered.length}</span> shown</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(emp => {
          const sc = statusConfig[emp.status as keyof typeof statusConfig] ?? statusConfig.offline
          return (
            <div key={emp.id} className="relative group">
              <Link href={`/employees/${emp.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="relative shrink-0">
                        <Avatar className="size-11">
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 font-semibold">{emp.avatar}</AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white ${sc.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{emp.name}</p>
                        <p className="text-xs text-slate-500 truncate">{emp.role}</p>
                        <div className="mt-1">
                          <StatusDropdown emp={emp} />
                        </div>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">{emp.department}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
                      <div className="flex items-center gap-1.5 text-slate-500"><Mail className="size-3 shrink-0" /><span className="truncate">{emp.email.split("@")[0]}</span></div>
                      <div className="flex items-center gap-1.5 text-slate-500"><MapPin className="size-3 shrink-0" /><span className="truncate">{emp.location || "—"}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )
        })}
      </div>
      {filtered.length === 0 && <div className="text-center py-16 text-slate-400 text-sm">No employees match your search.</div>}
    </div>
  )
}

function AddEmployeeDialog({ open, onOpenChange, onSuccess }: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({ name: "", email: "", role: "", department: "", phone: "", location: "", password: "" })
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
      await createEmployee({ ...form, password: form.password || "employee123" })
      setForm({ name: "", email: "", role: "", department: "", phone: "", location: "", password: "" })
      onSuccess()
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <UserPlus className="size-4 text-indigo-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">Add New Employee</h2>
          </div>
          <button onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
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
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <Input
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  placeholder={label}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Portal Password <span className="text-slate-400 font-normal">(defaults to employee123)</span>
            </label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder="Leave blank for default"
                className="h-9 text-sm pr-9"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
            <Button size="sm" onClick={handleAdd} disabled={pending} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5">
              <UserPlus className="size-3.5" />
              {pending ? "Creating…" : "Create Account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
