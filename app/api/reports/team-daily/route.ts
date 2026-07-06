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
  // Same-day activity across the other modules — the raw ingredients for
  // "what did everyone actually get done", not just clock times.
  const leadsAdded = await queryAll<{ ownerId: string; n: string }>(
    `SELECT "ownerId", COUNT(*) as n FROM "Lead" WHERE "organizationId" = $1 AND "createdAt"::date = $2::date GROUP BY "ownerId"`,
    [admin.organizationId, date]
  )
  const tasksCompleted = await queryAll<{ assigneeId: string; n: string }>(
    `SELECT t."assigneeId", COUNT(*) as n FROM "Task" t JOIN "Employee" e ON e.id = t."assigneeId"
     WHERE e."organizationId" = $1 AND t.status = 'done' AND t."updatedAt"::date = $2::date
     GROUP BY t."assigneeId"`,
    [admin.organizationId, date]
  )
  const ticketsResolved = await queryAll<{ employeeId: string; n: string }>(
    `SELECT t."employeeId", COUNT(*) as n FROM "Ticket" t JOIN "Employee" e ON e.id = t."employeeId"
     WHERE e."organizationId" = $1 AND t.status = 'resolved' AND t."updatedAt"::date = $2::date
     GROUP BY t."employeeId"`,
    [admin.organizationId, date]
  )

  const rows = employees.map(e => {
    const rec = records.find(r => r.employeeId === e.id)
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
      leadsAdded: Number(leadsAdded.find(l => l.ownerId === e.id)?.n ?? 0),
      tasksCompleted: Number(tasksCompleted.find(t => t.assigneeId === e.id)?.n ?? 0),
      ticketsResolved: Number(ticketsResolved.find(t => t.employeeId === e.id)?.n ?? 0),
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
      if (r.leadsAdded) activity.push(`added ${r.leadsAdded} lead${r.leadsAdded !== 1 ? "s" : ""}`)
      if (r.tasksCompleted) activity.push(`completed ${r.tasksCompleted} task${r.tasksCompleted !== 1 ? "s" : ""}`)
      if (r.ticketsResolved) activity.push(`resolved ${r.ticketsResolved} ticket${r.ticketsResolved !== 1 ? "s" : ""}`)
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
        content: `Summarize what this team did today in one short paragraph for a manager, based only on the data below. Mention who was active, hours worked, leads added, tasks completed, tickets resolved, and what their check-in note said where available. Note anyone with no activity at all, without inventing details.\n\n${dataContext}`,
      }],
    })
    summary = completion.choices[0]?.message?.content ?? ""
  }

  return NextResponse.json({ date, rows, summary })
}
