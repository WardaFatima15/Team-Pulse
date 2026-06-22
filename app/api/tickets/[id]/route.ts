import { NextRequest, NextResponse } from "next/server"
import { execute } from "@/lib/db"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { status } = await req.json()
  const now = new Date().toISOString()
  await execute(`UPDATE "Ticket" SET status = $1, "updatedAt" = $2 WHERE id = $3`, [status, now, id])
  return NextResponse.json({ ok: true })
}
