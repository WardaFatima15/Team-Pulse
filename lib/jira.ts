export interface JiraConfig {
  domain: string
  email: string
  apiToken: string
}

export interface JiraProject {
  id: string
  key: string
  name: string
  avatarUrls: { "48x48": string }
}

export interface JiraIssue {
  id: string
  key: string
  fields: {
    summary: string
    description?: { content?: unknown[] } | string | null
    status: { name: string; statusCategory: { colorName: string } }
    priority: { name: string; iconUrl: string }
    assignee?: { displayName: string; accountId: string; avatarUrls: { "24x24": string } } | null
    reporter?: { displayName: string; accountId: string }
    project: { key: string; name: string }
    created: string
    updated: string
    duedate?: string | null
    issuetype: { name: string; iconUrl: string }
  }
}

export interface JiraUser {
  accountId: string
  displayName: string
  emailAddress?: string
  avatarUrls: { "48x48": string }
  active: boolean
}

export async function fetchJiraProjects(config: JiraConfig): Promise<JiraProject[]> {
  const res = await fetch(`/api/jira/projects?domain=${encodeURIComponent(config.domain)}&email=${encodeURIComponent(config.email)}&token=${encodeURIComponent(config.apiToken)}`)
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.values ?? data ?? []
}

export async function fetchJiraIssues(config: JiraConfig, projectKey?: string, assigneeAccountId?: string): Promise<JiraIssue[]> {
  const params = new URLSearchParams({
    domain: config.domain,
    email: config.email,
    token: config.apiToken,
  })
  if (projectKey) params.append("project", projectKey)
  if (assigneeAccountId) params.append("assignee", assigneeAccountId)
  const res = await fetch(`/api/jira/issues?${params.toString()}`)
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.issues ?? []
}

export async function fetchJiraUsers(config: JiraConfig): Promise<JiraUser[]> {
  const params = new URLSearchParams({ domain: config.domain, email: config.email, token: config.apiToken })
  const res = await fetch(`/api/jira/users?${params.toString()}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function getJiraConfig(): JiraConfig | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("jira_config")
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function saveJiraConfig(config: JiraConfig) {
  localStorage.setItem("jira_config", JSON.stringify(config))
}

export function clearJiraConfig() {
  localStorage.removeItem("jira_config")
}

export function statusColor(statusName: string) {
  const n = statusName.toLowerCase()
  if (n.includes("done") || n.includes("closed") || n.includes("resolved")) return "text-green-600 bg-green-50"
  if (n.includes("progress") || n.includes("review")) return "text-blue-600 bg-blue-50"
  if (n.includes("block") || n.includes("impeded")) return "text-red-600 bg-red-50"
  return "text-gray-600 bg-gray-100"
}

export function priorityColor(priorityName: string) {
  const n = priorityName.toLowerCase()
  if (n === "highest" || n === "critical") return "text-red-600"
  if (n === "high") return "text-orange-500"
  if (n === "medium") return "text-yellow-500"
  if (n === "low") return "text-blue-500"
  return "text-gray-400"
}
