"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Loader2, Building2, ChevronRight, ArrowLeft } from "lucide-react"

type Workspace = { empId: string; orgName: string; role: string; department: string }

export default function EmployeeLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [workspaces, setWorkspaces] = useState<Workspace[] | null>(null)

  async function handleLogin() {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/employee-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!data.ok) { setError("Invalid email or password."); return }
      if (data.multiple) {
        setWorkspaces(data.workspaces)
      } else {
        router.push("/employee/dashboard")
        router.refresh()
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function selectWorkspace(empId: string) {
    setLoading(true)
    try {
      await fetch("/api/employee-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empId }),
      })
      router.push("/employee/dashboard")
      router.refresh()
    } catch {
      setError("Failed to switch workspace.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#060608]">
      {/* Left panel */}
      <div className="relative hidden lg:flex lg:w-1/2 bg-[#08080b] border-r border-white/8 flex-col justify-between p-12 overflow-hidden">
        <div className="bg-ops-grid grid-fade pointer-events-none absolute inset-0" />
        <div className="relative flex items-center gap-3">
          <img src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png" alt="Cadenz" className="size-9 rounded-xl object-contain" />
          <div>
            <p className="text-white font-bold text-xl leading-tight">Cadenz</p>
            <p className="text-white/35 font-mono text-[10px] tracking-[0.18em] uppercase">command center</p>
          </div>
        </div>
        <div className="relative">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35 mb-4">// employee portal</p>
          <blockquote className="text-white/80 text-xl leading-relaxed mb-6">
            &quot;Track your hours, manage leave requests, and stay connected with your team — all in one place.&quot;
          </blockquote>
          <div className="mt-8 space-y-px overflow-hidden rounded-xl border border-white/10 bg-white/10 max-w-md">
            {[["Clock In/Out", "Track your daily hours"], ["Leave Requests", "Apply for time off"], ["Team Chat", "Message anyone instantly"]].map(([title, desc], i) => (
              <div key={title} className="flex items-center gap-3 bg-[#0a0a0e] px-5 py-3.5">
                <span className="font-mono text-xs text-white/25">0{i + 1}</span>
                <div>
                  <p className="text-white/80 text-sm font-medium">{title}</p>
                  <p className="text-white/40 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative font-mono text-xs text-white/25">© 2026 Binary Next</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#060608]">
        <div className="w-full max-w-sm">
          <div className="bg-[#0d0d12] rounded-2xl border border-white/10 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3">
              <span className="size-2.5 rounded-full bg-red-500/70" />
              <span className="size-2.5 rounded-full bg-yellow-500/70" />
              <span className="size-2.5 rounded-full bg-green-500/70" />
              <span className="ml-3 font-mono text-[11px] tracking-wide text-white/40">cadenz — employee portal</span>
            </div>
            <div className="p-8">

            {/* ── Workspace picker ────────────────────── */}
            {workspaces ? (
              <>
                <button onClick={() => setWorkspaces(null)} className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-xs mb-6 transition-colors">
                  <ArrowLeft className="size-3.5" /> Back
                </button>
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="size-9 rounded-xl bg-[#512feb]/15 flex items-center justify-center">
                    <Building2 className="size-4 text-[#7c5af5]" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white">Choose workspace</h1>
                    <p className="text-white/40 text-xs">You belong to {workspaces.length} workspaces</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {workspaces.map(ws => (
                    <button
                      key={ws.empId}
                      onClick={() => selectWorkspace(ws.empId)}
                      disabled={loading}
                      className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-all text-left group"
                    >
                      <div className="size-9 rounded-lg bg-[#512feb]/20 flex items-center justify-center shrink-0">
                        <Building2 className="size-4 text-[#7c5af5]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{ws.orgName}</p>
                        <p className="text-white/40 text-xs mt-0.5">{ws.role} · {ws.department}</p>
                      </div>
                      <ChevronRight className="size-4 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
                {error && <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
              </>
            ) : (
              /* ── Login form ──────────────────────────── */
              <>
                <p className="text-xs text-[#7c5af5] font-semibold uppercase tracking-widest mb-1">Employee Portal</p>
                <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
                <p className="text-white/60 text-sm mb-7">Sign in with your work email</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1.5">Work email</label>
                    <Input type="email" placeholder="you@company.com" value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
                    <div className="relative">
                      <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="h-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                      <button type="button" onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                        {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
                  )}

                  <Button type="button" onClick={handleLogin} disabled={loading} className="w-full h-10 bg-[#512feb] hover:bg-[#3f1fd4] text-white">
                    {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                    Sign in
                  </Button>
                </div>

                <p className="mt-6 text-center text-xs text-white/40">
                  Default password: <span className="font-mono text-white/60">employee123</span>
                </p>
              </>
            )}
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-white/40">
            Admin?{" "}
            <a href="/login" className="text-[#7c5af5] hover:underline">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  )
}
