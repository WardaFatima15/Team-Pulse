"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Bot, User, Sparkles, Trash2 } from "lucide-react"

type Message = { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "How should I handle a team member who is frequently missing deadlines?",
  "What's a fair leave policy for a remote team across time zones?",
  "How do I write a constructive performance review?",
  "What are signs of employee burnout I should watch for?",
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streaming])

  async function send(text: string) {
    if (!text.trim() || streaming) return
    const userMsg: Message = { role: "user", content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    setStreaming(true)

    const assistantMsg: Message = { role: "assistant", content: "" }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok) throw new Error("API error")

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem-3rem)] max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[#512feb]/15 flex items-center justify-center">
            <Sparkles className="size-5 text-[#7c5af5]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">HR AI Assistant</h1>
            <p className="text-xs text-white/50">Powered by GPT-4o mini · Ask anything about your team</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded-lg hover:bg-white/5">
            <Trash2 className="size-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {messages.length === 0 ? (
          <div className="space-y-3 pt-4">
            <p className="text-white/40 text-sm text-center mb-6">Ask me anything about HR, team management, or your employees</p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  className="text-left px-4 py-3 rounded-xl border border-white/8 hover:border-[#512feb]/40 hover:bg-[#512feb]/5 text-sm text-white/60 hover:text-white/90 transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="size-8 rounded-lg bg-[#512feb]/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="size-4 text-[#7c5af5]" />
                </div>
              )}
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[#512feb] text-white rounded-tr-sm"
                  : "bg-[#0d0d12] border border-white/10 text-white/90 rounded-tl-sm"
              }`}>
                {msg.content}
                {msg.role === "assistant" && i === messages.length - 1 && streaming && (
                  <span className="inline-block w-1.5 h-4 bg-[#7c5af5] ml-0.5 animate-pulse rounded-sm" />
                )}
              </div>
              {msg.role === "user" && (
                <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="size-4 text-white/60" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-4">
        <div className="flex gap-2 items-end bg-[#0d0d12] border border-white/10 rounded-2xl p-3 focus-within:border-[#512feb]/50 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about leave policies, performance, team management…"
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 resize-none focus:outline-none min-h-[24px] max-h-32"
            style={{ height: "auto" }}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement
              el.style.height = "auto"
              el.style.height = el.scrollHeight + "px"
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="size-8 rounded-xl bg-[#512feb] hover:bg-[#3f1fd4] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="size-4 text-white" />
          </button>
        </div>
        <p className="text-xs text-white/25 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
