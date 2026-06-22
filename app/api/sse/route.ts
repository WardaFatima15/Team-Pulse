import { NextRequest } from "next/server"
import { queryAll } from "@/lib/db"

export const dynamic = "force-dynamic"

type Employee = { id: string; name: string; status: string; role: string; department: string }

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      async function send() {
        try {
          const employees = await queryAll<Employee>(
            `SELECT id, name, status, role, department FROM "Employee" ORDER BY name`
          )
          const data = JSON.stringify(employees)
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch {
          controller.enqueue(encoder.encode(`data: []\n\n`))
        }
      }

      await send()
      const interval = setInterval(send, 10000)

      req.signal.addEventListener("abort", () => {
        clearInterval(interval)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
