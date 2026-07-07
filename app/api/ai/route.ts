import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { queryOne } from "@/lib/db"

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not set" }, { status: 503 })
  }
  const client = new OpenAI()

  const { messages } = await req.json()

  const [empCount, leaveCount, ticketCount] = await Promise.all([
    queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM "Employee"`),
    queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM "LeaveRequest" WHERE status = 'pending'`),
    queryOne<{ n: string }>(`SELECT COUNT(*) as n FROM "Ticket" WHERE status != 'resolved'`),
  ])

  const systemPrompt = `You are an AI HR assistant for TeamPulse, a remote employee management platform built by Binary Next.

Current team stats:
- Total employees: ${empCount?.n ?? 0}
- Pending leave requests: ${leaveCount?.n ?? 0}
- Open support tickets: ${ticketCount?.n ?? 0}

You help managers with HR queries, policy guidance, employee management advice, leave management, and team productivity insights. Keep responses concise and actionable. You can suggest what to check in the dashboard when relevant.`

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 1024,
    stream: true,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) controller.enqueue(encoder.encode(delta))
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
