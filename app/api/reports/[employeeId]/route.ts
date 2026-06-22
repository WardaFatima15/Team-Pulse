import { NextRequest, NextResponse } from "next/server"
import { queryOne, queryAll } from "@/lib/db"
import Anthropic from "@anthropic-ai/sdk"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params

  const emp = await queryOne<{
    id: string; name: string; role: string; department: string; status: string
  }>(`SELECT id, name, role, department, status FROM "Employee" WHERE id = $1`, [employeeId])
  if (!emp) return NextResponse.json({ error: "Employee not found" }, { status: 404 })

  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)

  const [timeToday, tasks, recentLeaves, openTickets] = await Promise.all([
    queryAll<{ clockIn: string; clockOut: string | null; hours: number }>(
      `SELECT "clockIn", "clockOut", hours FROM "TimeRecord" WHERE "employeeId" = $1 AND date = $2`,
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
  ])

  const hoursToday = timeToday.reduce((s, r) => s + r.hours, 0)
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
${timeToday.map(r => `  • ${r.clockIn.slice(11, 16)} – ${r.clockOut ? r.clockOut.slice(11, 16) : "ongoing"} (${r.hours.toFixed(1)}h)`).join("\n") || "  • No time records today"}

Tasks (assigned):
- Total: ${tasks.length} | ${Object.entries(tasksByStatus).map(([s, n]) => `${s}: ${n}`).join(", ") || "none"}
${tasks.map(t => `  • [${t.status}] ${t.title} (${t.priority})`).join("\n") || "  • No tasks assigned"}

Recent Leave Requests:
${recentLeaves.length ? recentLeaves.map(l => `  • ${l.type} ${l.startDate}→${l.endDate} — ${l.status}`).join("\n") : "  • None"}

Open Support Tickets:
${openTickets.length ? openTickets.map(t => `  • [${t.priority}] ${t.title} (${t.status})`).join("\n") : "  • None"}
`.trim()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      employee: emp, hoursToday, clockedIn, tasksByStatus,
      tasks, recentLeaves, openTickets,
      report: `AI report unavailable — ANTHROPIC_API_KEY not set.\n\n${dataContext}`,
      raw: dataContext,
    })
  }

  const client = new Anthropic()
  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `Generate a concise daily performance report (2-3 short paragraphs) for this employee based on their data. Be professional, factual, and highlight key productivity metrics. If there are no tasks or minimal activity, note that. Do not make up data.\n\n${dataContext}`,
    }],
  })

  const report = message.content[0].type === "text" ? message.content[0].text : ""

  return NextResponse.json({
    employee: emp, hoursToday, clockedIn, tasksByStatus,
    tasks, recentLeaves, openTickets, report, raw: dataContext,
  })
}
