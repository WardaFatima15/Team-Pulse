import { NextRequest, NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"

export async function GET() {
  const row = await queryOne<{ value: string }>(`SELECT value FROM "Settings" WHERE key = 'jiraConfig'`)
  if (!row) return NextResponse.json(null)
  try { return NextResponse.json(JSON.parse(row.value)) } catch { return NextResponse.json(null) }
}

export async function POST(req: NextRequest) {
  const config = await req.json()
  await execute(
    `INSERT INTO "Settings" (key, value) VALUES ('jiraConfig', $1) ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value`,
    [JSON.stringify(config)]
  )
  return NextResponse.json({ ok: true })
}
