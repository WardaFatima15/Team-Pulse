import { NextRequest, NextResponse } from "next/server"
import { queryAll, execute } from "@/lib/db"
import { randomUUID } from "crypto"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const side = req.nextUrl.searchParams.get("side") ?? "caller"
  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10)

  const rows = await queryAll<{ candidate: string }>(
    `SELECT candidate FROM "CallCandidate"
     WHERE "callId" = $1 AND side = $2
     ORDER BY "createdAt"
     LIMIT 50 OFFSET $3`,
    [id, side, offset]
  )

  return NextResponse.json(rows)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { side, candidate } = await req.json()
  if (!side || !candidate) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  await execute(
    `INSERT INTO "CallCandidate" (id, "callId", side, candidate, "createdAt") VALUES ($1, $2, $3, $4, $5)`,
    [randomUUID(), id, side, candidate, new Date().toISOString()]
  )

  return NextResponse.json({ ok: true })
}
