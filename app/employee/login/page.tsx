"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Eye, EyeOff, Loader2 } from "lucide-react"

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
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Users className="size-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">TeamPulse</span>
        </div>
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-4 font-medium">Employee Portal</p>
          <blockquote className="text-slate-300 text-xl leading-relaxed mb-6">
            "Track your hours, manage leave requests, and stay connected with your team — all in one place."
          </blockquote>
          <div className="flex gap-6 mt-8">
            {[["Clock In/Out", "Track your daily hours"], ["Leave Requests", "Apply for time off"], ["Support Tickets", "Raise issues fast"]].map(([title, desc]) => (
              <div key={title}>
                <p className="text-white text-sm font-medium">{title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-sm">© 2026 TeamPulse. All rights reserved.</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="size-9 rounded-xl bg-indigo-500 flex items-center justify-center">
              <Users className="size-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-slate-900">TeamPulse</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <p className="text-xs text-indigo-600 font-semibold uppercase tracking-widest mb-1">Employee Portal</p>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
            <p className="text-slate-500 text-sm mb-7">Sign in with your work email</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Work email</label>
                <Input type="email" placeholder="you@company.com" value={email}
                  onChange={e => setEmail(e.target.value)} required className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={password}
                    onChange={e => setPassword(e.target.value)} required className="h-10 pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
              )}

              <Button type="submit" disabled={loading} className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white">
                {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-400">
              Default password: <span className="font-mono">employee123</span>
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-slate-400">
            Admin?{" "}
            <a href="/login" className="text-indigo-600 hover:underline">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  )
}
