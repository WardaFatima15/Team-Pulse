"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Shield, Plus, Trash2, Crown } from "lucide-react"
import { inviteAdmin, removeAdmin } from "@/lib/actions"

type AdminRow = { id: string; name: string; email: string; createdAt: string }

export default function SettingsClient({
  currentAdminId,
  currentAdminName,
  currentAdminEmail,
  orgName,
  admins,
}: {
  currentAdminId: string
  currentAdminName: string
  currentAdminEmail: string
  orgName: string
  admins: AdminRow[]
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function submit() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("All fields are required")
      return
    }
    setError("")
    startTransition(async () => {
      try {
        await inviteAdmin({ name: name.trim(), email: email.trim(), password: password.trim() })
        setOpen(false)
        setName("")
        setEmail("")
        setPassword("")
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong")
      }
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      try {
        await removeAdmin(id)
      } catch (e: unknown) {
        alert(e instanceof Error ? e.message : "Failed to remove admin")
      }
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/60 text-sm mt-1">App configuration and account info</p>
      </div>

      {/* Current account */}
      <Card>
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-sm font-semibold text-white">Your Account</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-white/70">
            <span>Name</span>
            <span className="font-medium text-white">{currentAdminName}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Email</span>
            <span className="font-medium text-white">{currentAdminEmail}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Workspace</span>
            <span className="font-medium text-white">{orgName}</span>
          </div>
          <div className="flex justify-between text-white/70">
            <span>Role</span>
            <span className="font-medium text-white">Administrator</span>
          </div>
        </CardContent>
      </Card>

      {/* Team admins */}
      <Card>
        <CardHeader className="border-b border-white/10 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="size-4 text-[#7c5af5]" />
            Team Admins
            <span className="ml-1 text-xs text-white/40 font-normal">{admins.length} total</span>
          </CardTitle>
          <Button size="sm" onClick={() => setOpen(true)} className="h-7 gap-1.5 text-xs">
            <Plus className="size-3.5" />
            Add Admin
          </Button>
        </CardHeader>
        <CardContent className="pt-0 divide-y divide-white/8">
          {admins.map(a => (
            <div key={a.id} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-[#512feb]/20 flex items-center justify-center text-xs font-bold text-[#7c5af5]">
                  {a.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-white">{a.name}</span>
                    {a.id === currentAdminId && (
                      <span className="flex items-center gap-0.5 text-xs text-[#7c5af5]">
                        <Crown className="size-3" /> you
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/50">{a.email}</span>
                </div>
              </div>
              {a.id !== currentAdminId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-white/30 hover:text-red-400"
                  onClick={() => handleRemove(a.id)}
                  disabled={pending}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="border-b border-white/10 pb-4">
          <CardTitle className="text-sm font-semibold text-white">About TeamPulse</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm text-white/70">
          <p>TeamPulse is an internal employee management platform for tracking time, leaves, announcements, support tickets, and project tasks.</p>
          <p className="text-xs text-white/50 mt-2">All data is stored securely in your private database.</p>
          <p className="text-xs text-white/40">v1.0.0</p>
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Admin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60">Full name</label>
              <Input placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60">Email</label>
              <Input type="email" placeholder="jane@company.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60">Password</label>
              <Input type="password" placeholder="Temporary password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={submit} disabled={pending}>
                {pending ? "Adding…" : "Add Admin"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
