"use client"

import { useState } from "react"

type Mod = {
  dir: string
  short: string
  detail: string
  stats: [string, string][]
}

const MODS: Mod[] = [
  {
    dir: "sales-pipeline/",
    short: "11 stages · follow-ups · imports",
    detail: "Every lead from first LinkedIn touch to Closed Won. Follow-up reminders that surface overdue leads, CSV and Google Sheets import, deal values and pitch tracking on every card.",
    stats: [["stages", "11"], ["lead fields", "19"], ["import", "csv · sheets"]],
  },
  {
    dir: "proposals/",
    short: "AI-written · PDF export · status lifecycle",
    detail: "Pick a lead, build a role team, and the proposal writes itself — exec summary, positioning, pricing tables. Exports as a styled multi-page PDF under your own company's name.",
    stats: [["generation", "AI"], ["export", "pdf · text"], ["statuses", "6"]],
  },
  {
    dir: "plugai-audits/",
    short: "gap analysis · team recommendations",
    detail: "Point PlugAI at a prospect's website and get back business gaps, automation opportunities, and the exact team it would take to fix them — before you ever get on a call.",
    stats: [["engine", "plugai.tech"], ["input", "any URL"], ["output", "team + gaps"]],
  },
  {
    dir: "time-tracking/",
    short: "clock-in · live presence · check-ins",
    detail: "Clock in/out with a running timer, automatic online/away/offline presence from real browser activity, structured daily check-ins, and auto clock-out safety caps.",
    stats: [["presence", "automatic"], ["check-ins", "daily"], ["logs", "exportable"]],
  },
  {
    dir: "reports/",
    short: "daily · weekly · written by AI from real data",
    detail: "One click turns actual activity — hours, tasks, tickets, leads — into a client-ready narrative report. Daily and weekly formats, PDF export, copy-as-text for WhatsApp or email.",
    stats: [["formats", "3"], ["source", "real activity"], ["export", "pdf"]],
  },
  {
    dir: "chat-tasks/",
    short: "kanban · chat · tickets · leaves",
    detail: "An 8-state task board, direct and group chat, support tickets, leave management, and announcements — the whole operational layer, no extra tools to buy.",
    stats: [["task states", "8"], ["chat", "dm + groups"], ["extras", "leaves · tickets"]],
  },
]

/** The feature list rendered as an interactive directory tree. */
export default function ModuleTree() {
  const [active, setActive] = useState(0)
  const mod = MODS[active]

  return (
    <div className="grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-[1.05fr_1fr]">
      {/* tree */}
      <div className="bg-[#0a0a0e] p-6 font-mono text-sm sm:p-8">
        <p className="mb-4 text-white/35">
          <span className="text-[#9d85f7]">~</span>/cadenz<span className="text-white/25">/</span>
        </p>
        {MODS.map((m, i) => {
          const isActive = i === active
          const branch = i === MODS.length - 1 ? "└──" : "├──"
          return (
            <button
              key={m.dir}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={`block w-full whitespace-nowrap py-1.5 text-left transition-colors ${
                isActive ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              <span className="text-white/20">{branch} </span>
              <span className={isActive ? "text-[#9d85f7]" : ""}>{m.dir}</span>
              <span className="ml-3 hidden text-xs text-white/30 md:inline">{m.short}</span>
              {isActive && <span className="caret-blink ml-2 inline-block h-3.5 w-2 translate-y-0.5 bg-[#9d85f7]" />}
            </button>
          )
        })}
      </div>

      {/* detail panel */}
      <div key={mod.dir} className="feed-line flex flex-col bg-[#0c0c11] p-6 sm:p-8">
        <p className="mb-3 font-mono text-xs text-white/30">
          $ cat {mod.dir}README
        </p>
        <h3 className="mb-3 text-xl font-bold text-white">{mod.dir.replace("/", "").replace(/-/g, " ")}</h3>
        <p className="flex-1 text-sm leading-relaxed text-white/55">{mod.detail}</p>
        <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10">
          {mod.stats.map(([k, v]) => (
            <div key={k} className="bg-[#0a0a0e] px-3 py-2.5">
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/30">{k}</p>
              <p className="mt-0.5 truncate font-mono text-xs text-white/75">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
