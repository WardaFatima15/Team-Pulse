import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const domain = searchParams.get("domain")
  const email = searchParams.get("email")
  const token = searchParams.get("token")

  if (!domain || !email || !token) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
  }

  const base = domain.startsWith("http") ? domain : `https://${domain}`
  const auth = Buffer.from(`${email}:${token}`).toString("base64")

  try {
    const res = await fetch(`${base}/rest/api/3/users/search?maxResults=100`, {
      headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
    })
    const text = await res.text()
    if (!res.ok) return NextResponse.json({ error: text }, { status: res.status })
    return NextResponse.json(JSON.parse(text))
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
