import { NextRequest, NextResponse } from "next/server"
import { queryOne, queryAll } from "@/lib/db"
import { computeReliability } from "@/lib/reliability"
import { computeHours } from "@/lib/time"
import OpenAI from "openai"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params

  const emp = await queryOne<{
    id: string; name: string; role: string; department: string; status: string
    shiftStart: string; joinDate: string
  }>(`SELECT id, name, role, department, status, "shiftStart", "joinDate" FROM "Employee" WHERE id = $1`, [employeeId])
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const [timeToday, tasks, recentLeaves, openTickets, reliability, leadsToday, tasksDoneToday, ticketsResolvedToday] = await Promise.all([
    queryAll<{ clockIn: string; clockOut: string | null; hours: number; createdAt: string }>(
      `SELECT "clockIn", "clockOut", hours, "createdAt" FROM "TimeRecord" WHERE "employeeId" = $1 AND date = $2`,
      [employeeId, today]
    ),
    queryAll<{ title: string; status: string; priority: string; updatedAt: string }>(
      `SELECT title, status, priority, "updatedAt" FROM "Task" WHERE "assigneeId" = $1 ORDER BY "updatedAt" DESC LIMIT 10`,
      [employeeId]
    ),
    queryAll<{ type: string; status: string; startDate: string; endDate: string }>(
      `SELECT type, status, "startDate", "endDate" FROM "LeaveRequest" WHERE "employeeId" = $1 AND "startDate" >= $2 ORDER BY "createdAt" DESC LIMIT 3`,
      [employeeId, weekAgo]
    ),
    queryAll<{ title: string; status: string; priority: string }>(
      `SELECT title, status, priority FROM "Ticket" WHERE "employeeId" = $1 AND status != 'closed' ORDER BY "createdAt" DESC LIMIT 5`,
      [employeeId]
    ),
    computeReliability(employeeId, emp.shiftStart, emp.joinDate),
    queryAll<{ name: string; company: string; stage: string }>(
      `SELECT name, company, stage FROM "Lead" WHERE "ownerId" = $1 AND "createdAt"::date = $2::date ORDER BY "createdAt" DESC`,
      [employeeId, today]
    ),
    queryAll<{ title: string }>(
      `SELECT title FROM "Task" WHERE "assigneeId" = $1 AND status = 'done' AND "updatedAt"::date = $2::date`,
      [employeeId, today]
    ),
    queryAll<{ title: string }>(
      `SELECT title FROM "Ticket" WHERE "employeeId" = $1 AND status = 'resolved' AND "updatedAt"::date = $2::date`,
      [employeeId, today]
    ),
  ])

  // A still-open session has hours = 0 in the DB until clock-out, so compute
  // its live elapsed time — otherwise "hours today" reads 0 while clocked in.
  const hoursToday = timeToday.reduce(
    (s, r) => s + (r.clockOut === null && r.createdAt ? computeHours(r.createdAt, new Date()) : r.hours),
    0
  )
  const clockedIn = timeToday.some(r => r.clockIn && !r.clockOut)
  const tasksByStatus = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.status] = (acc[t.status] ?? 0) + 1; return acc
  }, {})

  const dataContext = `
Employee: ${emp.name} (${emp.role}, ${emp.department}) — currently ${emp.status}
Date: ${today}

Time Tracking:
- Hours logged today: ${hoursToday.toFixed(1)}h
- Currently clocked in: ${clockedIn ? "Yes" : "No"}
${timeToday.map(r => {
  const h = r.clockOut === null && r.createdAt ? computeHours(r.createdAt, new Date()) : r.hours
  return `  • ${r.clockIn} – ${r.clockOut ?? "ongoing"} (${h.toFixed(1)}h${r.clockOut === null ? " so far" : ""})`
}).join("\n") || "  • No time records today"}

Tasks (assigned):
- Total: ${tasks.length} | ${Object.entries(tasksByStatus).map(([s, n]) => `${s}: ${n}`).join(", ") || "none"}
${tasks.map(t => `  • [${t.status}] ${t.title} (${t.priority})`).join("\n") || "  • No tasks assigned"}

Recent Leave Requests:
${recentLeaves.length ? recentLeaves.map(l => `  • ${l.type} ${l.startDate}→${l.endDate} — ${l.status}`).join("\n") : "  • None"}

Open Support Tickets:
${openTickets.length ? openTickets.map(t => `  • [${t.priority}] ${t.title} (${t.status})`).join("\n") : "  • None"}

Leads Added Today (Sales Pipeline):
${leadsToday.length ? leadsToday.map(l => `  • ${l.name}${l.company ? ` (${l.company})` : ""} — ${l.stage}`).join("\n") : "  • None"}

Tasks Completed Today:
${tasksDoneToday.length ? tasksDoneToday.map(t => `  • ${t.title}`).join("\n") : "  • None"}

Tickets Resolved Today:
${ticketsResolvedToday.length ? ticketsResolvedToday.map(t => `  • ${t.title}`).join("\n") : "  • None"}
`.trim()

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      employee: emp, hoursToday, clockedIn, tasksByStatus,
      tasks, recentLeaves, openTickets, reliability,
      leadsToday, tasksDoneToday, ticketsResolvedToday,
      report: `AI report unavailable — OPENAI_API_KEY not set.\n\n${dataContext}`,
      raw: dataContext,
    })
  }

  const client = new OpenAI()
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Generate a concise daily performance report (2-3 short paragraphs) for this employee based on their data. Be professional, factual, and highlight key productivity metrics — including leads added, tasks completed, and tickets resolved today, not just hours. If there are no tasks or minimal activity, note that. Do not make up data.\n\n${dataContext}`,
    }],
  })

  const report = completion.choices[0]?.message?.content ?? ""

  return NextResponse.json({
    employee: emp, hoursToday, clockedIn, tasksByStatus,
    tasks, recentLeaves, openTickets, reliability,
    leadsToday, tasksDoneToday, ticketsResolvedToday,
    report, raw: dataContext,
  })
}
