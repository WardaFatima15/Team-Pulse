import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { queryAll, queryOne } from "@/lib/db"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
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

  const stream = await client.messages.stream({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
