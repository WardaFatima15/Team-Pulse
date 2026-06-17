import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

type Employee = { id: string; passwordHash: string }

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  const emp = db.prepare("SELECT id, passwordHash FROM Employee WHERE email = ?").get(email) as Employee | undefined
  if (!emp || !bcrypt.compareSync(password, emp.passwordHash)) {
    return NextResponse.json({ ok: false, error: "Invalid email or password" }, { status: 401 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set("employee_token", emp.id, { httpOnly: true, path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 7 })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete("employee_token")
  return res
}
