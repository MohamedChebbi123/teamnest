"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Loader2, MessageCircle, SendHorizontal, Smile, Paperclip, Pencil, Trash2, Search, Reply, X } from "lucide-react"
import { toast } from "sonner"

type DmReplyMessage = {
  message_id: number
  sender_id: number
  receiver_id: number
  content: string
  is_file?: boolean
  file_attachment?: {
    file_name: string
    file_url: string
    file_size: number
  } | null
  sender?: {
    user_id: number
    first_name: string
    last_name: string
    avatar_url?: string | null
    user_tag?: string | null
  }
}

type DmMessage = {
  message_id: number
  sender_id: number
  receiver_id: number
  parent_id?: number | null
  reply_to?: DmReplyMessage | null
  content: string
  is_file?: boolean
  file_attachment?: {
    file_name: string
    file_url: string
    file_size: number
  } | null
  is_deleted?: boolean
  sent_at: string
  edited_at?: string | null
  sender: {
    user_id: number
    first_name: string
    last_name: string
    avatar_url?: string | null
    user_tag?: string | null
  }
}

type ConversationItem = {
  user: {
    user_id: number
    first_name: string
    last_name: string
    avatar_url?: string | null
    user_tag?: string | null
  }
  last_message: {
    message_id: number
    sender_id: number
    receiver_id: number
    content: string
    is_file?: boolean
    file_attachment?: {
      file_name: string
      file_url: string
      file_size: number
    } | null
    sent_at?: string | null
    edited_at?: string | null
  }
}

const EMOJI_LIST = ["😀", "😂", "😍", "🤔", "😎", "😭", "🔥", "👍", "❤️", "🎉", "🙏", "✅"]

export default function ChannelsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const receiverId = searchParams.get("dm_user_id")
  const initialMessage = searchParams.get("initial_message") || ""

  const [messageInput, setMessageInput] = useState("")
  const [messages, setMessages] = useState<DmMessage[]>([])
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [replyingTo, setReplyingTo] = useState<DmMessage | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialMessageHandledRef = useRef<string | null>(null)
  const selectedReceiverRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    selectedReceiverRef.current = receiverId ? Number(receiverId) : null
  }, [receiverId])

  const fetchConversations = async () => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    setLoadingConversations(true)
    try {
      const response = await fetch("http://localhost:8000/direct-messages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch conversations")
      }

      const data = await response.json()
      const nextConversations = Array.isArray(data.conversations) ? data.conversations : []
      setConversations(nextConversations)
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setLoadingConversations(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/auth/login")
      return
    }

    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("http://localhost:8000/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          router.push("/auth/login")
          return
        }

        const data = await response.json()
        setCurrentUserId(data.user_id)
      } catch {
        router.push("/auth/login")
      }
    }

    fetchCurrentUser()
    fetchConversations()
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token || !receiverId) {
      setMessages([])
      return
    }

    const fetchConversation = async () => {
      setLoadingMessages(true)
      try {
        const response = await fetch(`http://localhost:8000/direct-messages/${receiverId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/auth/login")
            return
          }
          throw new Error("Failed to fetch direct messages")
        }

        const data = await response.json()
        const fetchedMessages = Array.isArray(data.messages) ? data.messages : []
        setMessages(fetchedMessages)
      } catch (error) {
        console.error("Error fetching direct messages:", error)
        toast.error("Error", {
          description: "Failed to load direct messages"
        })
      } finally {
        setLoadingMessages(false)
      }
    }

    fetchConversation()
  }, [receiverId, router])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    const connect = () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return

      const ws = new WebSocket(`ws://localhost:8000/ws/direct-messages?token=${token}`)

      ws.onopen = () => {
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.type === "new_direct_message" && data.message) {
            const message = data.message as DmMessage
            const selectedReceiver = selectedReceiverRef.current

            if (selectedReceiver !== null) {
              const inCurrentConversation =
                message.sender_id === selectedReceiver || message.receiver_id === selectedReceiver

              if (inCurrentConversation) {
                setMessages((previous) => {
                  const exists = previous.some((item) => item.message_id === message.message_id)
                  if (exists) return previous
                  return [...previous, message]
                })
              }
            }

            fetchConversations()
            return
          }

          if (data.type === "direct_message_edited" && data.message) {
            const edited = data.message as DmMessage
            setMessages((previous) => previous.map((item) => (
              item.message_id === edited.message_id ? edited : item
            )))
            fetchConversations()
            return
          }

          if (data.type === "direct_message_deleted" && typeof data.message_id === "number") {
            setMessages((previous) => previous.filter((item) => item.message_id !== data.message_id))
            fetchConversations()
            return
          }

          if (data.type === "error") {
            toast.error("Error", { description: data.detail || "Realtime error" })
          }
        } catch (error) {
          console.error("Error parsing websocket message:", error)
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        reconnectTimeoutRef.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        setIsConnected(false)
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  const sendMessage = async (customMessage?: string) => {
    const content = (customMessage ?? messageInput).trim()
    if (!content || !receiverId || currentUserId === null) return

    setIsSendingMessage(true)
    try {
      const payload = {
        type: "send_message",
        receiver_id: Number(receiverId),
        content,
        parent_id: replyingTo?.message_id ?? null,
      }

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload))
      } else {
        const token = localStorage.getItem("access_token")
        if (!token) {
          router.push("/auth/login")
          return
        }

        const response = await fetch("http://localhost:8000/direct-messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            sender_id: currentUserId,
            receiver_id: Number(receiverId),
            content,
            parent_id: replyingTo?.message_id ?? null,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to send message")
        }

        const created = await response.json()
        setMessages((previous) => {
          const exists = previous.some((item) => item.message_id === created.message_id)
          if (exists) return previous
          return [...previous, created]
        })
        fetchConversations()
      }

      if (!customMessage) {
        setMessageInput("")
      }
      setReplyingTo(null)
    } catch (error) {
      console.error("Error sending direct message:", error)
      toast.error("Error", {
        description: "Failed to send message"
      })
    } finally {
      setIsSendingMessage(false)
    }
  }

  const editMessage = async () => {
    if (!editingMessageId) return
    const trimmed = editingContent.trim()
    if (!trimmed) return

    setIsSavingEdit(true)
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "edit_message",
          message_id: editingMessageId,
          content: trimmed,
        }))
      } else {
        const token = localStorage.getItem("access_token")
        if (!token) {
          router.push("/auth/login")
          return
        }

        const response = await fetch(`http://localhost:8000/direct-messages/${editingMessageId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: trimmed }),
        })

        if (!response.ok) {
          throw new Error("Failed to edit message")
        }

        const updated = await response.json()
        setMessages((previous) => previous.map((item) => (
          item.message_id === updated.message_id ? updated : item
        )))
        fetchConversations()
      }

      setEditingMessageId(null)
      setEditingContent("")
    } catch (error) {
      console.error("Error editing message:", error)
      toast.error("Error", { description: "Failed to edit message" })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const deleteMessage = async (messageId: number) => {
    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "delete_message",
          message_id: messageId,
        }))
      } else {
        const token = localStorage.getItem("access_token")
        if (!token) {
          router.push("/auth/login")
          return
        }

        const response = await fetch(`http://localhost:8000/direct-messages/${messageId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to delete message")
        }

        setMessages((previous) => previous.filter((item) => item.message_id !== messageId))
        if (replyingTo?.message_id === messageId) {
          setReplyingTo(null)
        }
        fetchConversations()
      }
    } catch (error) {
      console.error("Error deleting message:", error)
      toast.error("Error", { description: "Failed to delete message" })
    }
  }

  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const uploadFileMessage = async (file: File) => {
    if (!receiverId) return

    setIsUploadingFile(true)
    try {
      const fileBase64 = await fileToDataUrl(file)

      if (!(wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
        toast.error("Realtime required", {
          description: "File upload needs an active realtime connection"
        })
        return
      }

      wsRef.current.send(JSON.stringify({
        type: "send_file",
        receiver_id: Number(receiverId),
        file_name: file.name,
        file_size: file.size,
        file_base64: fileBase64,
        mime_type: file.type || null,
        parent_id: replyingTo?.message_id ?? null,
      }))
      setReplyingTo(null)
      toast.success("File sent", {
        description: `${file.name} is being delivered in realtime`
      })
    } catch (error) {
      console.error("Error uploading file:", error)
      toast.error("Error", { description: "Failed to upload file" })
    } finally {
      setIsUploadingFile(false)
    }
  }

  useEffect(() => {
    if (!receiverId || !initialMessage || initialMessageHandledRef.current === receiverId) return
    if (currentUserId === null) return

    initialMessageHandledRef.current = receiverId
    sendMessage(initialMessage)

    const params = new URLSearchParams(searchParams.toString())
    params.delete("initial_message")
    router.replace(`/direct-messages?${params.toString()}`)
  }, [receiverId, initialMessage, currentUserId, searchParams, router])

  const filteredConversations = conversations.filter((item) => {
    const fullName = `${item.user.first_name} ${item.user.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  const activeReceiverId = receiverId ? Number(receiverId) : null
  const activeConversation = activeReceiverId !== null
    ? conversations.find((item) => item.user.user_id === activeReceiverId)
    : null
  const isComposerDisabled = activeReceiverId === null || isSendingMessage || isUploadingFile
  const activeReceiverName = activeConversation
    ? `${activeConversation.user.first_name} ${activeConversation.user.last_name}`
    : (searchParams.get("dm_name") || "Member")

  const getMessagePreview = (message: DmReplyMessage | DmMessage | null) => {
    if (!message) return ""
    if (message.is_file) {
      return `[File] ${message.file_attachment?.file_name || "Attachment"}`
    }
    return message.content || ""
  }

  const isImageAttachment = (fileName: string, fileUrl: string) => {
    const imagePattern = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i
    const cleanName = fileName.split("?")[0]
    const cleanUrl = fileUrl.split("?")[0]
    return imagePattern.test(cleanName) || imagePattern.test(cleanUrl)
  }

  const resolveReplyTarget = (message: DmMessage) => {
    if (message.reply_to) return message.reply_to
    if (!message.parent_id) return null
    return messages.find((item) => item.message_id === message.parent_id) || null
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="mx-auto grid h-[calc(100vh-3rem)] w-full max-w-6xl grid-cols-1 gap-3 md:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4" />
              Direct Messages
            </CardTitle>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search users..."
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-13rem)]">
              <div className="space-y-1 p-2">
                {loadingConversations ? (
                  <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading conversations...
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No conversations yet.</p>
                ) : (
                  filteredConversations.map((item) => {
                    const isActive = activeReceiverId === item.user.user_id
                    const preview = item.last_message.is_file
                      ? `[File] ${item.last_message.file_attachment?.file_name || "Attachment"}`
                      : (item.last_message.content || "")

                    return (
                      <button
                        key={item.user.user_id}
                        onClick={() => {
                          router.push(`/direct-messages?dm_user_id=${item.user.user_id}&dm_name=${encodeURIComponent(`${item.user.first_name} ${item.user.last_name}`)}`)
                        }}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${isActive ? "bg-muted border-primary/30" : "hover:bg-muted/50"}`}
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {`${item.user.first_name[0] || ""}${item.user.last_name[0] || ""}`.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {item.user.first_name} {item.user.last_name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{preview}</p>
                          </div>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          {activeReceiverId === null ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a conversation to start chatting.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{activeReceiverName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{activeReceiverName}</p>
                    <p className="text-xs text-muted-foreground">Direct chat</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{isConnected ? "Live" : "Connecting..."}</p>
              </div>

              <ScrollArea className="min-h-0 flex-1 bg-muted/20 px-4 py-4">
                <div className="space-y-2">
                  {loadingMessages ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
                  ) : (
                    messages.map((msg) => {
                      const isMine = currentUserId !== null && msg.sender_id === currentUserId
                      const isEditing = editingMessageId === msg.message_id

                      return (
                        <div key={msg.message_id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground" : "bg-card border text-foreground"}`}>
                            {!isMine && msg.sender && (
                              <p className="mb-1 text-[10px] font-semibold uppercase opacity-70">
                                {msg.sender.first_name} {msg.sender.last_name}
                              </p>
                            )}

                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editingContent}
                                  onChange={(event) => setEditingContent(event.target.value)}
                                  className="h-8 bg-background text-foreground"
                                />
                                <Button size="sm" onClick={editMessage} disabled={isSavingEdit}>
                                  {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => { setEditingMessageId(null); setEditingContent("") }}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <>
                                {resolveReplyTarget(msg) && (
                                  <div className={`mb-2 rounded-md border px-2 py-1 text-xs ${isMine ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border bg-muted/60"}`}>
                                    <p className="font-medium opacity-80">
                                      Replying to {resolveReplyTarget(msg)?.sender?.first_name || "message"}
                                    </p>
                                    <p className="truncate opacity-90">{getMessagePreview(resolveReplyTarget(msg))}</p>
                                  </div>
                                )}

                                {msg.is_file && msg.file_attachment ? (
                                  isImageAttachment(msg.file_attachment.file_name, msg.file_attachment.file_url) ? (
                                    <a href={msg.file_attachment.file_url} target="_blank" rel="noreferrer" className="mb-1 block">
                                      <img
                                        src={msg.file_attachment.file_url}
                                        alt={msg.file_attachment.file_name}
                                        className="max-h-[280px] w-auto max-w-full rounded-lg border border-white/20 object-contain"
                                      />
                                      <p className="mt-1 text-xs underline underline-offset-2 opacity-80">
                                        {msg.file_attachment.file_name}
                                      </p>
                                    </a>
                                  ) : (
                                    <a href={msg.file_attachment.file_url} target="_blank" rel="noreferrer" className="underline">
                                      {msg.file_attachment.file_name}
                                    </a>
                                  )
                                ) : (
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}
                              </>
                            )}

                            {!isEditing && (
                              <div className="mt-2 flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setReplyingTo(msg)}
                                  className="rounded p-1 hover:bg-black/10"
                                  aria-label="Reply to message"
                                >
                                  <Reply className="h-3.5 w-3.5" />
                                </button>
                                {!msg.is_file && (
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(msg.message_id)
                                      setEditingContent(msg.content)
                                    }}
                                    className="rounded p-1 hover:bg-black/10"
                                    aria-label="Edit message"
                                    disabled={!isMine}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteMessage(msg.message_id)}
                                  className="rounded p-1 hover:bg-black/10"
                                  aria-label="Delete message"
                                  disabled={!isMine}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ScrollArea>

            </>
          )}

          <div className="border-t p-3">
            {activeReceiverId !== null && replyingTo && (
                  <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border bg-muted/50 p-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">
                        Replying to {replyingTo.sender.first_name} {replyingTo.sender.last_name}
                      </p>
                      <p className="truncate text-sm">{getMessagePreview(replyingTo)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="rounded p-1 hover:bg-muted"
                      aria-label="Cancel reply"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

            {activeReceiverId !== null && isUploadingFile && (
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Uploading file...
              </div>
            )}

            {activeReceiverId !== null && showEmojiPicker && (
              <div className="mb-2 flex flex-wrap gap-1 rounded-lg border bg-card p-2">
                {EMOJI_LIST.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setMessageInput((previous) => previous + emoji)}
                    className="rounded px-2 py-1 text-lg hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  uploadFileMessage(file)
                }
                event.currentTarget.value = ""
              }}
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowEmojiPicker((previous) => !previous)}
                disabled={isComposerDisabled}
              >
                <Smile className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isComposerDisabled}
              >
                {isUploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder={activeReceiverId === null ? "Select a conversation to type a message..." : "Type your message..."}
                disabled={isComposerDisabled}
              />
              <Button onClick={() => sendMessage()} size="icon" aria-label="Send message" disabled={isComposerDisabled}>
                {isSendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
