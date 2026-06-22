import { NextRequest, NextResponse } from "next/server"
import { queryAll } from "@/lib/db"

function getWeekRange(date: string) {
  const d = new Date(date)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return [monday.toISOString().slice(0, 10), sunday.toISOString().slice(0, 10)]
}

function getMonthRange(date: string) {
  const [y, m] = date.split("-")
  const start = `${y}-${m}-01`
  const last = new Date(Number(y), Number(m), 0).getDate()
  const end = `${y}-${m}-${String(last).padStart(2, "0")}`
  return [start, end]
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("mode") ?? "week"
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10)

  const [start, end] = mode === "month" ? getMonthRange(date) : getWeekRange(date)

  const records = await queryAll(
    `SELECT "employeeId", date, "clockIn", "clockOut", hours FROM "TimeRecord" WHERE date >= $1 AND date <= $2 ORDER BY date`,
    [start, end]
  )
  return NextResponse.json(records)
}
