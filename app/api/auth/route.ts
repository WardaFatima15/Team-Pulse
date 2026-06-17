import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  // Check admin table first
  const admin = db.prepare("SELECT * FROM Admin WHERE email = ?").get(email) as
    | { id: string; passwordHash: string } | undefined

  if (admin && bcrypt.compareSync(password, admin.passwordHash)) {
    const res = NextResponse.json({ ok: true, role: "admin" })
    res.cookies.set("auth_token", admin.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" })
    return res
  }

  // Check employee table
  const emp = db.prepare("SELECT id, passwordHash FROM Employee WHERE email = ?").get(email) as
    | { id: string; passwordHash: string } | undefined

  if (emp && bcrypt.compareSync(password, emp.passwordHash)) {
    const res = NextResponse.json({ ok: true, role: "employee" })
    res.cookies.set("employee_token", emp.id, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" })
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
