import { NextRequest, NextResponse } from "next/server"
import { queryAll } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { email, password, empId } = await req.json()

  // Direct workspace selection (after workspace picker)
  if (empId) {
    const res = NextResponse.json({ ok: true })
    res.cookies.set("employee_token", empId, { httpOnly: true, path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 7 })
    res.cookies.delete("auth_token")
    return res
  }

  // Find all employees with this email across all orgs
  const candidates = await queryAll<{ id: string; passwordHash: string; orgName: string; role: string; department: string }>(
    `SELECT e.id, e."passwordHash", o.name as "orgName", e.role, e.department
     FROM "Employee" e
     LEFT JOIN "Organization" o ON o.id = e."organizationId"
     WHERE e.email = $1`,
    [email]
  )

  const matched = candidates.filter(c => bcrypt.compareSync(password, c.passwordHash))

  if (matched.length === 0) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 })
  }

  // Single workspace — log in directly
  if (matched.length === 1) {
    const res = NextResponse.json({ ok: true, multiple: false })
    res.cookies.set("employee_token", matched[0].id, { httpOnly: true, path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 7 })
    res.cookies.delete("auth_token")
    return res
  }

  // Multiple workspaces — return list for the picker
  return NextResponse.json({
    ok: true,
    multiple: true,
    workspaces: matched.map(m => ({ empId: m.id, orgName: m.orgName ?? "Workspace", role: m.role, department: m.department })),
  })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete("employee_token")
  return res
}
