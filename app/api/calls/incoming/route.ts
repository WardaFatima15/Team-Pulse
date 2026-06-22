import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"

async function getUser(req: NextRequest) {
  const adminId = req.cookies.get("auth_token")?.value
  if (adminId) {
    const a = await queryOne<{ id: string }>(`SELECT id FROM "Admin" WHERE id = $1`, [adminId])
    if (a) return { id: adminId, name: "Admin" }
  }
  const empId = req.cookies.get("employee_token")?.value
  if (empId) {
    const e = await queryOne<{ id: string; name: string }>(`SELECT id, name FROM "Employee" WHERE id = $1`, [empId])
    if (e) return { id: e.id, name: e.name }
  }
  return null
}

export async function GET(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json(null)

  // Only return ringing calls created within the last 60s
  const cutoff = new Date(Date.now() - 60_000).toISOString()
  const call = await queryOne<{
    id: string; callerId: string; callerName: string; sdpOffer: string
  }>(
    `SELECT id, "callerId", "callerName", "sdpOffer" FROM "CallSession"
     WHERE "calleeId" = $1 AND status = 'ringing' AND "createdAt" > $2
     ORDER BY "createdAt" DESC LIMIT 1`,
    [user.id, cutoff]
  )

  return NextResponse.json(call ?? null)
}
