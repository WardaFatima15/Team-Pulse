"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, Loader2 } from "lucide-react"

export default function EmployeeLoginPage() {
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
      const res = await fetch("/api/employee-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (data.ok) {
        router.push("/employee/dashboard")
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
    <div className="min-h-screen flex bg-[#0a0a0c]">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d0d0d] border-r border-white/8 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <img src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png" alt="Binary Next" className="size-9 rounded-xl object-contain" />
          <div>
            <p className="text-white font-bold text-base leading-tight">Binary Next</p>
            <p className="text-white/40 text-xs">AI Automation Partner</p>
          </div>
        </div>
        <div>
          <p className="text-white/30 text-xs uppercase tracking-widest mb-4 font-medium">Employee Portal</p>
          <blockquote className="text-white/80 text-xl leading-relaxed mb-6">
            "Track your hours, manage leave requests, and stay connected with your team — all in one place."
          </blockquote>
          <div className="flex gap-6 mt-8">
            {[["Clock In/Out", "Track your daily hours"], ["Leave Requests", "Apply for time off"], ["Team Chat", "Message anyone instantly"]].map(([title, desc]) => (
              <div key={title}>
                <p className="text-white/80 text-sm font-medium">{title}</p>
                <p className="text-white/40 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/25 text-xs">© 2026 Binary Next. All rights reserved.</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#0a0a0c]">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <img src="https://framerusercontent.com/images/T6zMkBq8OVUH1pVvYSkogfSLY.png" alt="Binary Next" className="size-8 object-contain" />
            <div>
              <p className="font-bold text-white text-sm">Binary Next</p>
              <p className="text-[10px] text-white/40">TeamPulse CRM</p>
            </div>
          </div>

          <div className="bg-[#131318] rounded-2xl border border-white/10 p-8">
            <p className="text-xs text-[#7c5af5] font-semibold uppercase tracking-widest mb-1">Employee Portal</p>
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-white/60 text-sm mb-7">Sign in with your work email</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">Work email</label>
                <Input type="email" placeholder="you@company.com" value={email}
                  onChange={e => setEmail(e.target.value)} required className="h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
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

            <p className="mt-6 text-center text-xs text-white/40">
              Default password: <span className="font-mono text-white/60">employee123</span>
            </p>
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
