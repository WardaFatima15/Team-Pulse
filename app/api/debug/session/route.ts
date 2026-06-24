import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { queryOne, queryAll } from "@/lib/db"

export async function GET() {
  const store = await cookies()
  const adminId = store.get("auth_token")?.value
  const empId = store.get("employee_token")?.value

  const admin = adminId
    ? await queryOne(`SELECT id, email, "organizationId" FROM "Admin" WHERE id = $1`, [adminId])
    : null

  const allOrgs = await queryAll(`SELECT id, name FROM "Organization"`)
  const allAdmins = await queryAll(`SELECT id, email, "organizationId" FROM "Admin"`)

  const employees = admin
    ? await queryAll(`SELECT id, name, "organizationId" FROM "Employee" WHERE "organizationId" = $1`, [(admin as { organizationId: string }).organizationId])
    : []

  return NextResponse.json({
    cookies: { adminId: adminId ?? null, empId: empId ?? null },
    admin,
    employees,
    allOrgs,
    allAdmins,
  })
}
