import type { Metadata } from "next"
import { Geist } from "next/font/google"
import "./globals.css"

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TeamPulse — Remote Employee CRM",
  description: "Manage and monitor your remote team with ease",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased dark`}>
      <body className="h-full bg-[#0a0a0c] text-white">{children}</body>
    </html>
  )
}
