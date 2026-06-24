import { NextRequest, NextResponse } from "next/server"

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/api")) return NextResponse.next()
  if (pathname === "/login" || pathname === "/signup") return NextResponse.next()
  if (pathname === "/employee/login") return NextResponse.next()

  // Employee portal — requires employee_token
  if (pathname === "/employee" || pathname.startsWith("/employee/")) {
    if (!req.cookies.get("employee_token")?.value)
      return NextResponse.redirect(new URL("/login", req.url))
    return NextResponse.next()
  }

  // Admin portal — requires auth_token
  if (!req.cookies.get("auth_token")?.value)
    return NextResponse.redirect(new URL("/login", req.url))
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
