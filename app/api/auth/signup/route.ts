import { NextRequest, NextResponse } from "next/server"
import { queryOne, execute } from "@/lib/db"
import { sendAdminWelcomeEmail } from "@/lib/email"
import bcrypt from "bcryptjs"
import { randomUUID } from "node:crypto"

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 7)
}

export async function POST(req: NextRequest) {
  const { name, orgName, email, password } = await req.json()

  if (!orgName?.trim() || !email?.trim() || !password?.trim()) {
    return NextResponse.json({ ok: false, error: "All fields are required." }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: "Password must be at least 6 characters." }, { status: 400 })
  }

  const existing = await queryOne(`SELECT id FROM "Admin" WHERE email = $1`, [email.toLowerCase()])
  if (existing) {
    return NextResponse.json({ ok: false, error: "An account with this email already exists." }, { status: 409 })
  }

  const orgId = randomUUID()
  const adminId = randomUUID()
  const now = new Date().toISOString()
  const passwordHash = bcrypt.hashSync(password, 10)

  try {
    await execute(
      `INSERT INTO "Organization" (id, name, slug, "createdAt") VALUES ($1, $2, $3, $4)`,
      [orgId, orgName.trim(), slugify(orgName), now]
    )
    await execute(
      `INSERT INTO "Admin" (id, name, email, "passwordHash", "organizationId", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, name?.trim() || email.split("@")[0], email.toLowerCase().trim(), passwordHash, orgId, now]
    )
  } catch (err) {
    console.error("[signup]", err)
    return NextResponse.json({ ok: false, error: "Failed to create workspace. Please try again." }, { status: 500 })
  }

  // Send welcome email (non-blocking — don't fail signup if email fails)
  sendAdminWelcomeEmail({ email: email.toLowerCase().trim(), orgName: orgName.trim() }).catch(() => {})

  const res = NextResponse.json({ ok: true })
  res.cookies.set("auth_token", adminId, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" })
  res.cookies.delete("employee_token")
  return res
}
