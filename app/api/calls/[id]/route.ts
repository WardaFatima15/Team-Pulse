import { NextRequest, NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const session = await queryOne(`SELECT * FROM "CallSession" WHERE id = $1`, [id])
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(session)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const now = new Date().toISOString()

  if (body.sdpAnswer) {
    await execute(
      `UPDATE "CallSession" SET status = 'accepted', "sdpAnswer" = $1, "updatedAt" = $2 WHERE id = $3`,
      [body.sdpAnswer, now, id]
    )
  } else if (body.status) {
    await execute(
      `UPDATE "CallSession" SET status = $1, "updatedAt" = $2 WHERE id = $3`,
      [body.status, now, id]
    )
  }

  return NextResponse.json({ ok: true })
}
