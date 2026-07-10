"use client"

import { useEffect, useRef, useState } from "react"

type FeedLine = { time: string; tag: string; tagColor: string; text: string }

const LINES: FeedLine[] = [
  { time: "09:02", tag: "CLOCK-IN", tagColor: "text-green-400", text: "Sarah K. clocked in — Karachi (GMT+5)" },
  { time: "09:14", tag: "TASK", tagColor: "text-sky-400", text: "\"Fix checkout flow\" moved to In Progress" },
  { time: "09:31", tag: "UPDATE", tagColor: "text-white/70", text: "Daily check-in submitted by Hamza A." },
  { time: "10:05", tag: "LEAD", tagColor: "text-amber-400", text: "New lead: Meridian Logistics → Pitched" },
  { time: "10:22", tag: "PROPOSAL", tagColor: "text-[#7c5af5]", text: "SDR Pod proposal sent to Acme Corp" },
  { time: "11:00", tag: "AUDIT", tagColor: "text-teal-400", text: "PlugAI audit completed — 4 gaps found" },
  { time: "11:48", tag: "REPORT", tagColor: "text-white/70", text: "Weekly client report generated (AI)" },
  { time: "12:15", tag: "BLOCKER", tagColor: "text-red-400", text: "API keys pending — flagged to client" },
  { time: "13:02", tag: "DEAL", tagColor: "text-green-400", text: "Meridian Logistics → Closed Won 🎉" },
]

/** Terminal-style feed that types product events line by line, then loops. */
export default function LiveFeed() {
  const [count, setCount] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setCount(c => (c >= LINES.length ? 1 : c + 1))
    }, 1400)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" })
  }, [count])

  return (
    <div className="rounded-xl border border-white/12 bg-[#0c0c10] font-mono text-[13px] leading-relaxed shadow-[0_0_60px_-20px_rgba(81,47,235,0.35)]">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-500/70" />
        <span className="size-2.5 rounded-full bg-yellow-500/70" />
        <span className="size-2.5 rounded-full bg-green-500/70" />
        <span className="ml-3 text-[11px] tracking-wide text-white/40">cadenz — live team feed</span>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-green-400">
          <span className="size-1.5 animate-pulse rounded-full bg-green-400" /> live
        </span>
      </div>

      <div ref={boxRef} className="h-64 overflow-hidden px-4 py-3">
        {LINES.slice(0, count).map((l, i) => (
          <p key={i} className="feed-line whitespace-nowrap py-0.5">
            <span className="text-white/30">{l.time}</span>{" "}
            <span className={`${l.tagColor} font-semibold`}>[{l.tag}]</span>{" "}
            <span className="text-white/75">{l.text}</span>
          </p>
        ))}
        <p className="py-0.5">
          <span className="text-white/30">{">"}</span>
          <span className="caret-blink ml-1 inline-block h-3.5 w-2 bg-white/60 align-middle" />
        </p>
      </div>
    </div>
  )
}
