import { NextRequest, NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"
import { randomUUID } from "crypto"

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

export async function POST(req: NextRequest) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { calleeId, calleeName, sdpOffer } = await req.json()
  if (!calleeId || !sdpOffer) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

  const id = randomUUID()
  const now = new Date().toISOString()

  await execute(
    `INSERT INTO "CallSession" (id, "callerId", "callerName", "calleeId", "calleeName", status, "sdpOffer", "sdpAnswer", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, 'ringing', $6, '', $7, $7)`,
    [id, user.id, user.name, calleeId, calleeName ?? calleeId, sdpOffer, now]
  )

  return NextResponse.json({ id })
}
