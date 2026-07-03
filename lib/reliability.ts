import { queryAll } from "@/lib/db"

export type ReliabilityStats = {
  onTime: number
  late: number
  absent: number
  avgOffsetMinutes: number | null // positive = late on average, negative = early
} | null

const GRACE_MINUTES = 10 // small buffer before a late clock-in counts as "late"

function isWeekday(dateIso: string): boolean {
  const day = new Date(dateIso + "T12:00:00").getDay()
  return day !== 0 && day !== 6
}

// Punctuality over the last 30 weekdays (excluding today, which is still in
// progress). Needs shiftStart to mean anything — without it there's no
// expected time to compare against, so we return null.
export async function computeReliability(
  employeeId: string,
  shiftStart: string,
  joinDate: string
): Promise<ReliabilityStats> {
  if (!shiftStart) return null
  const [h, m] = shiftStart.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  const shiftMinutes = h * 60 + m

  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  const windowStart = new Date(Date.now() - 30 * 86400000)
  const joinD = joinDate ? new Date(joinDate) : windowStart
  const start = joinD > windowStart ? joinD : windowStart

  const dates: string[] = []
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const iso = d.toISOString().slice(0, 10)
    if (iso !== todayIso && isWeekday(iso)) dates.push(iso)
  }
  if (dates.length === 0) return { onTime: 0, late: 0, absent: 0, avgOffsetMinutes: null }

  const records = await queryAll<{ date: string; clockIn: string }>(
    `SELECT date, "clockIn" FROM "TimeRecord" WHERE "employeeId" = $1 AND date = ANY($2)`,
    [employeeId, dates]
  )

  let onTime = 0, late = 0, absent = 0
  const offsets: number[] = []

  for (const date of dates) {
    const rec = records.find(r => r.date === date)
    const [ch, cm] = (rec?.clockIn ?? "").split(":").map(Number)
    if (!rec || Number.isNaN(ch)) { absent++; continue }
    const offset = ch * 60 + cm - shiftMinutes
    offsets.push(offset)
    if (offset > GRACE_MINUTES) late++
    else onTime++
  }

  const avgOffsetMinutes = offsets.length > 0
    ? Math.round(offsets.reduce((a, b) => a + b, 0) / offsets.length)
    : null

  return { onTime, late, absent, avgOffsetMinutes }
}
