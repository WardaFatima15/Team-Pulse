"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Loader2 } from "lucide-react"

const FEATURES = [
  { title: "Real-time team status", desc: "Who's online, away, or offline across all timezones at a glance." },
  { title: "Built-in task tracking", desc: "Kanban boards with projects, priorities, and assignments." },
  { title: "Time tracking & attendance", desc: "Clock-in/out logs, weekly hours, and attendance history." },
  { title: "AI daily reports", desc: "One-click AI summaries of each employee's daily activity." },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push(data.role === "admin" ? "/dashboard" : "/employee/dashboard")
        router.refresh()
      } else {
        setError("Invalid email or password.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
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
          <img
            src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png"
            alt="Cadenz"
            className="size-9 rounded-xl object-contain"
          />
          <div>
            <p className="text-white font-bold text-xl leading-tight">Cadenz</p>
            <p className="text-white/35 font-mono text-[10px] tracking-[0.18em] uppercase">command center</p>
          </div>
        </div>

        <div className="relative">
          <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">// what&apos;s inside</p>
          <div className="space-y-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="flex items-start gap-3 bg-[#0a0a0e] px-5 py-4">
                <span className="font-mono text-xs text-white/25 mt-0.5">0{i + 1}</span>
                <div>
                  <p className="text-white/85 text-sm font-medium">{f.title}</p>
                  <p className="text-white/40 text-xs mt-0.5">{f.desc}</p>
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
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <img src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png" alt="Cadenz" className="size-8 object-contain" />
            <div>
              <p className="font-bold text-white text-base">Cadenz</p>
              <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-white/35">command center</p>
            </div>
          </div>

          {/* Terminal-chrome card */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d12] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-5 py-3">
              <span className="size-2.5 rounded-full bg-red-500/70" />
              <span className="size-2.5 rounded-full bg-yellow-500/70" />
              <span className="size-2.5 rounded-full bg-green-500/70" />
              <span className="ml-3 font-mono text-[11px] tracking-wide text-white/40">cadenz — sign in</span>
            </div>

            <div className="p-8">
              <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
              <p className="font-mono text-xs text-white/40 mb-7">$ authenticate --workspace</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-white/45 mb-1.5">email</label>
                  <Input type="email" placeholder="you@company.com" value={email}
                    onChange={e => setEmail(e.target.value)} required className="h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.15em] text-white/45 mb-1.5">password</label>
                  <div className="relative">
                    <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password}
                      onChange={e => setPassword(e.target.value)} required className="h-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
                      {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
                )}

                <Button type="submit" disabled={loading} className="w-full h-10 bg-[#512feb] hover:bg-[#3f1fd4] text-white">
                  {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Sign in
                </Button>
              </form>

              <p className="text-center text-xs text-white/40 mt-5">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-[#7c5af5] hover:underline font-medium">Create workspace</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
