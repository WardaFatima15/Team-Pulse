"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Eye, EyeOff, Loader2 } from "lucide-react"

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
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-indigo-500 flex items-center justify-center">
            <Users className="size-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg">TeamPulse</span>
        </div>
        <div className="space-y-5">
          <p className="text-slate-400 text-sm uppercase tracking-widest font-medium">What's inside</p>
          {[
            { title: "Real-time team status", desc: "See who's online, away, or offline across all timezones at a glance." },
            { title: "Jira integration", desc: "Pull tasks and issues directly from your Jira workspace." },
            { title: "Time tracking & attendance", desc: "Clock-in/out logs, weekly hours, and attendance history per employee." },
            { title: "Leave & ticket management", desc: "Approve leave requests and handle internal support tickets in one place." },
          ].map(f => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="size-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="size-2.5 text-indigo-400" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              </div>
              <div>
                <p className="text-slate-200 text-sm font-medium">{f.title}</p>
                <p className="text-slate-500 text-xs mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-slate-500 text-sm">© 2026 TeamPulse. All rights reserved.</p>
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
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
            <p className="text-slate-500 text-sm mb-7">Sign in to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
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

          </div>
        </div>
      </div>
    </div>
  )
}
