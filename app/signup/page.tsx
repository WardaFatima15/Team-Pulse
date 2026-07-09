"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Loader2, Building2 } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", orgName: "", email: "", password: "", confirm: "" })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    setError("")
  }

  async function submit() {
    if (!form.name.trim()) { setError("Your name is required."); return }
    if (!form.orgName.trim()) { setError("Organization name is required."); return }
    if (!form.email.trim()) { setError("Email is required."); return }
    if (!form.password) { setError("Password is required."); return }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return }

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, orgName: form.orgName, email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push("/dashboard")
        router.refresh()
      } else {
        setError(data.error ?? "Something went wrong.")
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#0a0a0c]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d0d0d] border-r border-white/8 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <img src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png" alt="Binary Next" className="size-9 rounded-xl object-contain" />
          <div>
            <p className="text-white font-bold text-base">Binary Next</p>
            <p className="text-white/40 text-xs tracking-wide uppercase">AI Automation</p>
          </div>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Your team,<br />your workspace.
          </h1>
          <p className="text-white/50 text-lg leading-relaxed">
            Create your organization and start managing your remote team with Cadenz.
          </p>
          <div className="mt-8 space-y-3">
            {["Isolated workspace — your employees only", "Approvals, chat, leaves, tickets", "AI assistant + real-time tracking"].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="size-5 rounded-full bg-[#512feb]/20 flex items-center justify-center shrink-0">
                  <div className="size-2 rounded-full bg-[#7c5af5]" />
                </div>
                <p className="text-white/70 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/20 text-xs">© 2026 Binary Next · Cadenz</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-[#131318] border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 rounded-xl bg-[#512feb]/15 flex items-center justify-center">
                <Building2 className="size-5 text-[#7c5af5]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create your workspace</h2>
                <p className="text-white/40 text-xs mt-0.5">Set up your organization on Cadenz</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Your name</label>
                <Input
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                  placeholder="Jane Smith"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#512feb]/60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Organization / Company name</label>
                <Input
                  value={form.orgName}
                  onChange={e => set("orgName", e.target.value)}
                  placeholder="Acme Corp"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#512feb]/60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Admin email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="you@company.com"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#512feb]/60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Password</label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                    placeholder="Min. 6 characters"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#512feb]/60 pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">Confirm password</label>
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={e => set("confirm", e.target.value)}
                  placeholder="Repeat password"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-[#512feb]/60"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>
              )}

              <button
                type="button"
                disabled={loading}
                onClick={submit}
                className="w-full py-2.5 rounded-xl bg-[#512feb] hover:bg-[#3f1fd4] text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader2 className="size-4 animate-spin" /> Creating workspace…</> : "Create workspace"}
              </button>
            </div>

            <p className="text-center text-xs text-white/40 mt-5">
              Already have an account?{" "}
              <Link href="/login" className="text-[#7c5af5] hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
