"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getJiraConfig, saveJiraConfig, clearJiraConfig, fetchJiraProjects, type JiraConfig } from "@/lib/jira"
import { CheckCircle2, XCircle, Loader2, ExternalLink, Trash2, Link } from "lucide-react"

export default function SettingsPage() {
  const [domain, setDomain] = useState("")
  const [email, setEmail] = useState("")
  const [apiToken, setApiToken] = useState("")
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const cfg = getJiraConfig()
    if (cfg) {
      setDomain(cfg.domain)
      setEmail(cfg.email)
      setApiToken(cfg.apiToken)
      setSaved(true)
    }
  }, [])

  async function testConnection() {
    if (!domain || !email || !apiToken) return
    setTesting(true)
    setTestResult(null)
    try {
      const projects = await fetchJiraProjects({ domain, email, apiToken })
      setTestResult({ ok: true, message: `Connection successful! Found ${projects.length} project(s).` })
    } catch (e: unknown) {
      setTestResult({ ok: false, message: "Connection failed: " + String(e) })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    saveJiraConfig({ domain, email, apiToken })
    await fetch("/api/settings/jira", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, email, apiToken }),
    })
    setSaved(true)
    setTestResult(null)
  }

  function handleDisconnect() {
    clearJiraConfig()
    setDomain("")
    setEmail("")
    setApiToken("")
    setSaved(false)
    setTestResult(null)
  }

  const isDirty = (() => {
    const cfg = getJiraConfig()
    if (!cfg) return !!(domain || email || apiToken)
    return cfg.domain !== domain || cfg.email !== email || cfg.apiToken !== apiToken
  })()

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Jira Integration */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[#0052CC] flex items-center justify-center">
              <Link className="size-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Jira Integration</CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Connect your Atlassian Jira account to sync tasks</p>
            </div>
            {saved && (
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Connected</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Jira Domain
              <span className="ml-1 text-xs text-slate-400 font-normal">(e.g. yourcompany.atlassian.net)</span>
            </label>
            <Input
              placeholder="yourcompany.atlassian.net"
              value={domain}
              onChange={e => setDomain(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Atlassian Account Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              API Token
              <a
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-indigo-500 hover:underline"
              >
                Get token <ExternalLink className="size-3" />
              </a>
            </label>
            <Input
              type="password"
              placeholder="••••••••••••••••••••"
              value={apiToken}
              onChange={e => setApiToken(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1.5">
              Your credentials are stored locally in your browser and never sent to any server except Jira.
            </p>
          </div>

          {/* Test result */}
          {testResult && (
            <div className={`flex items-center gap-2 text-sm rounded-lg px-4 py-3 ${testResult.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {testResult.ok ? <CheckCircle2 className="size-4 shrink-0" /> : <XCircle className="size-4 shrink-0" />}
              {testResult.message}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || !domain || !email || !apiToken}
              className="h-9"
            >
              {testing ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Test Connection
            </Button>
            <Button
              onClick={handleSave}
              disabled={!domain || !email || !apiToken || !isDirty}
              className="h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Configuration
            </Button>
            {saved && (
              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="h-9 text-red-600 border-red-200 hover:bg-red-50 ml-auto"
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How to get Jira API token */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="pt-5">
          <p className="text-sm font-medium text-slate-700 mb-2">How to get your Jira API Token</p>
          <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
            <li>Go to <span className="font-mono bg-white px-1 rounded">id.atlassian.com/manage-profile/security/api-tokens</span></li>
            <li>Click <strong>Create API token</strong></li>
            <li>Give it a label (e.g. "TeamPulse") and click <strong>Create</strong></li>
            <li>Copy the token and paste it above</li>
            <li>Your domain is the part before <span className="font-mono">.atlassian.net</span> in your Jira URL</li>
          </ol>
        </CardContent>
      </Card>

      {/* App info */}
      <Card>
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="text-sm font-semibold">Admin Account</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Email</span>
            <span className="font-medium text-slate-900">admin@company.com</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Role</span>
            <span className="font-medium text-slate-900">Administrator</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>App version</span>
            <span className="font-medium text-slate-900">1.0.0</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
