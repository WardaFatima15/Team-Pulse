import { NextRequest, NextResponse } from "next/server"
import { settleAllStaleOpenSessions } from "@/lib/time"

// Daily safety sweep (Vercel Cron). Closes any open session that has passed its
// shift length or the 12h safety cap, crediting the hours actually worked.
// The presence heartbeat already does this in real time — this is the backstop
// for anyone who never came back online to trigger a heartbeat.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const closed = await settleAllStaleOpenSessions()
  return NextResponse.json({ ok: true, closedSessions: closed })
}
