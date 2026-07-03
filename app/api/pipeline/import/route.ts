import { NextRequest, NextResponse } from "next/server"
import { getActor } from "@/lib/actor"
import { parseLeadsFile } from "@/lib/lead-import"

export const runtime = "nodejs"

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB — plenty for a lead spreadsheet

export async function POST(req: NextRequest) {
  const actor = await getActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is too large (max 5MB)" }, { status: 400 })
  }
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    return NextResponse.json({ error: "Please upload a .xlsx or .csv file" }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { rows, totalDataRows } = await parseLeadsFile(buffer, file.name)
    return NextResponse.json({ rows, totalDataRows, skipped: totalDataRows - rows.length })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Couldn't read that file"
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
