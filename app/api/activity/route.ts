import { NextRequest, NextResponse } from "next/server"
import { queryAll } from "@/lib/db"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get("employeeId")
  const limit = parseInt(searchParams.get("limit") ?? "50")

  const rows = employeeId
    ? await queryAll(
        `SELECT * FROM "ActivityLog" WHERE "employeeId" = $1 ORDER BY "createdAt" DESC LIMIT $2`,
        [employeeId, limit]
      )
    : await queryAll(
        `SELECT * FROM "ActivityLog" ORDER BY "createdAt" DESC LIMIT $1`,
        [limit]
      )

  return NextResponse.json(rows)
}
