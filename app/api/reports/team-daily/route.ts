import { NextRequest, NextResponse } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"
import { queryAll } from "@/lib/db"
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
    }
  })

  const present = rows.filter(r => r.clockIn)
  const absent = rows.filter(r => !r.clockIn)
  let summary = ""
  if (present.length === 0) {
    summary = "No one clocked in on this day."
  } else if (!process.env.OPENAI_API_KEY) {
    summary = "AI summary unavailable — OPENAI_API_KEY not set."
  } else {
    const dataContext = present.map(r =>
      `- ${r.name}: ${Number(r.hours).toFixed(1)}h (${r.clockIn}–${r.clockOut ?? "ongoing"})${r.notes ? ` — "${r.notes}"` : " — no check-in note"}`
    ).join("\n") + (absent.length ? `\n\nDid not clock in: ${absent.map(r => r.name).join(", ")}` : "")

    const client = new OpenAI()
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `Summarize what this team did today in one short paragraph for a manager, based only on the data below. Mention who was active and what they worked on where notes are available. Note anyone who logged hours but left no check-in note, and anyone absent, without inventing details.\n\n${dataContext}`,
      }],
    })
    summary = completion.choices[0]?.message?.content ?? ""
  }

  return NextResponse.json({ date, rows, summary })
}
