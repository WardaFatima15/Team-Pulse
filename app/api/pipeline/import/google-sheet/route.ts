import { NextRequest, NextResponse } from "next/server"
import { getActor } from "@/lib/actor"
import { parseLeadsFile } from "@/lib/lead-import"

export const runtime = "nodejs"

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB — plenty for a lead spreadsheet

// We never fetch the user-supplied URL directly — only a fixed-host export
// URL we build ourselves from a validated sheet ID/gid — so an attacker
// can't point this server-side fetch at an arbitrary internal address.
function extractSheetIdAndGid(input: string): { id: string; gid?: string } {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    throw new Error("That doesn't look like a valid URL")
  }
  if (url.hostname !== "docs.google.com") {
    throw new Error("Please paste a docs.google.com/spreadsheets link")
  }
  const match = url.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) {
    throw new Error("Couldn't find a spreadsheet ID in that URL")
  }
  const gidFromQuery = url.searchParams.get("gid")
  const gidFromHash = url.hash.match(/gid=([0-9]+)/)?.[1]
  const gidRaw = gidFromQuery ?? gidFromHash
  return { id: match[1], gid: gidRaw && /^[0-9]+$/.test(gidRaw) ? gidRaw : undefined }
}

export async function POST(req: NextRequest) {
  const actor = await getActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  const sheetUrl = body?.url
  if (typeof sheetUrl !== "string" || !sheetUrl.trim()) {
    return NextResponse.json({ error: "Please paste a Google Sheets link" }, { status: 400 })
  }

  let id: string
  let gid: string | undefined
  try {
    ;({ id, gid } = extractSheetIdAndGid(sheetUrl))
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid URL" }, { status: 400 })
  }

  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`

  let res: Response
  try {
    res = await fetch(exportUrl, { redirect: "follow" })
  } catch {
    return NextResponse.json({ error: "Couldn't reach Google Sheets — check the link and try again" }, { status: 400 })
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Couldn't access that sheet. Make sure sharing is set to 'Anyone with the link can view'." },
      { status: 400 }
    )
  }
  // A private sheet redirects the export request to an HTML login/consent
  // page instead of returning CSV — content-type is the cheapest tell.
  const contentType = res.headers.get("content-type") ?? ""
  if (contentType.includes("text/html")) {
    return NextResponse.json(
      { error: "That sheet isn't publicly viewable. Set sharing to 'Anyone with the link can view' and try again." },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.byteLength > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "Sheet is too large (max 5MB exported as CSV)" }, { status: 400 })
  }

  try {
    const { rows, totalDataRows } = await parseLeadsFile(buffer, "sheet.csv")
    return NextResponse.json({ rows, totalDataRows, skipped: totalDataRows - rows.length })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Couldn't read that sheet"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
