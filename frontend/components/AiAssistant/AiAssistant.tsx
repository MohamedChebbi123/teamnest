"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { usePathname } from "next/navigation"
import { X, Send, Loader2, Bot, User } from "lucide-react"
import { cn, formatApiError } from "@/lib/utils"
import { getAccessToken } from "@/lib/auth"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function AiAssistant() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const pathname = usePathname()

  const { orgId, teamId } = useMemo(() => {
    const match = pathname?.match(/\/organization\/(\d+)(?:\/(\d+))?/)
    return {
      orgId: match?.[1] || undefined,
      teamId: match?.[2] || undefined,
    }
  }, [pathname])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // Only show on organization pages with a team selected
  if (!orgId || !teamId) return null

  const sendMessage = async () => {
    const query = input.trim()
    if (!query || loading) return

    const token = getAccessToken()
    if (!token) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: query }])
    setLoading(true)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query,
            team_id: Number(teamId),
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error("Assistant API error:", response.status, errorData)
        throw new Error(formatApiError(errorData?.detail, "Failed to get response"))
      }

      const data = await response.json()
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer }])
    } catch (err) {
      console.error("Assistant error:", err)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your request. Please try again." },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105",
          open
            ? "bg-zinc-700 hover:bg-zinc-600"
            : "bg-indigo-600 hover:bg-indigo-500"
        )}
      >
        {open ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Bot className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Chat box */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-zinc-700 bg-zinc-800 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">TeamNest AI</p>
              <p className="text-xs text-zinc-400">Ask about tasks</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Bot className="h-10 w-10 text-zinc-600 mb-3" />
                <p className="text-sm text-zinc-400">
                  Ask me anything about your team's tasks.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 mt-1">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-xl px-3 py-2 text-sm",
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-800 text-zinc-200"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === "user" && (
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-700 mt-1">
                    <User className="h-3 w-3 text-zinc-300" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 mt-1">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="rounded-xl bg-zinc-800 px-3 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-700 bg-zinc-800 px-3 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask TeamNest AI..."
                disabled={loading}
                className="flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
