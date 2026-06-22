import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  const admin = await queryOne<{ id: string; passwordHash: string }>(
    `SELECT id, "passwordHash" FROM "Admin" WHERE email = $1`,
    [email]
  )

  if (admin && bcrypt.compareSync(password, admin.passwordHash)) {
    const res = NextResponse.json({ ok: true, role: "admin" })
    res.cookies.set("auth_token", admin.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" })
    res.cookies.delete("employee_token")
    return res
  }

  const emp = await queryOne<{ id: string; passwordHash: string }>(
    `SELECT id, "passwordHash" FROM "Employee" WHERE email = $1`,
    [email]
  )

  if (emp && bcrypt.compareSync(password, emp.passwordHash)) {
    const res = NextResponse.json({ ok: true, role: "employee" })
    res.cookies.set("employee_token", emp.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" })
    res.cookies.delete("auth_token")
    return res
  }

  return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete("auth_token")
  res.cookies.delete("employee_token")
  return res
}
