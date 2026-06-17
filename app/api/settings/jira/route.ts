import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const row = db.prepare("SELECT value FROM Settings WHERE key = 'jiraConfig'").get() as { value: string } | undefined
  if (!row) return NextResponse.json(null)
  try { return NextResponse.json(JSON.parse(row.value)) } catch { return NextResponse.json(null) }
}

export async function POST(req: NextRequest) {
  const config = await req.json()
  db.prepare("INSERT INTO Settings (key, value) VALUES ('jiraConfig', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(JSON.stringify(config))
  return NextResponse.json({ ok: true })
}
