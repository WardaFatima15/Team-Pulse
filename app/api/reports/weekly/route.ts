import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { queryOne, queryAll } from "@/lib/db"
import { computeReliability } from "@/lib/reliability"
import OpenAI from "openai"

const OPEN_TASK_STATUSES = ["todo", "in_progress", "waiting_for_client", "blocked", "submitted", "rework_needed"]

export async function GET(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const employeeId = req.nextUrl.searchParams.get("employeeId")
  const from = req.nextUrl.searchParams.get("from")
  const to = req.nextUrl.searchParams.get("to")
  if (!employeeId || !from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "employeeId, from, and to (YYYY-MM-DD) are required" }, { status: 400 })
  }

  const emp = await queryOne<{
    id: string; name: string; role: string; department: string
    shiftStart: string; joinDate: string; organizationId: string
  }>(`SELECT id, name, role, department, "shiftStart", "joinDate", "organizationId" FROM "Employee" WHERE id = $1`, [employeeId])
  if (!emp || emp.organizationId !== admin.organizationId) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 })
  }

  const [timeRecords, tasksCompleted, tasksOpen, ticketsResolved, openTickets, leadsAdded, reliability] = await Promise.all([
    queryAll<{ date: string; clockIn: string; clockOut: string | null; hours: number; workedOn: string; completedToday: string; pendingWork: string; blockers: string; neededSupport: string; tomorrowFocus: string }>(
      `SELECT date, "clockIn", "clockOut", hours, "workedOn", "completedToday", "pendingWork", blockers, "neededSupport", "tomorrowFocus"
       FROM "TimeRecord" WHERE "employeeId" = $1 AND date >= $2 AND date <= $3 ORDER BY date ASC`,
      [employeeId, from, to]
    ),
    queryAll<{ title: string; projectKey: string; number: number }>(
      `SELECT t.title, p.key AS "projectKey", t.number FROM "Task" t JOIN "Project" p ON p.id = t."projectId"
       WHERE t."assigneeId" = $1 AND t.status = 'done' AND t."updatedAt"::date >= $2::date AND t."updatedAt"::date <= $3::date
       ORDER BY t."updatedAt" DESC`,
      [employeeId, from, to]
    ),
    queryAll<{ title: string; status: string; projectKey: string; number: number }>(
      `SELECT t.title, t.status, p.key AS "projectKey", t.number FROM "Task" t JOIN "Project" p ON p.id = t."projectId"
       WHERE t."assigneeId" = $1 AND t.status = ANY($2) ORDER BY t."updatedAt" DESC`,
      [employeeId, OPEN_TASK_STATUSES]
    ),
    queryAll<{ title: string }>(
      `SELECT title FROM "Ticket" WHERE "employeeId" = $1 AND status = 'resolved' AND "updatedAt"::date >= $2::date AND "updatedAt"::date <= $3::date`,
      [employeeId, from, to]
    ),
    queryAll<{ title: string; priority: string; status: string }>(
      `SELECT title, priority, status FROM "Ticket" WHERE "employeeId" = $1 AND status != 'resolved' ORDER BY "createdAt" DESC`,
      [employeeId]
    ),
    queryAll<{ name: string; company: string; stage: string }>(
      `SELECT name, company, stage FROM "Lead" WHERE "ownerId" = $1 AND "createdAt"::date >= $2::date AND "createdAt"::date <= $3::date ORDER BY "createdAt" DESC`,
      [employeeId, from, to]
    ),
    computeReliability(employeeId, emp.shiftStart, emp.joinDate),
  ])

  const totalHours = timeRecords.reduce((s, r) => s + Number(r.hours), 0)
  const daysWorked = timeRecords.filter(r => r.clockIn).length
  const blockedTasks = tasksOpen.filter(t => t.status === "blocked")
  const pendingTasks = tasksOpen.filter(t => t.status !== "blocked")

  const dailyUpdates = timeRecords.filter(r => r.workedOn || r.completedToday || r.pendingWork || r.blockers || r.neededSupport || r.tomorrowFocus)

  const dataContext = `
Employee: ${emp.name} (${emp.role}, ${emp.department})
Period: ${from} to ${to}

Time: ${totalHours.toFixed(1)}h total across ${daysWorked} day(s) worked.

Tasks completed this period (${tasksCompleted.length}):
${tasksCompleted.map(t => `  • ${t.projectKey}-${t.number} ${t.title}`).join("\n") || "  • None"}

Tasks still pending (${pendingTasks.length}):
${pendingTasks.map(t => `  • ${t.projectKey}-${t.number} ${t.title} [${t.status}]`).join("\n") || "  • None"}

Blocked tasks (${blockedTasks.length}):
${blockedTasks.map(t => `  • ${t.projectKey}-${t.number} ${t.title}`).join("\n") || "  • None"}

Tickets resolved this period (${ticketsResolved.length}): ${ticketsResolved.map(t => t.title).join("; ") || "None"}
Open tickets (${openTickets.length}): ${openTickets.map(t => `[${t.priority}] ${t.title}`).join("; ") || "None"}
Leads added this period (${leadsAdded.length}): ${leadsAdded.map(l => l.company ? `${l.name} (${l.company})` : l.name).join("; ") || "None"}

Daily check-ins this period:
${dailyUpdates.map(r => `- ${r.date}:${r.workedOn ? ` worked on ${r.workedOn};` : ""}${r.completedToday ? ` completed ${r.completedToday};` : ""}${r.pendingWork ? ` pending ${r.pendingWork};` : ""}${r.blockers ? ` blocked by ${r.blockers};` : ""}${r.neededSupport ? ` needs ${r.neededSupport};` : ""}${r.tomorrowFocus ? ` next: ${r.tomorrowFocus};` : ""}`).join("\n") || "  None submitted"}

Reliability (30d): ${reliability ? `${reliability.onTime} on-time, ${reliability.late} late, ${reliability.absent} absent` : "not enough data"}
`.trim()

  const emptySections = {
    executiveSummary: "", workCompleted: "", keyWins: "", pendingItems: "",
    blockers: "", resourcePerformance: "", nextWeekPlan: "", recommendations: "", additionalSupport: "",
  }

  let sections = emptySections
  if (!process.env.OPENAI_API_KEY) {
    sections = { ...emptySections, executiveSummary: "AI report unavailable — OPENAI_API_KEY not set." }
  } else {
    const client = new OpenAI()
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: `You are writing a client-ready weekly status report for an offshore team member, based only on the data below — do not invent anything not present in it. Return a JSON object with exactly these string keys, each 1-4 sentences (use "Nothing to report." if a section has no data): executiveSummary, workCompleted, keyWins, pendingItems, blockers, resourcePerformance, nextWeekPlan, recommendations, additionalSupport.\n\n${dataContext}`,
      }],
    })
    try {
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}")
      sections = { ...emptySections, ...parsed }
    } catch {
      sections = { ...emptySections, executiveSummary: completion.choices[0]?.message?.content ?? "" }
    }
  }

  return NextResponse.json({
    employee: emp, from, to, totalHours, daysWorked,
    tasksCompleted, pendingTasks, blockedTasks, ticketsResolved, openTickets, leadsAdded, reliability,
    sections, raw: dataContext,
  })
}
