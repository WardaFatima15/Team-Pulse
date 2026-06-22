import { NextRequest, NextResponse } from "next/server"
import { queryOne } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const emp = await queryOne<{ id: string; passwordHash: string }>(
    `SELECT id, "passwordHash" FROM "Employee" WHERE email = $1`,
    [email]
  )
  if (!emp || !bcrypt.compareSync(password, emp.passwordHash)) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set("employee_token", emp.id, { httpOnly: true, path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 7 })
  res.cookies.delete("auth_token")
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete("employee_token")
  return res
}
