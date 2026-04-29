"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar/page"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Loader2, SendHorizontal, Pencil, Trash2, Reply, X, Users, Check, ArrowLeft, UserPlus, Search, Smile, Settings, AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { cn, formatApiError } from "@/lib/utils"
import { getAccessToken } from "@/lib/auth"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type GroupInfo = {
  id: number
  group_name: string
  group_description: string
  group_image: string
  owned_by: number
  member_count: number
}

type GroupMessage = {
  message_id: number
  group_chat_id: number
  sender_id: number
  parent_id: number | null
  content: string
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

type TypingUser = {
  user_id: number
  first_name: string
  last_name: string
  avatar_url?: string | null
}

type FriendItem = {
  user_id: number
  first_name: string
  last_name: string
  user_tag: string | null
  avatar_url: string | null
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export default function GroupChatRoom() {
  const params = useParams()
  const router = useRouter()
  const groupId = Number(params.id)

  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [messageInput, setMessageInput] = useState("")
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [addableFriends, setAddableFriends] = useState<FriendItem[]>([])
  const [selectedFriends, setSelectedFriends] = useState<number[]>([])
  const [friendSearch, setFriendSearch] = useState("")
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [addingMembers, setAddingMembers] = useState(false)

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editGroupName, setEditGroupName] = useState("")
  const [editGroupDescription, setEditGroupDescription] = useState("")
  const [editGroupImage, setEditGroupImage] = useState<File | null>(null)
  const [editGroupImagePreview, setEditGroupImagePreview] = useState<string | null>(null)
  const [savingGroup, setSavingGroup] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const localTypingStopRef = useRef<NodeJS.Timeout | null>(null)
  const remoteTypingStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)
  const emojiPickerContainerRef = useRef<HTMLDivElement | null>(null)
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      router.push("/auth/login")
      return
    }

    // Decode user id from token
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      setCurrentUserId(Number(payload.sub))
    } catch {
      router.push("/auth/login")
      return
    }

    fetchMessages(token)
    connectWebSocket(token)

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [groupId])

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
        const emoji = (event as { detail?: { unicode?: string } }).detail?.unicode
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
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [showEmojiPicker])

  const fetchMessages = async (token: string) => {
    setLoadingMessages(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/group_chat/${groupId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        if (res.status === 403) {
          toast.error("You are not a member of this group chat")
          router.push("/direct-messages")
          return
        }
        throw new Error("Failed to fetch messages")
      }
      const data = await res.json()
      setGroupInfo(data.group)
      setMessages(data.messages)
    } catch {
      toast.error("Failed to load messages")
    } finally {
      setLoadingMessages(false)
    }
  }

  const connectWebSocket = (token: string) => {
    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/group_chat/${groupId}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      setIsReconnecting(false)
    }

    ws.onclose = () => {
      setIsConnected(false)
      setIsReconnecting(true)
      reconnectTimeoutRef.current = setTimeout(() => connectWebSocket(token), 3000)
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.type === "new_group_message") {
        setMessages((prev) => [...prev, data.message])
      }

      if (data.type === "group_message_edited") {
        setMessages((prev) =>
          prev.map((m) => m.message_id === data.message.message_id ? data.message : m)
        )
      }

      if (data.type === "group_message_deleted") {
        setMessages((prev) => prev.filter((m) => m.message_id !== data.message_id))
      }

      if (data.type === "group_typing") {
        if (data.sender_id === currentUserId) return
        const sender: TypingUser = data.sender

        if (data.is_typing) {
          setTypingUsers((prev) => {
            if (prev.find((u) => u.user_id === sender.user_id)) return prev
            return [...prev, sender]
          })
          if (remoteTypingStopRef.current) clearTimeout(remoteTypingStopRef.current)
          remoteTypingStopRef.current = setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u.user_id !== sender.user_id))
          }, 3000)
        } else {
          setTypingUsers((prev) => prev.filter((u) => u.user_id !== sender.user_id))
        }
      }
    }
  }

  const sendTyping = (typing: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", is_typing: typing }))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value)

    if (!isTypingRef.current) {
      isTypingRef.current = true
      sendTyping(true)
    }

    if (localTypingStopRef.current) clearTimeout(localTypingStopRef.current)
    localTypingStopRef.current = setTimeout(() => {
      isTypingRef.current = false
      sendTyping(false)
    }, 2000)
  }

  const handleSend = () => {
    const content = messageInput.trim()
    if (!content || !isConnected) return

    wsRef.current?.send(JSON.stringify({
      type: "send_message",
      content,
      parent_id: replyingTo?.message_id ?? null,
    }))

    setMessageInput("")
    setReplyingTo(null)
    if (isTypingRef.current) {
      isTypingRef.current = false
      sendTyping(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
    if (e.key === "Escape") {
      setReplyingTo(null)
      if (editingMessageId) cancelEdit()
    }
  }

  const startEdit = (message: GroupMessage) => {
    setEditingMessageId(message.message_id)
    setEditingContent(message.content)
  }

  const cancelEdit = () => {
    setEditingMessageId(null)
    setEditingContent("")
  }

  const submitEdit = () => {
    const content = editingContent.trim()
    if (!content || !isConnected || editingMessageId === null) return
    wsRef.current?.send(JSON.stringify({
      type: "edit_message",
      message_id: editingMessageId,
      content,
    }))
    cancelEdit()
  }

  const deleteMessage = (messageId: number) => {
    if (!isConnected) return
    wsRef.current?.send(JSON.stringify({ type: "delete_message", message_id: messageId }))
  }

  const openEditGroup = () => {
    if (!groupInfo) return
    setEditGroupName(groupInfo.group_name)
    setEditGroupDescription(groupInfo.group_description)
    setEditGroupImage(null)
    setEditGroupImagePreview(null)
    setShowEditGroup(true)
  }

  const handleSaveGroup = async () => {
    setSavingGroup(true)
    try {
      const token = getAccessToken()
      const form = new FormData()
      if (editGroupName) form.append("group_name", editGroupName)
      if (editGroupDescription) form.append("group_description", editGroupDescription)
      if (editGroupImage) form.append("image", editGroupImage)

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/group_chat/${groupId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(formatApiError(data.detail, "Failed to update group"))
      setGroupInfo(data)
      setShowEditGroup(false)
      toast.success("Group updated successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update group")
    } finally {
      setSavingGroup(false)
    }
  }

  const handleDeleteGroup = async () => {
    setDeletingGroup(true)
    try {
      const token = getAccessToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/group_chat/${groupId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(formatApiError(data.detail, "Failed to delete group"))
      toast.success("Group deleted")
      router.push("/direct-messages")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete group")
      setDeletingGroup(false)
    }
  }

  const openAddMembers = async () => {
    setShowAddMembers(true)
    setSelectedFriends([])
    setFriendSearch("")
    setLoadingFriends(true)
    try {
      const token = getAccessToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/group_chat/${groupId}/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) setAddableFriends(data)
      else toast.error(formatApiError(data.detail, "Failed to load friends"))
    } catch {
      toast.error("Failed to load friends")
    } finally {
      setLoadingFriends(false)
    }
  }

  const handleAddMembers = async () => {
    if (selectedFriends.length === 0) return
    setAddingMembers(true)
    try {
      const token = getAccessToken()
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/group_chat/${groupId}/add_members`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(selectedFriends),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(formatApiError(data.detail, "Failed to add members"))
      toast.success(`${data.count} member(s) added`)
      setShowAddMembers(false)
      setGroupInfo((prev) => prev ? { ...prev, member_count: prev.member_count + data.count } : prev)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add members")
    } finally {
      setAddingMembers(false)
    }
  }

  const getReplyTarget = (parentId: number | null) => {
    if (!parentId) return null
    return messages.find((m) => m.message_id === parentId) ?? null
  }

  if (loadingMessages) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0">
          <Button variant="ghost" size="icon" onClick={() => router.push("/direct-messages")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {groupInfo && (
            <>
              <Avatar className="h-9 w-9">
                <AvatarImage src={groupInfo.group_image} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {groupInfo.group_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{groupInfo.group_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {groupInfo.member_count} members
                </p>
              </div>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={openAddMembers}>
              <UserPlus className="h-4 w-4" />
              Add Members
            </Button>
            {groupInfo?.owned_by === currentUserId && (
              <Button variant="ghost" size="icon" onClick={openEditGroup} title="Group settings">
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Add Members Dialog */}
        <Dialog open={showAddMembers} onOpenChange={setShowAddMembers}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add Members
              </DialogTitle>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search friends..."
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {selectedFriends.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {selectedFriends.map((id) => {
                  const f = addableFriends.find((x) => x.user_id === id)
                  if (!f) return null
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs"
                    >
                      {f.first_name}
                      <button onClick={() => setSelectedFriends((p) => p.filter((x) => x !== id))}>
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto space-y-1">
              {loadingFriends ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : addableFriends.filter((f) =>
                  `${f.first_name} ${f.last_name}`.toLowerCase().includes(friendSearch.toLowerCase())
                ).length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {addableFriends.length === 0 ? "No friends to add" : "No friends match your search"}
                </p>
              ) : (
                addableFriends
                  .filter((f) =>
                    `${f.first_name} ${f.last_name}`.toLowerCase().includes(friendSearch.toLowerCase())
                  )
                  .map((f) => {
                    const selected = selectedFriends.includes(f.user_id)
                    return (
                      <div
                        key={f.user_id}
                        onClick={() =>
                          setSelectedFriends((prev) =>
                            selected ? prev.filter((id) => id !== f.user_id) : [...prev, f.user_id]
                          )
                        }
                        className={cn(
                          "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                          selected ? "bg-primary/10 border border-primary/30" : "hover:bg-accent border border-transparent"
                        )}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={f.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {f.first_name.charAt(0)}{f.last_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{f.first_name} {f.last_name}</p>
                          {f.user_tag && <p className="text-xs text-muted-foreground">#{f.user_tag}</p>}
                        </div>
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                          selected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        )}>
                          {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </div>
                    )
                  })
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddMembers(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={selectedFriends.length === 0 || addingMembers}
                onClick={handleAddMembers}
              >
                {addingMembers ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                ) : (
                  <><UserPlus className="mr-2 h-4 w-4" />Add {selectedFriends.length > 0 ? `(${selectedFriends.length})` : ""}</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Group Dialog */}
        <Dialog open={showEditGroup} onOpenChange={setShowEditGroup}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Edit Group
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Group Name</label>
                <Input
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="Group name"
                  maxLength={30}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={editGroupDescription}
                  onChange={(e) => setEditGroupDescription(e.target.value)}
                  placeholder="Group description"
                  maxLength={500}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Group Image</label>
                {editGroupImagePreview && (
                  <img src={editGroupImagePreview} alt="preview" className="h-16 w-16 rounded-lg object-cover border" />
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setEditGroupImage(file)
                    const reader = new FileReader()
                    reader.onload = () => setEditGroupImagePreview(reader.result as string)
                    reader.readAsDataURL(file)
                  }}
                  className="cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                className="mr-auto"
                onClick={() => { setShowEditGroup(false); setShowDeleteConfirm(true) }}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Delete Group
              </Button>
              <Button variant="outline" onClick={() => setShowEditGroup(false)}>Cancel</Button>
              <Button onClick={handleSaveGroup} disabled={savingGroup || !editGroupName.trim()}>
                {savingGroup ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Delete Group
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{groupInfo?.group_name}</span>? This will permanently delete all messages and cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDeleteGroup} disabled={deletingGroup}>
                {deletingGroup ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground gap-2">
              <Users className="h-10 w-10 opacity-30" />
              <p className="text-sm">No messages yet. Say hello!</p>
            </div>
          ) : (
            <div className="space-y-1 pb-2">
              {messages.map((message, index) => {
                const isOwn = message.sender_id === currentUserId
                const prevMessage = index > 0 ? messages[index - 1] : null
                const isSameSender = prevMessage?.sender_id === message.sender_id
                const replyTarget = getReplyTarget(message.parent_id ?? null)

                return (
                  <div
                    key={message.message_id}
                    className={cn("group flex gap-2", isOwn ? "flex-row-reverse" : "flex-row", isSameSender ? "mt-0.5" : "mt-3")}
                  >
                    {/* Avatar — show only for first in run */}
                    <div className="w-8 shrink-0 flex items-end">
                      {!isSameSender && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.sender.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {message.sender.first_name.charAt(0)}{message.sender.last_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>

                    <div className={cn("flex flex-col max-w-[65%]", isOwn ? "items-end" : "items-start")}>
                      {!isSameSender && (
                        <span className={cn("text-xs text-muted-foreground mb-0.5 px-1", isOwn ? "text-right" : "text-left")}>
                          {message.sender.first_name} {message.sender.last_name}
                        </span>
                      )}

                      {replyTarget && (
                        <div className="text-xs px-2 py-1 mb-0.5 rounded border-l-2 border-primary/50 bg-muted/50 max-w-full truncate">
                          <span className="font-medium text-primary">{replyTarget.sender.first_name}:</span>{" "}
                          {replyTarget.content}
                        </div>
                      )}

                      {/* Bubble + floating action bar */}
                      <div className="relative">
                        {/* Floating action bar — appears on hover */}
                        {editingMessageId !== message.message_id && (
                          <div className={cn(
                            "absolute -top-7 flex items-center gap-0.5 rounded-lg border bg-background shadow-md px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                            isOwn ? "right-0" : "left-0"
                          )}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              title="Reply"
                              onClick={() => setReplyingTo(message)}
                            >
                              <Reply className="h-3 w-3" />
                            </Button>
                            {isOwn && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                  title="Edit"
                                  onClick={() => startEdit(message)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  title="Delete"
                                  onClick={() => deleteMessage(message.message_id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Message bubble / edit input */}
                        {editingMessageId === message.message_id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") submitEdit()
                                if (e.key === "Escape") cancelEdit()
                              }}
                              className="h-8 text-sm w-48"
                              autoFocus
                            />
                            <Button size="icon" className="h-7 w-7" onClick={submitEdit}>
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className={cn(
                            "rounded-2xl px-3 py-2 text-sm",
                            isOwn
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted rounded-tl-sm"
                          )}>
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <div className={cn(
                              "flex items-center gap-1 mt-0.5",
                              isOwn ? "justify-end" : "justify-start"
                            )}>
                              <span className={cn(
                                "text-[10px]",
                                isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                              )}>
                                {formatTime(message.sent_at)}
                              </span>
                              {message.edited_at && (
                                <span className={cn(
                                  "text-[10px]",
                                  isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                                )}>
                                  (edited)
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-2 pb-1 text-xs text-muted-foreground">
              <div className="flex -space-x-1">
                {typingUsers.slice(0, 3).map((u) => (
                  <Avatar key={u.user_id} className="h-5 w-5 border border-background">
                    <AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[8px]">
                      {u.first_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span>
                {typingUsers.map((u) => u.first_name).join(", ")}
                {typingUsers.length === 1 ? " is" : " are"} typing…
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Reply banner */}
        {replyingTo && (
          <div className="flex items-center gap-2 px-4 py-2 border-t bg-muted/40 text-sm shrink-0">
            <Reply className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-primary">
                {replyingTo.sender.first_name}:{" "}
              </span>
              <span className="text-muted-foreground truncate">{replyingTo.content}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setReplyingTo(null)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Reconnecting banner */}
        {isReconnecting && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-medium shrink-0">
            <Loader2 className="h-3 w-3 animate-spin" />
            Reconnecting…
          </div>
        )}

        {/* Input area */}
        <div className="px-4 py-3 border-t bg-background shrink-0">
          <div className="relative flex items-center gap-2">
            {showEmojiPicker && (
              <div className="absolute bottom-full right-10 mb-2 z-50 rounded-lg border bg-background shadow-xl overflow-hidden">
                <div ref={emojiPickerContainerRef} />
              </div>
            )}
            <Input
              placeholder={isConnected ? `Message ${groupInfo?.group_name ?? "group"}…` : "Connecting…"}
              value={messageInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={!isConnected}
              className="flex-1 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              ref={emojiButtonRef}
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              disabled={!isConnected}
            >
              <Smile className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!messageInput.trim() || !isConnected}
            >
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
