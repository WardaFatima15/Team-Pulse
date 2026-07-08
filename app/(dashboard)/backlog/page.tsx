import { redirect } from "next/navigation"
import { getAdminSession } from "@/lib/admin-auth"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react"

type Group = { category: string; items: string[] }

const BUILT: Group[] = [
  {
    category: "Auth & Roles",
    items: [
      "Admin login/signup, employee login (separate session cookies)",
      "Multi-tenant org scoping on every query (org A can never see org B's data)",
      "Employee \"Team Role\" tag — Salesperson / Account Manager / Resource / Offshore Team Member (foundation only, not permission-enforced yet)",
      "Employee availability status (Available / Interviewing / Assigned / Backup / On Hold / Inactive)",
    ],
  },
  {
    category: "Sales CRM / Lead Pipeline",
    items: [
      "11-stage pipeline (New → Connected → Pitched → Interested → Call Booked → Proposal Needed → Proposal Sent → Negotiation → Won/Lost/Follow-Up Later)",
      "Full lead field set: title, LinkedIn, location, industry, company size, pain point, offer pitched, resource type pitched, last contacted, next follow-up",
      "CSV import + Google Sheets import (SSRF-safe)",
      "\"Mark contacted today\" quick action, overdue-follow-up indicator on cards",
    ],
  },
  {
    category: "Clients & Resources",
    items: [
      "Clients page — derived live from Won leads (no second data source to drift out of sync)",
      "Resources page — staffing view with editable availability status and team role badge",
    ],
  },
  {
    category: "Proposals",
    items: [
      "Real AI proposal generator, wired to the existing internal \"propsalgen\" engine — pick a lead, build a role team, generate, export PDF or copy as text",
      "Website audit: paste a client URL to pull page text into the overview, or run a full AI audit that recommends the team automatically",
    ],
  },
  {
    category: "PlugAI Audits",
    items: [
      "Link-out launcher to the live plugai.tech tool",
    ],
  },
  {
    category: "Tasks",
    items: [
      "8-state task board (Not Started → In Progress → Waiting for Client → Blocked → Submitted → Approved → Rework Needed → Completed) for admin and employee",
    ],
  },
  {
    category: "Time & Attendance",
    items: [
      "Clock in/out with live running timer, structured daily check-in (worked on / completed / pending / blocked / needed support / tomorrow's focus)",
      "Auto clock-out on shift length or 12h safety cap",
      "Slack-style automatic online/away/offline presence, driven by real browser activity heartbeats — verified working, not self-claimed",
      "Attendance log + export",
    ],
  },
  {
    category: "Reports (all AI-backed, GPT-4o-mini)",
    items: [
      "Per-employee report",
      "Team — Daily report: structured facts first (who logged in, hours, tasks/tickets/leads with real titles) with AI narrative on top, not buried",
      "Weekly report: 9-section structured report (exec summary, wins, blockers, next week plan, etc.)",
      "All three export to PDF and copy as plain text",
    ],
  },
  {
    category: "Other operational modules",
    items: [
      "Announcements, Leave management, Support tickets, Team chat, AI assistant chat, Jira integration (issues/projects/users)",
    ],
  },
]

const DEFERRED: (Group & { week: string })[] = [
  {
    week: "Week 2",
    category: "Follow-up automation",
    items: [
      "Next-follow-up date exists and shows overdue on the card, but nothing pushes a reminder yet",
      "One-click AI pitch / follow-up / objection-response generator on the lead itself (general AI chat exists; this would be lead-context-specific)",
    ],
  },
  {
    week: "Week 3",
    category: "Proposals — persistence & lifecycle",
    items: [
      "Generation is live and real, but nothing is saved back to the lead yet",
      "No Draft → Sent → Viewed → Accepted status lifecycle",
      "No BinaryNext Offer Library or Offer Recommendation Engine",
    ],
  },
  {
    week: "Week 4",
    category: "Client onboarding & resource assignment",
    items: [
      "No onboarding checklist (contract, invoice, discovery call, etc.)",
      "Resources aren't linked to a specific client yet — availability is tracked, assignment isn't",
    ],
  },
  {
    week: "Week 5-6",
    category: "Client-facing access",
    items: [
      "There is no \"Client\" login type at all — the Clients page today is admin-only",
      "No client workspace, weekly-goals system with progress %, or client dashboard",
    ],
  },
  {
    week: "Week 7",
    category: "Performance & PlugAI depth",
    items: [
      "Resource performance scorecard (structured scoring against attendance/quality/speed/etc.) — today's reports have the raw data but not a scorecard",
      "PlugAI is a link-out only — no API to run an audit from a lead and pull results back in",
    ],
  },
  {
    week: "Week 8",
    category: "Growth & leadership tooling",
    items: [
      "Client health score, upsell recommendation engine, CEO dashboard, demo workspace",
    ],
  },
]

const CAVEATS = [
  "Team roles are a foundation tag only — a Salesperson can still see everything an Admin sees. Real permission enforcement is separate work.",
  "There's no \"Client\" role/login concept yet, so nothing here is client-facing today — all 10 required Week 1 pages exist, but they're all internal (admin/employee) views.",
  "Proposals and PlugAI Audits connect to two already-deployed, separate internal apps (propsalgen, plugai.tech) rather than reimplementing that logic here — worth knowing if either of those apps changes independently.",
]

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
        {icon} {title}
      </h2>
      {children}
    </div>
  )
}

export default async function BacklogPage() {
  const admin = await getAdminSession()
  if (!admin) redirect("/login")

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Product Backlog</h1>
        <p className="text-white/50 text-sm mt-1">
          What&apos;s actually built vs. deferred, checked against the 60-day roadmap — kept honest, updated as things ship
        </p>
      </div>

      <Section title="Missing pages" icon={<CheckCircle2 className="size-4 text-green-400" />}>
        <Card><CardContent className="pt-4 text-sm text-white/70">
          None. All 10 required Week 1 pages exist: Login, Dashboard, Leads (Sales Pipeline), Clients, Resources, Proposals, Tasks, Reports, PlugAI Audits, Settings.
        </CardContent></Card>
      </Section>

      <Section title="Built and live" icon={<CheckCircle2 className="size-4 text-green-400" />}>
        <div className="space-y-3">
          {BUILT.map(g => (
            <Card key={g.category}>
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-white mb-2">{g.category}</p>
                <ul className="space-y-1.5">
                  {g.items.map((item, i) => (
                    <li key={i} className="text-xs text-white/65 flex items-start gap-1.5">
                      <CheckCircle2 className="size-3 text-green-400/70 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Deferred (mapped to later roadmap weeks)" icon={<Circle className="size-4 text-white/40" />}>
        <div className="space-y-3">
          {DEFERRED.map(g => (
            <Card key={g.category}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-medium text-white">{g.category}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/50 font-medium">{g.week}</span>
                </div>
                <ul className="space-y-1.5">
                  {g.items.map((item, i) => (
                    <li key={i} className="text-xs text-white/65 flex items-start gap-1.5">
                      <Circle className="size-2.5 text-white/30 shrink-0 mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Known caveats" icon={<AlertTriangle className="size-4 text-amber-400" />}>
        <Card><CardContent className="pt-4">
          <ul className="space-y-2">
            {CAVEATS.map((c, i) => (
              <li key={i} className="text-xs text-white/65 flex items-start gap-1.5">
                <AlertTriangle className="size-3 text-amber-400/70 shrink-0 mt-0.5" />
                {c}
              </li>
            ))}
          </ul>
        </CardContent></Card>
      </Section>
    </div>
  )
}
