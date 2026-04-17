"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Document, Page, pdfjs } from "react-pdf"
import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, ChevronLeft, ChevronRight, Download, Loader2, Send, User } from "lucide-react"
import { cn } from "@/lib/utils"

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function FileViewerPage() {
  const params = useParams()
  const search = useSearchParams()
  const orgId = params.id as string
  const teamId = params.team_id as string
  const fileId = Number(params.file_id)
  const fileName = search.get("name") || "Document"
  const fileUrl = search.get("url") || ""

  const [pdfData, setPdfData] = useState<Uint8Array | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [numPages, setNumPages] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fileId) return
    const token = localStorage.getItem("access_token")
    if (!token) return

    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/team/${teamId}/file/${fileId}/content`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed")
        return res.arrayBuffer()
      })
      .then((buf) => setPdfData(new Uint8Array(buf)))
      .catch(() => setLoadError(true))
  }, [orgId, teamId, fileId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const documentFile = useMemo(
    () => (pdfData ? { data: new Uint8Array(pdfData) } : null),
    [pdfData]
  )

  const sendMessage = async () => {
    const query = input.trim()
    if (!query || chatLoading) return

    const token = localStorage.getItem("access_token")
    if (!token) return

    setInput("")
    setMessages((prev) => [...prev, { role: "user", content: query }])
    setChatLoading(true)

    try {
      const res = await fetch(
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
            document_id: fileId,
          }),
        }
      )

      if (!res.ok) throw new Error("assistant failed")
      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || "(no answer)" },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't answer that right now." },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background">
      <header className="flex flex-shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium">{fileName}</h1>
          <p className="text-xs text-muted-foreground">PDF viewer with AI assistant</p>
        </div>
        <div className="flex items-center gap-2">
          {numPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[60px] text-center text-xs text-muted-foreground">
                {pageNumber} / {numPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={pageNumber >= numPages}
                onClick={() => setPageNumber((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noreferrer" download>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Download">
                <Download className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-auto bg-muted/30 p-4">
          {loadError && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Failed to load PDF</p>
            </div>
          )}
          {!loadError && !documentFile && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {documentFile && (
            <div className="flex justify-center">
              <Document
                file={documentFile}
                onLoadSuccess={({ numPages }) => {
                  setNumPages(numPages)
                  setPageNumber(1)
                }}
                loading={
                  <div className="flex h-full items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                }
                error={
                  <div className="flex h-full items-center justify-center py-12">
                    <p className="text-sm text-muted-foreground">Failed to render PDF</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  width={800}
                  loading={
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  }
                />
              </Document>
            </div>
          )}
        </div>

        <aside className="flex w-[400px] flex-col border-l bg-background">
          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Bot className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium">Ask about this PDF</h2>
          </div>

          <div className="flex-1 overflow-auto px-4 py-3">
            {messages.length === 0 && !chatLoading && (
              <p className="text-sm text-muted-foreground">
                Ask a question about this document — answers are scoped to its content.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2 text-sm",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {m.role === "assistant" && (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 whitespace-pre-wrap",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {m.content}
                  </div>
                  {m.role === "user" && (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t px-4 py-3">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Ask a question..."
                disabled={chatLoading}
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={chatLoading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
