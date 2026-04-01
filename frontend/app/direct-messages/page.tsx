"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useOnlineStatus } from "@/context/OnlineStatusContext"
import Sidebar from "@/components/Sidebar/page"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Loader2, MessageCircle, SendHorizontal, Smile, Paperclip,
  Pencil, Trash2, Search, Reply, X, Download, FileIcon,
  UserRound, MapPin, Calendar, CheckCircle2, ChevronRight, Users,
  UserPlus, UserMinus,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ReceiverInfo = {
  user_id: number
  first_name: string
  last_name: string
  country?: string | null
  avatar_url?: string | null
  joined_at?: string | null
  last_login_at?: string | null
  user_tag?: string | null
  is_verified?: boolean
}

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

type FriendItem = {
  friendship_id: number
  user_id: number
  first_name: string
  last_name: string
  user_tag: string | null
  avatar_url: string | null
  added_at: string
}

type EmojiClickEvent = Event & {
  detail?: {
    unicode?: string
  }
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const isImageAttachment = (fileName: string, fileUrl: string) => {
  const imagePattern = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i
  const cleanName = fileName.split("?")[0]
  const cleanUrl = fileUrl.split("?")[0]
  return imagePattern.test(cleanName) || imagePattern.test(cleanUrl)
}

export default function ChannelsPage() {
  const router = useRouter()
  const { isUserOnline } = useOnlineStatus()
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
  const [showProfilePanel, setShowProfilePanel] = useState(false)
  const [receiverInfo, setReceiverInfo] = useState<ReceiverInfo | null>(null)
  const [loadingReceiverInfo, setLoadingReceiverInfo] = useState(false)
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [friendActionLoading, setFriendActionLoading] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const initialMessageHandledRef = useRef<string | null>(null)
  const selectedReceiverRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const emojiPickerContainerRef = useRef<HTMLDivElement | null>(null)
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    selectedReceiverRef.current = receiverId ? Number(receiverId) : null
  }, [receiverId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (!showEmojiPicker || !emojiPickerContainerRef.current) return

    let pickerElement: HTMLElement | null = null
    let onEmojiClick: ((event: Event) => void) | null = null

    const initializePicker = async () => {
      await import("emoji-picker-element")
      if (!emojiPickerContainerRef.current) return

      pickerElement = document.createElement("emoji-picker")
      pickerElement.setAttribute("style", "height: 320px;")

      onEmojiClick = (event: Event) => {
        const emoji = (event as EmojiClickEvent).detail?.unicode
        if (!emoji) return
        setMessageInput((prev) => `${prev}${emoji}`)
        setShowEmojiPicker(false)
      }

      pickerElement.addEventListener("emoji-click", onEmojiClick as EventListener)
      emojiPickerContainerRef.current.innerHTML = ""
      emojiPickerContainerRef.current.appendChild(pickerElement)
    }

    initializePicker()

    return () => {
      if (pickerElement && onEmojiClick) {
        pickerElement.removeEventListener("emoji-click", onEmojiClick as EventListener)
      }
      if (emojiPickerContainerRef.current) {
        emojiPickerContainerRef.current.innerHTML = ""
      }
    }
  }, [showEmojiPicker])

  useEffect(() => {
    if (!showEmojiPicker) return

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (emojiPickerContainerRef.current?.contains(target)) return
      if (emojiButtonRef.current?.contains(target)) return
      setShowEmojiPicker(false)
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [showEmojiPicker])

  useEffect(() => {
    if (!receiverId) { setReceiverInfo(null); setShowProfilePanel(false); return }
    const token = localStorage.getItem("access_token")
    if (!token) return
    setLoadingReceiverInfo(true)
    fetch(`http://localhost:8000/get_user_info?user_id=${receiverId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setReceiverInfo(data))
      .catch(() => setReceiverInfo(null))
      .finally(() => setLoadingReceiverInfo(false))
  }, [receiverId])

  const fetchConversations = async () => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    setLoadingConversations(true)
    try {
      const response = await fetch("http://localhost:8000/direct-messages", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error("Failed to fetch conversations")
      const data = await response.json()
      setConversations(Array.isArray(data.conversations) ? data.conversations : [])
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setLoadingConversations(false)
    }
  }

  const fetchFriends = async () => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    setLoadingFriends(true)
    try {
      const response = await fetch("http://localhost:8000/friends", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setFriends(data)
      }
    } catch (error) {
      console.error("Error fetching friends:", error)
    } finally {
      setLoadingFriends(false)
    }
  }

  const handleRemoveFriend = async (friendUserId: number) => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    setFriendActionLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/friends/${friendUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        toast.success("Friend removed")
        setFriends((prev) => prev.filter((f) => f.user_id !== friendUserId))
      } else {
        const data = await response.json().catch(() => null)
        toast.error("Failed", { description: data?.detail || "Something went wrong" })
      }
    } catch {
      toast.error("Error", { description: "Failed to remove friend" })
    } finally {
      setFriendActionLoading(false)
    }
  }

  const handleSendFriendRequest = async (userTag: string) => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    setFriendActionLoading(true)
    try {
      const response = await fetch("http://localhost:8000/friends/request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_tag: userTag }),
      })

      if (response.ok) {
        toast.success("Friend request sent!")
      } else {
        const data = await response.json().catch(() => null)
        toast.error("Failed", { description: data?.detail || "Could not send request" })
      }
    } catch {
      toast.error("Error", { description: "Failed to send friend request" })
    } finally {
      setFriendActionLoading(false)
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
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) { router.push("/auth/login"); return }
        const data = await response.json()
        setCurrentUserId(data.user_id)
      } catch {
        router.push("/auth/login")
      }
    }

    fetchCurrentUser()
    fetchConversations()
    fetchFriends()
  }, [router])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token || !receiverId) { setMessages([]); return }

    const fetchConversation = async () => {
      setLoadingMessages(true)
      try {
        const response = await fetch(`http://localhost:8000/direct-messages/${receiverId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) {
          if (response.status === 401) { router.push("/auth/login"); return }
          throw new Error("Failed to fetch direct messages")
        }
        const data = await response.json()
        setMessages(Array.isArray(data.messages) ? data.messages : [])
      } catch (error) {
        console.error("Error fetching direct messages:", error)
        toast.error("Error", { description: "Failed to load direct messages" })
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

      ws.onopen = () => setIsConnected(true)

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
                  return exists ? previous : [...previous, message]
                })
              }
            }
            fetchConversations()
            return
          }

          if (data.type === "direct_message_edited" && data.message) {
            const edited = data.message as DmMessage
            setMessages((previous) => previous.map((item) =>
              item.message_id === edited.message_id ? edited : item
            ))
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

      ws.onerror = () => setIsConnected(false)
      wsRef.current = ws
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
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
        if (!token) { router.push("/auth/login"); return }

        const response = await fetch("http://localhost:8000/direct-messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            sender_id: currentUserId,
            receiver_id: Number(receiverId),
            content,
            parent_id: replyingTo?.message_id ?? null,
          }),
        })

        if (!response.ok) throw new Error("Failed to send message")
        const created = await response.json()
        setMessages((previous) => {
          const exists = previous.some((item) => item.message_id === created.message_id)
          return exists ? previous : [...previous, created]
        })
        fetchConversations()
      }

      if (!customMessage) setMessageInput("")
      setReplyingTo(null)
    } catch (error) {
      console.error("Error sending direct message:", error)
      toast.error("Error", { description: "Failed to send message" })
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
        wsRef.current.send(JSON.stringify({ type: "edit_message", message_id: editingMessageId, content: trimmed }))
      } else {
        const token = localStorage.getItem("access_token")
        if (!token) { router.push("/auth/login"); return }

        const response = await fetch(`http://localhost:8000/direct-messages/${editingMessageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content: trimmed }),
        })

        if (!response.ok) throw new Error("Failed to edit message")
        const updated = await response.json()
        setMessages((previous) => previous.map((item) =>
          item.message_id === updated.message_id ? updated : item
        ))
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
        wsRef.current.send(JSON.stringify({ type: "delete_message", message_id: messageId }))
      } else {
        const token = localStorage.getItem("access_token")
        if (!token) { router.push("/auth/login"); return }

        const response = await fetch(`http://localhost:8000/direct-messages/${messageId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) throw new Error("Failed to delete message")
        setMessages((previous) => previous.filter((item) => item.message_id !== messageId))
        if (replyingTo?.message_id === messageId) setReplyingTo(null)
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
        toast.error("Realtime required", { description: "File upload needs an active realtime connection" })
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
      toast.success("File sent", { description: `${file.name} is being delivered in realtime` })
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

  // Friends who don't have an existing conversation yet
  const conversationUserIds = new Set(conversations.map((c) => c.user.user_id))
  const friendsWithoutConversation = friends.filter((f) => {
    if (conversationUserIds.has(f.user_id)) return false
    if (!searchQuery) return true
    const fullName = `${f.first_name} ${f.last_name}`.toLowerCase()
    return fullName.includes(searchQuery.toLowerCase())
  })

  const activeReceiverId = receiverId ? Number(receiverId) : null
  const isReceiverFriend = activeReceiverId !== null && friends.some((f) => f.user_id === activeReceiverId)
  const activeConversation = activeReceiverId !== null
    ? conversations.find((item) => item.user.user_id === activeReceiverId)
    : null
  const isComposerDisabled = activeReceiverId === null || isSendingMessage || isUploadingFile
  const activeReceiverName = activeConversation
    ? `${activeConversation.user.first_name} ${activeConversation.user.last_name}`
    : (searchParams.get("dm_name") || "Member")

  const getMessagePreview = (message: DmReplyMessage | DmMessage | null) => {
    if (!message) return ""
    if (message.is_file) return `[File] ${message.file_attachment?.file_name || "Attachment"}`
    return message.content || ""
  }

  const resolveReplyTarget = (message: DmMessage) => {
    if (message.reply_to) return message.reply_to
    if (!message.parent_id) return null
    return messages.find((item) => item.message_id === message.parent_id) || null
  }

  const isGroupedWithPrev = (index: number) => {
    if (index === 0) return false
    const prev = messages[index - 1]
    const curr = messages[index]
    if (prev.sender_id !== curr.sender_id) return false
    const diff = new Date(curr.sent_at).getTime() - new Date(prev.sent_at).getTime()
    return diff < 5 * 60 * 1000
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      {/* DM List Sidebar */}
      <div className="flex h-full w-[300px] flex-shrink-0 flex-col border-r bg-muted/40">
        <div className="px-4 pb-3 pt-5">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-sm font-semibold tracking-wide">Direct Messages</h2>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="h-8 rounded-lg bg-background pl-9 text-sm"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2 pb-2">
          {/* Conversations */}
          <div className="space-y-0.5">
            {loadingConversations ? (
              <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading...
              </div>
            ) : filteredConversations.length === 0 && friendsWithoutConversation.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground">No conversations yet.</p>
            ) : (
              filteredConversations.map((item) => {
                const isActive = activeReceiverId === item.user.user_id
                const initials = `${item.user.first_name[0] || ""}${item.user.last_name[0] || ""}`.toUpperCase()
                const preview = item.last_message.is_file
                  ? `[File] ${item.last_message.file_attachment?.file_name || "Attachment"}`
                  : (item.last_message.content || "")
                const online = isUserOnline(item.user.user_id)

                return (
                  <button
                    key={item.user.user_id}
                    onClick={() => router.push(
                      `/direct-messages?dm_user_id=${item.user.user_id}&dm_name=${encodeURIComponent(`${item.user.first_name} ${item.user.last_name}`)}`
                    )}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-150",
                      isActive ? "bg-muted" : "hover:bg-muted/70"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-9 w-9">
                        {item.user.avatar_url && <AvatarImage src={item.user.avatar_url} alt={`${item.user.first_name} ${item.user.last_name}`} />}
                        <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                        online ? "bg-emerald-500" : "bg-muted-foreground/40"
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {item.user.first_name} {item.user.last_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{preview}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Friends Section — always visible */}
          <Separator className="my-2" />
          <div className="flex items-center gap-2 px-3 py-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground tracking-wide">Friends</span>
            {friends.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">{friends.length}</span>
            )}
          </div>
          <div className="space-y-0.5">
            {loadingFriends ? (
              <div className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading...
              </div>
            ) : friendsWithoutConversation.length === 0 && !searchQuery ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                {friends.length === 0 ? "No friends yet." : "All friends have open conversations."}
              </p>
            ) : (
              friendsWithoutConversation.map((friend) => {
                const isActive = activeReceiverId === friend.user_id
                const initials = `${friend.first_name[0] || ""}${friend.last_name[0] || ""}`.toUpperCase()
                const online = isUserOnline(friend.user_id)

                return (
                  <button
                    key={friend.user_id}
                    onClick={() => router.push(
                      `/direct-messages?dm_user_id=${friend.user_id}&dm_name=${encodeURIComponent(`${friend.first_name} ${friend.last_name}`)}`
                    )}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-all duration-150",
                      isActive ? "bg-muted" : "hover:bg-muted/70"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-9 w-9">
                        {friend.avatar_url && <AvatarImage src={friend.avatar_url} alt={`${friend.first_name} ${friend.last_name}`} />}
                        <AvatarFallback className="text-xs font-medium">{initials}</AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background",
                        online ? "bg-emerald-500" : "bg-muted-foreground/40"
                      )} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {friend.first_name} {friend.last_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {online ? "Active now" : (friend.user_tag ? `#${friend.user_tag}` : "Offline")}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area — always mounted, never conditionally unmounted */}
      <div className="flex flex-1 flex-col overflow-hidden bg-muted/20">

        {/* Header — always rendered, hidden via opacity when no receiver */}
        <div className={cn(
          "flex flex-shrink-0 items-center justify-between px-5 py-3 transition-opacity duration-150",
          activeReceiverId === null && "pointer-events-none opacity-0"
        )}>
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-medium">
                {activeReceiverName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{activeReceiverName}</p>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  activeReceiverId && isUserOnline(activeReceiverId) ? "bg-emerald-500" : "bg-muted-foreground"
                )} />
                <span className="text-xs text-muted-foreground">
                  {activeReceiverId && isUserOnline(activeReceiverId) ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-lg text-muted-foreground", showProfilePanel && "bg-muted text-foreground")}
            onClick={() => setShowProfilePanel((p) => !p)}
            aria-label="Toggle profile"
          >
            <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", showProfilePanel && "rotate-180")} />
          </Button>
        </div>
        <Separator className={cn(activeReceiverId === null && "opacity-0")} />

        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 py-4">
            {activeReceiverId === null ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <MessageCircle className="h-12 w-12 opacity-30" />
                <p className="text-sm font-medium">Select a conversation to start chatting</p>
              </div>
            ) : loadingMessages ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <MessageCircle className="h-8 w-8 opacity-20" />
                <p className="text-sm">No messages yet. Say hello.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {messages.map((msg, index) => {
                  const isMine = currentUserId !== null && msg.sender_id === currentUserId
                  const isEditing = editingMessageId === msg.message_id
                  const grouped = isGroupedWithPrev(index)
                  const replyTarget = resolveReplyTarget(msg)

                  return (
                    <div
                      key={msg.message_id}
                      className={cn(
                        "group flex items-end gap-2 px-2",
                        isMine ? "flex-row-reverse" : "flex-row",
                        grouped ? "mt-0.5" : "mt-3"
                      )}
                    >
                      {/* Avatar column */}
                      <div className="w-8 flex-shrink-0">
                        {!isMine && !grouped && (
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-[10px] font-medium">
                              {`${msg.sender.first_name[0] || ""}${msg.sender.last_name[0] || ""}`.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>

                      {/* Bubble + actions */}
                      <div className={cn("flex max-w-[65%] flex-col gap-0.5", isMine && "items-end")}>
                        {!grouped && !isMine && (
                          <p className="mb-0.5 ml-1 text-[11px] font-semibold text-muted-foreground">
                            {msg.sender.first_name} {msg.sender.last_name}
                          </p>
                        )}

                        {isEditing ? (
                          <div className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2">
                            <Input
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editMessage() } }}
                              className="h-7 min-w-[200px] border-none bg-background text-sm shadow-none"
                              autoFocus
                            />
                            <Button size="sm" className="h-7 px-3 text-xs" onClick={editMessage} disabled={isSavingEdit}>
                              {isSavingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => { setEditingMessageId(null); setEditingContent("") }}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className={cn(
                            "relative rounded-2xl px-3 py-2 text-sm transition-all duration-150",
                            isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                          )}>
                            {/* Reply preview */}
                            {replyTarget && (
                              <div className={cn(
                                "mb-1.5 rounded-lg px-2 py-1 text-xs",
                                isMine
                                  ? "border border-primary-foreground/20 bg-primary-foreground/10"
                                  : "border bg-background/60"
                              )}>
                                <p className="font-medium opacity-80">
                                  {replyTarget.sender?.first_name || "Message"}
                                </p>
                                <p className="truncate opacity-70">{getMessagePreview(replyTarget)}</p>
                              </div>
                            )}

                            {/* Content */}
                            {msg.is_file && msg.file_attachment ? (
                              isImageAttachment(msg.file_attachment.file_name, msg.file_attachment.file_url) ? (
                                <a
                                  href={msg.file_attachment.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block overflow-hidden rounded-xl"
                                >
                                  <img
                                    src={msg.file_attachment.file_url}
                                    alt={msg.file_attachment.file_name}
                                    className="max-h-[300px] w-auto max-w-[340px] rounded-xl object-contain transition-opacity duration-150 hover:opacity-90"
                                  />
                                </a>
                              ) : (
                                <div className="flex items-center gap-3 rounded-xl bg-background/10 px-3 py-2">
                                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-background/20">
                                    <FileIcon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{msg.file_attachment.file_name}</p>
                                    <p className="text-xs opacity-70">{formatFileSize(msg.file_attachment.file_size)}</p>
                                  </div>
                                  <a
                                    href={msg.file_attachment.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-background/20"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              )
                            ) : (
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                            )}

                            {/* Timestamp */}
                            <p className={cn(
                              "mt-1 text-[10px] leading-none",
                              isMine ? "text-right text-primary-foreground/60" : "text-right text-muted-foreground"
                            )}>
                              {formatTime(msg.sent_at)}
                              {msg.edited_at && " · edited"}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Floating message actions */}
                      {!isEditing && (
                        <div className={cn(
                          "flex flex-shrink-0 items-center gap-0.5 self-center rounded-lg border bg-background p-0.5 shadow-sm",
                          "opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                        )}>
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Reply"
                          >
                            <Reply className="h-3.5 w-3.5" />
                          </button>
                          {isMine && !msg.is_file && (
                            <button
                              onClick={() => { setEditingMessageId(msg.message_id); setEditingContent(msg.content) }}
                              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              aria-label="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {isMine && (
                            <button
                              onClick={() => deleteMessage(msg.message_id)}
                              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area — always rendered */}
        <div className="relative flex-shrink-0 px-4 pb-4 pt-2">
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border bg-muted/50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Replying to {replyingTo.sender.first_name} {replyingTo.sender.last_name}
                </p>
                <p className="truncate text-xs text-foreground/70">{getMessagePreview(replyingTo)}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {isUploadingFile && (
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading file...
            </div>
          )}

          {showEmojiPicker && (
            <div className="absolute bottom-full mb-2 z-50 rounded-lg border bg-background shadow-xl overflow-hidden">
              <div ref={emojiPickerContainerRef} />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadFileMessage(file)
              e.currentTarget.value = ""
            }}
          />

          <div className={cn(
            "flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 transition-all duration-200",
            "focus-within:ring-2 focus-within:ring-primary/50"
          )}>
            <button
              type="button"
              ref={emojiButtonRef}
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              disabled={isComposerDisabled}
              className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
            >
              <Smile className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isComposerDisabled}
              className="flex-shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-40"
            >
              {isUploadingFile
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Paperclip className="h-4 w-4" />
              }
            </button>
            <input
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); sendMessage() }
              }}
              placeholder={activeReceiverId === null ? "Select a conversation..." : "Message..."}
              disabled={isComposerDisabled}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-40"
            />
            <Button
              onClick={() => sendMessage()}
              size="icon"
              aria-label="Send message"
              disabled={isComposerDisabled || !messageInput.trim()}
              className="h-7 w-7 flex-shrink-0 rounded-lg"
            >
              {isSendingMessage
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <SendHorizontal className="h-3.5 w-3.5" />
              }
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Panel */}
      <div className={cn(
        "flex h-full flex-shrink-0 flex-col border-l bg-muted/30 transition-all duration-300 overflow-hidden",
        showProfilePanel && activeReceiverId !== null ? "w-[280px]" : "w-0"
      )}>
        {receiverInfo && (
          <div className="flex h-full flex-col">
            {/* Panel Header */}
            <div className="flex flex-shrink-0 items-center justify-between px-4 py-3 border-b">
              <p className="text-sm font-semibold">Profile</p>
              <button
                onClick={() => setShowProfilePanel(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col items-center px-5 py-6 gap-4">
                {/* Avatar */}
                <div className="relative">
                  {receiverInfo.avatar_url ? (
                    <img
                      src={receiverInfo.avatar_url}
                      alt={receiverInfo.first_name}
                      className="h-20 w-20 rounded-full object-cover ring-2 ring-background shadow"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-lg font-semibold ring-2 ring-background shadow">
                      {receiverInfo.first_name[0]}{receiverInfo.last_name[0]}
                    </div>
                  )}
                  {receiverInfo.is_verified && (
                    <span className="absolute bottom-0 right-0 rounded-full bg-background p-0.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </span>
                  )}
                </div>

                {/* Name + tag */}
                <div className="text-center">
                  <p className="text-base font-semibold">
                    {receiverInfo.first_name} {receiverInfo.last_name}
                  </p>
                  {receiverInfo.user_tag && (
                    <p className="text-xs text-muted-foreground mt-0.5">#{receiverInfo.user_tag}</p>
                  )}
                </div>

                <Separator />

                {/* Info rows */}
                <div className="w-full space-y-3">
                  {receiverInfo.country && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <span className="text-foreground">{receiverInfo.country}</span>
                    </div>
                  )}
                  {receiverInfo.joined_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Joined</p>
                        <p className="text-foreground">
                          {new Date(receiverInfo.joined_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  )}
                  {receiverInfo.last_login_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <UserRound className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Last seen</p>
                        <p className="text-foreground">
                          {new Date(receiverInfo.last_login_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Friend Actions */}
                <div className="w-full space-y-2">
                  {isReceiverFriend ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      disabled={friendActionLoading}
                      onClick={() => handleRemoveFriend(activeReceiverId!)}
                    >
                      {friendActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <UserMinus className="h-4 w-4 mr-2" />
                      )}
                      Unfriend
                    </Button>
                  ) : receiverInfo.user_tag ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={friendActionLoading}
                      onClick={() => handleSendFriendRequest(receiverInfo.user_tag!)}
                    >
                      {friendActionLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Add Friend
                    </Button>
                  ) : null}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}

        {loadingReceiverInfo && (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}
