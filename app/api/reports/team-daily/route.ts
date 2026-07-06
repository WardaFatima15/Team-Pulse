import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { queryAll } from "@/lib/db"
import { computeHours } from "@/lib/time"
import OpenAI from "openai"

export async function GET(req: NextRequest) {
  const admin = await getAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const date = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().split("T")[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 })
  }

  const employees = await queryAll<{ id: string; name: string; avatar: string; role: string; department: string }>(
    `SELECT id, name, avatar, role, department FROM "Employee" WHERE "organizationId" = $1 ORDER BY name`,
    [admin.organizationId]
  )
  const records = await queryAll<{ employeeId: string; clockIn: string; clockOut: string | null; hours: number; notes: string; createdAt: string }>(
    `SELECT t."employeeId", t."clockIn", t."clockOut", t.hours, t.notes, t."createdAt"
     FROM "TimeRecord" t JOIN "Employee" e ON e.id = t."employeeId"
     WHERE e."organizationId" = $1 AND t.date = $2`,
    [admin.organizationId, date]
  )
  // Same-day activity across the other modules — the actual items each person
  // moved, not just counts, so the report can list what they did by name.
  const leadRows = await queryAll<{ ownerId: string; name: string; company: string }>(
    `SELECT "ownerId", name, company FROM "Lead" WHERE "organizationId" = $1 AND "createdAt"::date = $2::date ORDER BY "createdAt" DESC`,
    [admin.organizationId, date]
  )
  const taskRows = await queryAll<{ assigneeId: string; title: string }>(
    `SELECT t."assigneeId", t.title FROM "Task" t JOIN "Employee" e ON e.id = t."assigneeId"
     WHERE e."organizationId" = $1 AND t.status = 'done' AND t."updatedAt"::date = $2::date
     ORDER BY t."updatedAt" DESC`,
    [admin.organizationId, date]
  )
  const ticketRows = await queryAll<{ employeeId: string; title: string }>(
    `SELECT t."employeeId", t.title FROM "Ticket" t JOIN "Employee" e ON e.id = t."employeeId"
     WHERE e."organizationId" = $1 AND t.status = 'resolved' AND t."updatedAt"::date = $2::date
     ORDER BY t."updatedAt" DESC`,
    [admin.organizationId, date]
  )

  const rows = employees.map(e => {
    const rec = records.find(r => r.employeeId === e.id)
    const leads = leadRows.filter(l => l.ownerId === e.id).map(l => l.company ? `${l.name} (${l.company})` : l.name)
    const tasks = taskRows.filter(t => t.assigneeId === e.id).map(t => t.title)
    const tickets = ticketRows.filter(t => t.employeeId === e.id).map(t => t.title)
    return {
      employeeId: e.id,
      name: e.name,
      avatar: e.avatar,
      role: e.role,
      department: e.department,
      clockIn: rec?.clockIn ?? null,
      clockOut: rec?.clockOut ?? null,
      hours: rec?.hours ?? 0,
      notes: rec?.notes ?? "",
      createdAt: rec?.createdAt ?? null,
      leadsAdded: leads.length,
      tasksCompleted: tasks.length,
      ticketsResolved: tickets.length,
      leadList: leads,
      taskList: tasks,
      ticketList: tickets,
    }
  })

  const hasActivity = (r: (typeof rows)[number]) => r.clockIn || r.leadsAdded || r.tasksCompleted || r.ticketsResolved
  const present = rows.filter(hasActivity)
  const absent = rows.filter(r => !hasActivity(r))
  let summary = ""
  if (present.length === 0) {
    summary = "No one clocked in or logged any activity on this day."
  } else if (!process.env.OPENAI_API_KEY) {
    summary = "AI summary unavailable — OPENAI_API_KEY not set."
  } else {
    const dataContext = present.map(r => {
      const activity: string[] = []
      // Cap the item lists fed to the model so a big bulk-import day doesn't
      // balloon the prompt — the counts still convey the full total.
      const cap = (xs: string[], n = 15) => xs.length <= n ? xs.join("; ") : `${xs.slice(0, n).join("; ")}; +${xs.length - n} more`
      if (r.leadsAdded) activity.push(`added ${r.leadsAdded} lead${r.leadsAdded !== 1 ? "s" : ""} (${cap(r.leadList)})`)
      if (r.tasksCompleted) activity.push(`completed ${r.tasksCompleted} task${r.tasksCompleted !== 1 ? "s" : ""}: ${cap(r.taskList)}`)
      if (r.ticketsResolved) activity.push(`resolved ${r.ticketsResolved} ticket${r.ticketsResolved !== 1 ? "s" : ""}: ${cap(r.ticketList)}`)
      // For a still-open session the stored hours are still 0 (not finalized
      // until clock-out), so compute the live elapsed time — otherwise the AI
      // summary says "0.0 hours" for someone actively clocked in.
      const liveHours = r.clockIn && r.clockOut === null && r.createdAt
        ? computeHours(r.createdAt, new Date())
        : Number(r.hours)
      const clockPart = r.clockIn
        ? `${liveHours.toFixed(1)}h so far (${r.clockIn}–${r.clockOut ?? "still clocked in"})`
        : "did not clock in"
      const notePart = r.notes ? ` — "${r.notes}"` : r.clockIn ? " — no check-in note" : ""
      const activityPart = activity.length ? ` — ${activity.join(", ")}` : ""
      return `- ${r.name}: ${clockPart}${activityPart}${notePart}`
    }).join("\n") + (absent.length ? `\n\nNo activity at all: ${absent.map(r => r.name).join(", ")}` : "")

    const client = new OpenAI()
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Write a clear daily team report for a manager, based only on the data below. Give each active person their own short line naming what they actually did — the specific tasks they completed, tickets they resolved, and leads they added (use the item names given), plus hours worked and their check-in note where available. List anyone with no activity at all at the end. Do not invent details.\n\n${dataContext}`,
      }],
    })
    summary = completion.choices[0]?.message?.content ?? ""
  }

  return NextResponse.json({ date, rows, summary })
}
