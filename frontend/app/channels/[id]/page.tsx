"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { useRouter, useParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Hash,
  Volume2,
  Loader2,
  Send,
  Info,
  Users,
  Building2,
  Smile,
  Paperclip,
  MoreVertical,
  Edit,
  Trash2,
  Reply,
  Pin,
  PinOff,
  X,
  Search,
} from "lucide-react"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar/page"
import OrganizationNavBar from "@/components/OrganizationNavBar/page"
import MembersSidebar from "@/components/MembersSidebar/page"
import VoiceChannelPanel from "@/components/VoiceChannelPanel"

interface ChannelDetails {
  channel_id: number
  channel_name: string
  channel_mode: string
  channel_category: string
  description?: string
  org_id: number
  created_at: string
  organization: {
    organization_id: number
    organization_name: string
    organaization_picture: string
    organaization_tag: string
  }
}

type ChatMessage = {
  message_id: number
  message_content: string
  mentions?: MentionedUser[]
  is_file?: boolean
  file_attachment?: {
    id: number
    file_name: string
    file_url: string
    file_size: number
    sent_at: string
  } | null
  parent_id?: number | null
  reply_to?: {
    message_id: number
    message_content: string
    sender: {
      user_id: number
      first_name: string
      last_name: string
      avatar_url: string | null
      user_tag: string
    }
  } | null
  sent_at: string
  edited_at: string
  sender: {
    user_id: number
    first_name: string
    last_name: string
    avatar_url: string | null
    user_tag: string
  }
}

type MentionedUser = {
  user_id: number
  first_name: string
  last_name: string
  user_tag?: string | null
}

type OrgMember = {
  user_id: number
  first_name: string
  last_name: string
  user_tag?: string | null
}

type TypingUser = {
  user_id: number
  first_name: string
  last_name: string
}

type PinnedMessage = {
  id: number
  message_id: number
  message_content: string
  pinned_by: number
  pinned_at: string
  sender: {
    user_id: number
    first_name: string
    last_name: string
    avatar_url: string | null
    user_tag: string
  }
}

type EmojiClickEvent = Event & {
  detail?: {
    unicode?: string
  }
}

type RawFetchedMessage = {
  message_id?: number
  message_content?: string
  mentions?: MentionedUser[]
  is_file?: boolean
  file_attachment?: {
    id?: number
    file_name?: string
    file_url?: string
    file_size?: number
    sent_at?: string
  } | null
  parent_id?: number | null
  reply_to?: ChatMessage["reply_to"]
  sent_at?: string
  edited_at?: string
  sender?: ChatMessage["sender"]
}

const normalizeFetchedMessage = (item: RawFetchedMessage, index: number): ChatMessage | null => {
  if (!item.sender || !item.sent_at) {
    return null
  }

  const fileAttachment = item.file_attachment ?? null
  const isFile = Boolean(item.is_file && fileAttachment)

  const fallbackId = Number(`${Date.now()}${index}`)
  const resolvedMessageId = typeof item.message_id === "number"
    ? item.message_id
    : (isFile && typeof fileAttachment?.id === "number"
      ? 1000000000 + fileAttachment.id
      : fallbackId)

  return {
    message_id: resolvedMessageId,
    message_content: item.message_content || "",
    mentions: Array.isArray(item.mentions) ? item.mentions : [],
    is_file: isFile,
    file_attachment: isFile && fileAttachment
      ? {
          id: fileAttachment.id ?? 0,
          file_name: fileAttachment.file_name ?? "file",
          file_url: fileAttachment.file_url ?? "",
          file_size: Number(fileAttachment.file_size ?? 0),
          sent_at: fileAttachment.sent_at ?? item.sent_at,
        }
      : null,
    parent_id: item.parent_id ?? null,
    reply_to: item.reply_to ?? null,
    sent_at: item.sent_at,
    edited_at: item.edited_at || item.sent_at,
    sender: item.sender,
  }
}

const MENTION_REGEX = /(?<!\w)@([A-Za-z0-9_]{2,32})/g

const getMentionContext = (text: string, caret: number) => {
  const beforeCaret = text.slice(0, caret)
  const match = beforeCaret.match(/(?:^|\s)@([A-Za-z0-9_]*)$/)
  if (!match) return null

  const query = match[1] || ""
  const token = `@${query}`

  return {
    start: beforeCaret.length - token.length,
    end: caret,
    query: query.toLowerCase(),
  }
}

export default function ChannelPage() {
  const router = useRouter()
  const params = useParams()
  const channelId = params?.id as string

  const [channel, setChannel] = useState<ChannelDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [activeMentionIndex, setActiveMentionIndex] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [showMembers, setShowMembers] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerContainerRef = useRef<HTMLDivElement | null>(null)
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messageInputRef = useRef<HTMLInputElement | null>(null)

  // WebSocket states
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const isConnectingRef = useRef(false) // Prevent multiple simultaneous connections
  const typingTimersRef = useRef<Record<number, NodeJS.Timeout>>({})
  const localTypingStopRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  // Edit message states
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editMessageContent, setEditMessageContent] = useState("")
  const [isEditingMessage, setIsEditingMessage] = useState(false)

  // Delete message states
  const [deleteMessageDialogOpen, setDeleteMessageDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null)
  const [isDeletingMessage, setIsDeletingMessage] = useState(false)

  // Search states
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Pinned messages states
  const [showPinnedMessages, setShowPinnedMessages] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([])
  const [loadingPinnedMessages, setLoadingPinnedMessages] = useState(false)
  const [pinningMessageId, setPinningMessageId] = useState<number | null>(null)

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        // Get current user info
        const userResponse = await fetch("http://localhost:8000/profile", {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          console.log('Setting current user ID:', userData.user_id)
          setCurrentUserId(userData.user_id)
        } else {
          console.error('Failed to fetch user data')
        }

        const response = await fetch(`http://localhost:8000/channel/${channelId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setChannel(data)
          // Fetch messages and pinned messages after channel is loaded
          await fetchMessages(data.org_id, token)
          await fetchOrgMembers(data.org_id, token)

          // Fetch pinned messages for pin/unpin detection
          const pinnedResponse = await fetch(
            `http://localhost:8000/organization/${data.org_id}/channel/${data.channel_id}/pinned`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          if (pinnedResponse.ok) {
            const pinnedData = await pinnedResponse.json()
            setPinnedMessages(pinnedData)
          }
        } else {
          const errorData = await response.json()
          toast.error("Error", {
            description: errorData.detail || "Failed to load channel"
          })
          router.push('/welcome')
        }
      } catch (error) {
        console.error('Error fetching channel data:', error)
        toast.error("Error", {
          description: "Failed to load channel details"
        })
      } finally {
        setLoading(false)
      }
    }

    if (channelId) {
      fetchChannelData()
    }
  }, [channelId, router])

  useEffect(() => {
    if (!channel || !channelId) return

    const connectWebSocket = () => {
      
      if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
        return
      }

      const token = localStorage.getItem('access_token')
      if (!token) return

      isConnectingRef.current = true

      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }

      try {
        // Note: Backend has endpoint /mesages/{channel_id} (typo in backend)
        const wsUrl = `ws://localhost:8000/mesages/${channelId}?token=${token}&org_id=${channel.org_id}`
        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          setIsConnected(true)
          isConnectingRef.current = false
          toast.success("Connected", {
            description: "Real-time messaging enabled"
          })
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            // Handle different message types
            if (data.type === 'new_message') {
              if (data.message?.sender) {
                updateTypingUser({
                  user_id: data.message.sender.user_id,
                  first_name: data.message.sender.first_name,
                  last_name: data.message.sender.last_name,
                }, false)
              }
              // Add new message to the list (check for duplicates)
              setMessages(prev => {
                // Avoid duplicates by checking if message already exists
                const exists = prev.some(msg => msg.message_id === data.message.message_id)
                if (exists) {
                  return prev
                }
                return [...prev, data.message]
              })
            } else if (data.type === 'new_file' && data.file) {
              if (data.file?.sender) {
                updateTypingUser({
                  user_id: data.file.sender.user_id,
                  first_name: data.file.sender.first_name,
                  last_name: data.file.sender.last_name,
                }, false)
              }
              setMessages(prev => {
                const syntheticId = data.file.id + 1000000000
                const exists = prev.some(msg => msg.message_id === syntheticId)
                if (exists) return prev

                const fileAsMessage: ChatMessage = {
                  message_id: syntheticId,
                  message_content: "",
                  is_file: true,
                  file_attachment: {
                    id: data.file.id,
                    file_name: data.file.file_name,
                    file_url: data.file.file_url,
                    file_size: data.file.file_size,
                    sent_at: data.file.sent_at,
                  },
                  sent_at: data.file.sent_at,
                  edited_at: data.file.sent_at,
                  sender: data.file.sender,
                }

                return [...prev, fileAsMessage]
              })
            } else if (data.type === 'message_edited') {
              // Update edited message
              setMessages(prev => prev.map(msg =>
                msg.message_id === data.message.message_id ? data.message : msg
              ))
            } else if (data.type === 'message_deleted') {
              // Remove deleted message
              setMessages(prev => prev.filter(msg => msg.message_id !== data.message_id))
            } else if (data.type === 'typing' && data.user) {
              updateTypingUser({
                user_id: data.user.user_id,
                first_name: data.user.first_name,
                last_name: data.user.last_name,
              }, Boolean(data.is_typing))
            } else if (data.message) {
              // Fallback: treat as new message (check for duplicates)
              setMessages(prev => {
                const exists = prev.some(msg => msg.message_id === data.message.message_id)
                if (exists) return prev
                return [...prev, data.message]
              })
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          isConnectingRef.current = false
          toast.error("Connection Error", {
            description: "Failed to establish real-time connection"
          })
        }

        ws.onclose = () => {
          setIsConnected(false)
          isConnectingRef.current = false
          
          // Attempt to reconnect after 3 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket()
          }, 3000)
        }

        wsRef.current = ws
      } catch (error) {
        console.error('Error creating WebSocket connection:', error)
        isConnectingRef.current = false
      }
    }

    connectWebSocket()

    // Cleanup on unmount
    return () => {
      isConnectingRef.current = false
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (localTypingStopRef.current) {
        clearTimeout(localTypingStopRef.current)
        localTypingStopRef.current = null
      }
      Object.values(typingTimersRef.current).forEach((timer) => clearTimeout(timer))
      typingTimersRef.current = {}
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [channel, channelId])

  useEffect(() => {
    setTypingUsers([])
  }, [channelId])

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
        setMessage((prev) => `${prev}${emoji}`)
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

  const fetchMessages = async (orgId: number, token?: string) => {
    setLoadingMessages(true)
    try {
      const authToken = token || localStorage.getItem('access_token')
      if (!authToken) return

      const response = await fetch(
        `http://localhost:8000/organization/${orgId}/channel/${channelId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()

        const rawItems: RawFetchedMessage[] = Array.isArray(data) ? data : []
        const normalizedMessages = rawItems
          .map((item, index) => normalizeFetchedMessage(item, index))
          .filter(Boolean) as ChatMessage[]

        setMessages(normalizedMessages)
      } else {
        const errorData = await response.json()
        toast.error("Error", {
          description: errorData.detail || "Failed to load messages"
        })
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error("Error", {
        description: "Failed to load messages"
      })
    } finally {
      setLoadingMessages(false)
    }
  }

  const fetchOrgMembers = async (orgId: number, token?: string) => {
    try {
      const authToken = token || localStorage.getItem('access_token')
      if (!authToken) return

      const response = await fetch(`http://localhost:8000/organization/${orgId}/members`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      if (!response.ok) {
        return
      }

      const data = await response.json()
      const members: OrgMember[] = Array.isArray(data)
        ? data.map((item) => ({
            user_id: Number(item.user_id),
            first_name: String(item.first_name || ""),
            last_name: String(item.last_name || ""),
            user_tag: item.user_tag ? String(item.user_tag).replace(/^@+/, "") : null,
          }))
        : []

      setOrgMembers(members)
    } catch {
      // Keep chat usable even if member list fetch fails.
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)

    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token || !channel) return

        const response = await fetch(
          `http://localhost:8000/organization/${channel.org_id}/channel/${channel.channel_id}/messages/search?q=${encodeURIComponent(query.trim())}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )

        if (response.ok) {
          const data = await response.json()
          setSearchResults(Array.isArray(data) ? data : [])
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const closeSearch = () => {
    setShowSearch(false)
    setSearchQuery("")
    setSearchResults([])
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
  }

  const scrollToMessage = (messageId: number) => {
    const el = document.getElementById(`msg-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-primary', 'bg-primary/10')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-primary', 'bg-primary/10')
      }, 2000)
    }
  }

  const mentionContext = getMentionContext(message, messageInputRef.current?.selectionStart ?? message.length)
  const mentionCandidates = mentionContext
    ? orgMembers.filter((member) => {
        if (currentUserId !== null && member.user_id === currentUserId) {
          return false
        }

        const query = mentionContext.query
        const tag = (member.user_tag || "").toLowerCase()
        const fullName = `${member.first_name} ${member.last_name}`.toLowerCase()

        if (!query) {
          return Boolean(tag)
        }

        return tag.includes(query) || fullName.includes(query)
      }).slice(0, 8)
    : []
  const showMentionSuggestions = Boolean(mentionContext && mentionCandidates.length > 0)

  const clearTypingTimer = (userId: number) => {
    const existing = typingTimersRef.current[userId]
    if (!existing) return
    clearTimeout(existing)
    delete typingTimersRef.current[userId]
  }

  const updateTypingUser = (user: TypingUser, isTyping: boolean) => {
    if (currentUserId !== null && user.user_id === currentUserId) {
      return
    }

    clearTypingTimer(user.user_id)

    if (!isTyping) {
      setTypingUsers((prev) => prev.filter((item) => item.user_id !== user.user_id))
      return
    }

    setTypingUsers((prev) => {
      const exists = prev.some((item) => item.user_id === user.user_id)
      if (exists) {
        return prev.map((item) => item.user_id === user.user_id ? user : item)
      }
      return [...prev, user]
    })

    typingTimersRef.current[user.user_id] = setTimeout(() => {
      setTypingUsers((prev) => prev.filter((item) => item.user_id !== user.user_id))
      delete typingTimersRef.current[user.user_id]
    }, 3500)
  }

  const sendTypingEvent = (isTyping: boolean) => {
    if (!channel || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return
    }

    wsRef.current.send(JSON.stringify({
      type: 'typing',
      channel_id: channel.channel_id,
      org_id: channel.org_id,
      is_typing: isTyping,
    }))
  }

  const stopLocalTyping = () => {
    if (localTypingStopRef.current) {
      clearTimeout(localTypingStopRef.current)
      localTypingStopRef.current = null
    }

    if (!isTypingRef.current) {
      return
    }

    isTypingRef.current = false
    sendTypingEvent(false)
  }

  const handleMessageInputChange = (value: string) => {
    setMessage(value)
    setActiveMentionIndex(0)

    if (!value.trim()) {
      stopLocalTyping()
      return
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true
      sendTypingEvent(true)
    }

    if (localTypingStopRef.current) {
      clearTimeout(localTypingStopRef.current)
    }

    localTypingStopRef.current = setTimeout(() => {
      stopLocalTyping()
    }, 1800)
  }

  const typingIndicatorText = (() => {
    if (typingUsers.length === 0) return ''
    if (typingUsers.length === 1) {
      return `${typingUsers[0].first_name} ${typingUsers[0].last_name} is typing...`
    }
    if (typingUsers.length === 2) {
      return `${typingUsers[0].first_name} and ${typingUsers[1].first_name} are typing...`
    }
    return `${typingUsers[0].first_name}, ${typingUsers[1].first_name} and ${typingUsers.length - 2} others are typing...`
  })()

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!message.trim() || !channel || isSendingMessage) return

    setIsSendingMessage(true)

    // Send via WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const messageData = {
          type: 'send_message',
          channel_id: channel.channel_id,
          org_id: channel.org_id,
          message_content: message.trim(),
          parent_id: replyToMessage?.message_id ?? null,
        }
        
        wsRef.current.send(JSON.stringify(messageData))
        stopLocalTyping()
        setMessage("")
        setReplyToMessage(null)
        
        // Don't show toast for WebSocket sends to avoid UI clutter
        // The message will appear immediately via broadcast
      } catch (error) {
        console.error('Error sending message via WebSocket:', error)
        toast.error("Error", {
          description: "Failed to send message"
        })
      } finally {
        setIsSendingMessage(false)
      }
      return
    }

    // Fallback to REST API if WebSocket is not connected
    // try {
    //   const token = localStorage.getItem('access_token')
    //   if (!token) {
    //     router.push('/auth/login')
    //     return
    //   }

    //   const response = await fetch('http://localhost:8000/channel/send_message', {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${token}`,
    //     },
    //     body: JSON.stringify({
    //       channel_id: channel.channel_id,
    //       org_id: channel.org_id,
    //       message_content: message.trim(),
    //       parent_id: replyToMessage?.message_id ?? null,
    //     })
    //   })

    //   const data = await response.json()

    //   if (response.ok) {
    //     toast.success("Message sent", {
    //       description: "Your message has been sent successfully"
    //     })
    //     setMessage("")
    //     setReplyToMessage(null)
    //     // Refresh messages
    //     await fetchMessages(channel.org_id)
    //   } else {
    //     toast.error("Error", {
    //       description: data.detail || "Failed to send message"
    //     })
    //   }
    // } catch (error) {
    //   console.error('Error sending message:', error)
    //   toast.error("Error", {
    //     description: "An error occurred while sending the message"
    //   })
    // } finally {
    //   setIsSendingMessage(false)
    // }
  }

  const handleEditMessage = (messageId: number, currentContent: string) => {
    setEditingMessageId(messageId)
    setEditMessageContent(currentContent)
  }

  const handleCancelEditMessage = () => {
    setEditingMessageId(null)
    setEditMessageContent("")
  }

  const handleUpdateMessage = async (messageId: number) => {
    if (!editMessageContent.trim()) {
      toast.error("Error", {
        description: "Message content cannot be empty"
      })
      return
    }

    setIsEditingMessage(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `http://localhost:8000/message/${messageId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message_content: editMessageContent.trim()
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Message updated successfully"
        })
        // Update the message in the list
        setMessages(messages.map(msg => 
          msg.message_id === messageId 
            ? { ...msg, message_content: data.message_content, edited_at: data.edited_at }
            : msg
        ))
        setEditingMessageId(null)
        setEditMessageContent("")
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to update message"
        })
      }
    } catch (error) {
      console.error('Error updating message:', error)
      toast.error("Error", {
        description: "An error occurred while updating the message"
      })
    } finally {
      setIsEditingMessage(false)
    }
  }

  const handleDeleteMessageClick = (messageId: number) => {
    setMessageToDelete(messageId)
    setDeleteMessageDialogOpen(true)
  }

  const handleReplyToMessage = (targetMessage: ChatMessage) => {
    setReplyToMessage(targetMessage)
  }

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return

    setIsDeletingMessage(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `http://localhost:8000/message/${messageToDelete}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Message deleted successfully"
        })
        // Remove the message from the list
        setMessages(messages.filter(msg => msg.message_id !== messageToDelete))
        setDeleteMessageDialogOpen(false)
        setMessageToDelete(null)
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to delete message"
        })
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error("Error", {
        description: "An error occurred while deleting the message"
      })
    } finally {
      setIsDeletingMessage(false)
    }
  }

  const fetchPinnedMessages = async () => {
    if (!channel) return
    setLoadingPinnedMessages(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(
        `http://localhost:8000/organization/${channel.org_id}/channel/${channel.channel_id}/pinned`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (response.ok) {
        const data = await response.json()
        setPinnedMessages(data)
      } else {
        const data = await response.json()
        toast.error("Error", { description: data.detail || "Failed to load pinned messages" })
      }
    } catch (error) {
      console.error('Error fetching pinned messages:', error)
    } finally {
      setLoadingPinnedMessages(false)
    }
  }

  const handlePinMessage = async (messageId: number) => {
    if (!channel) return
    setPinningMessageId(messageId)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(
        `http://localhost:8000/organization/${channel.org_id}/message/${messageId}/pin`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Message pinned")
        if (showPinnedMessages) {
          await fetchPinnedMessages()
        }
      } else {
        toast.error("Error", { description: data.detail || "Failed to pin message" })
      }
    } catch (error) {
      console.error('Error pinning message:', error)
      toast.error("Error", { description: "An error occurred while pinning the message" })
    } finally {
      setPinningMessageId(null)
    }
  }

  const handleUnpinMessage = async (messageId: number) => {
    if (!channel) return
    setPinningMessageId(messageId)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(
        `http://localhost:8000/organization/${channel.org_id}/message/${messageId}/unpin`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Message unpinned")
        setPinnedMessages(prev => prev.filter(p => p.message_id !== messageId))
      } else {
        toast.error("Error", { description: data.detail || "Failed to unpin message" })
      }
    } catch (error) {
      console.error('Error unpinning message:', error)
      toast.error("Error", { description: "An error occurred while unpinning the message" })
    } finally {
      setPinningMessageId(null)
    }
  }

  const togglePinnedMessages = () => {
    const next = !showPinnedMessages
    setShowPinnedMessages(next)
    if (next) {
      setShowInfo(false)
      fetchPinnedMessages()
    }
  }

  const isMessagePinned = (messageId: number) => {
    return pinnedMessages.some(p => p.message_id === messageId)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const isImageAttachment = (fileName: string, fileUrl: string) => {
    const imagePattern = /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i
    const cleanName = fileName.split("?")[0]
    const cleanUrl = fileUrl.split("?")[0]
    return imagePattern.test(cleanName) || imagePattern.test(cleanUrl)
  }

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ""

    if (!selectedFile || !channel || isUploadingFile) return

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast.error("Realtime unavailable", {
        description: "Reconnect to channel before sending files"
      })
      return
    }

    setIsUploadingFile(true)
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ""))
        reader.onerror = () => reject(new Error("Failed to read file"))
        reader.readAsDataURL(selectedFile)
      })

      wsRef.current.send(JSON.stringify({
        type: 'send_file',
        channel_id: channel.channel_id,
        org_id: channel.org_id,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        mime_type: selectedFile.type || 'application/octet-stream',
        file_base64: fileBase64,
      }))
      stopLocalTyping()
    } catch (error) {
      console.error('Error preparing file upload:', error)
      toast.error("Upload failed", {
        description: "Could not process selected file"
      })
    } finally {
      setIsUploadingFile(false)
    }
  }

  useEffect(() => {
    if (!showMentionSuggestions) {
      setActiveMentionIndex(0)
      return
    }

    if (activeMentionIndex >= mentionCandidates.length) {
      setActiveMentionIndex(0)
    }
  }, [showMentionSuggestions, mentionCandidates.length, activeMentionIndex])

  const selectMention = (member: OrgMember) => {
    if (!mentionContext || !member.user_tag) {
      return
    }

    const insertion = `@${member.user_tag} `
    const before = message.slice(0, mentionContext.start)
    const after = message.slice(mentionContext.end)
    const nextMessage = `${before}${insertion}${after}`

    setMessage(nextMessage)
    setActiveMentionIndex(0)

    requestAnimationFrame(() => {
      const cursor = before.length + insertion.length
      messageInputRef.current?.focus()
      messageInputRef.current?.setSelectionRange(cursor, cursor)
    })
  }

  const renderMessageWithMentions = (content: string, isOwnMessage: boolean) => {
    const nodes: ReactNode[] = []
    let cursor = 0

    for (const match of content.matchAll(MENTION_REGEX)) {
      const start = match.index ?? -1
      if (start < 0) continue

      const fullMention = match[0]
      const end = start + fullMention.length

      if (start > cursor) {
        nodes.push(content.slice(cursor, start))
      }

      nodes.push(
        <span
          key={`${start}-${end}`}
          className={isOwnMessage ? 'rounded px-1 font-semibold bg-primary-foreground/20' : 'rounded px-1 font-semibold bg-primary/10 text-primary'}
        >
          {fullMention}
        </span>
      )

      cursor = end
    }

    if (cursor < content.length) {
      nodes.push(content.slice(cursor))
    }

    return nodes.length ? nodes : content
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveMentionIndex((prev) => (prev + 1) % mentionCandidates.length)
        return
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveMentionIndex((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const selected = mentionCandidates[activeMentionIndex]
        if (selected) {
          selectMention(selected)
        }
        return
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        setActiveMentionIndex(0)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  if (loading) {
    return (
      <>
        <Sidebar />
        <main className="ml-[368px] mr-80 min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading channel...</p>
          </div>
        </main>
      </>
    )
  }

  if (!channel) {
    return null
  }

  const isVoiceChannel = (channel.channel_category || "").toLowerCase() === "voice"
  const ChannelIcon = isVoiceChannel ? Volume2 : Hash

  return (
    <>
      <Sidebar />
      <OrganizationNavBar organizationId={channel.organization.organization_id} />
      <MembersSidebar organizationId={channel.organization.organization_id} isOpen={showMembers} onToggle={setShowMembers} />
      
      <main className={`ml-[368px] min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.08),_transparent_55%),linear-gradient(to_bottom,_hsl(var(--background)),_hsl(var(--muted)/0.25))] transition-all duration-300 ${showMembers ? ((showInfo || showPinnedMessages) ? 'mr-[640px]' : 'mr-80') : ((showInfo || showPinnedMessages) ? 'mr-80' : 'mr-0')}`}>
        {/* Channel Header */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                <div className="bg-primary/12 p-1.5 rounded-md">
                  <ChannelIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">{channel.channel_name}</h1>
                  {channel.description && (
                    <p className="text-xs text-muted-foreground">{channel.description}</p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="text-xs font-normal">
                {channel.channel_category}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {/* WebSocket Connection Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-muted/50">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-xs font-medium text-muted-foreground">
                  {isConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              
              {!isVoiceChannel && (
                <Button
                  variant={showSearch ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => {
                    setShowSearch(!showSearch)
                    if (showSearch) closeSearch()
                    else setTimeout(() => searchInputRef.current?.focus(), 100)
                  }}
                  className="h-9 w-9"
                  title="Search messages"
                >
                  <Search className="h-4 w-4" />
                </Button>
              )}

              {!isVoiceChannel && (
                <Button
                  variant={showPinnedMessages ? "secondary" : "ghost"}
                  size="icon"
                  onClick={togglePinnedMessages}
                  className="h-9 w-9"
                  title="Pinned messages"
                >
                  <Pin className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant={showMembers ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setShowMembers(!showMembers)}
                className="h-9 w-9"
                title="Members"
              >
                <Users className="h-4 w-4" />
              </Button>

              <Button
                variant={showInfo ? "secondary" : "ghost"}
                size="icon"
                onClick={() => { setShowInfo(!showInfo); if (!showInfo) setShowPinnedMessages(false) }}
                className="h-9 w-9"
                title="Channel info"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        {showSearch && (
          <div className="border-b bg-background/95 backdrop-blur px-6 py-3">
            <div className="flex items-center gap-3 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search messages in this channel..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 pr-4 h-9"
                  onKeyDown={(e) => { if (e.key === 'Escape') closeSearch() }}
                />
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={closeSearch}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {searchQuery.trim() && (
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border bg-background shadow-md">
                {isSearching ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
                    <span className="text-sm text-muted-foreground">Searching...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No messages found for &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <div className="divide-y">
                    {searchResults.map((result) => (
                      <button
                        key={result.message_id}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                        onClick={() => {
                          scrollToMessage(result.message_id)
                          closeSearch()
                        }}
                      >
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {result.sender.first_name} {result.sender.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(result.sent_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{result.message_content}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className={`flex ${showSearch ? 'h-[calc(100vh-88px-52px)]' : 'h-[calc(100vh-88px)]'}`}>
          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {isVoiceChannel ? (
              <div className="flex-1 overflow-y-auto px-4 py-6">
                <VoiceChannelPanel channelId={channel.channel_id} orgId={channel.org_id} />
              </div>
            ) : (
              <>
                {/* Messages Container */}
                <div className="flex-1 overflow-y-auto px-4 py-6">
                  <div className="max-w-6xl mx-auto">
                    {/* Channel Welcome Message */}
                    {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                      <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 shadow-lg border border-primary/10">
                        <Hash className="h-16 w-16 text-primary" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                      Welcome to #{channel.channel_name}
                    </h2>
                    <p className="text-muted-foreground mb-2 text-base">
                      This is the beginning of the <span className="font-semibold text-foreground">#{channel.channel_name}</span> channel.
                    </p>
                    {channel.description && (
                      <p className="text-sm text-muted-foreground max-w-md mt-2 bg-muted/50 rounded-lg px-4 py-2">
                        {channel.description}
                      </p>
                    )}
                    {!loadingMessages && (
                      <div className="mt-8">
                        <div className="bg-muted/50 rounded-full px-4 py-2">
                          <p className="text-sm text-muted-foreground">
                            No messages yet. Start the conversation! 
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                    )}

                    {/* Loading Messages */}
                    {loadingMessages && messages.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                    )}

                    {/* Messages List */}
                    {messages.length > 0 && (
                  <div className="space-y-2">
                    {messages.map((msg) => {
                      const isOwnMessage = currentUserId === msg.sender.user_id
                      return (
                      <div
                        key={msg.message_id}
                        id={`msg-${msg.message_id}`}
                        className={`group flex gap-3 -mx-2 px-2 py-2 rounded-xl transition-all duration-300 ${isOwnMessage ? 'flex-row-reverse hover:bg-primary/5' : 'hover:bg-muted/40'}`}
                      >
                        <Avatar className="h-9 w-9 border border-background shadow-sm mt-1">
                          <AvatarImage src={msg.sender.avatar_url || undefined} alt={msg.sender.first_name} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {msg.sender.first_name[0]}{msg.sender.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`min-w-0 max-w-[82%] flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                          <div className={`flex items-baseline gap-2 mb-1 px-1 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                            <span className="font-semibold text-foreground text-sm">
                              {msg.sender.first_name} {msg.sender.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {msg.sender.user_tag}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.sent_at).toLocaleString()}
                            </span>
                            {msg.edited_at !== msg.sent_at && (
                              <span className="text-xs text-muted-foreground italic">(edited)</span>
                            )}
                          </div>
                          
                          {/* Message Content or Edit Mode */}
                          {editingMessageId === msg.message_id ? (
                            <div className="mt-1 w-full rounded-2xl border border-primary/30 bg-background px-3 py-3 shadow-sm">
                              <Input
                                value={editMessageContent}
                                onChange={(e) => setEditMessageContent(e.target.value)}
                                className="mb-2"
                                disabled={isEditingMessage}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleUpdateMessage(msg.message_id)
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditMessage()
                                  }
                                }}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateMessage(msg.message_id)}
                                  disabled={isEditingMessage || !editMessageContent.trim()}
                                >
                                  {isEditingMessage ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditMessage}
                                  disabled={isEditingMessage}
                                >
                                  Cancel
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Press Enter to save • Esc to cancel
                              </p>
                            </div>
                          ) : (
                            <div className={`w-full rounded-2xl border px-4 py-3 shadow-sm ${isOwnMessage ? 'bg-primary text-primary-foreground border-primary/60 rounded-br-md' : 'bg-background border-border/70 rounded-bl-md'}`}>
                              {msg.is_file && msg.file_attachment && (
                                isImageAttachment(msg.file_attachment.file_name, msg.file_attachment.file_url) ? (
                                  <a
                                    href={msg.file_attachment.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mb-2 block"
                                  >
                                    <img
                                      src={msg.file_attachment.file_url}
                                       alt={msg.file_attachment.file_name}
                                      className="max-h-[320px] w-auto max-w-full rounded-lg border border-border/60 object-contain"
                                    />
                                    <p className={`mt-2 text-xs ${isOwnMessage ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                      {msg.file_attachment.file_name} • {formatFileSize(msg.file_attachment.file_size)}
                                    </p>
                                  </a>
                                ) : (
                                  <a
                                    href={msg.file_attachment.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`mb-2 block rounded-lg border px-3 py-2 transition-colors ${isOwnMessage ? 'border-primary-foreground/30 bg-primary-foreground/10 hover:bg-primary-foreground/20' : 'border-border/70 bg-muted/50 hover:bg-muted/70'}`}
                                  >
                                    <p className={`text-sm font-medium ${isOwnMessage ? 'text-primary-foreground' : 'text-foreground'}`}>
                                      {msg.file_attachment.file_name}
                                    </p>
                                    <p className={`text-xs ${isOwnMessage ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                      {formatFileSize(msg.file_attachment.file_size)} • Open file
                                    </p>
                                  </a>
                                )
                              )}
                              {msg.reply_to && (
                                <div className={`mb-2 rounded-md border-l-2 px-3 py-2 ${isOwnMessage ? 'border-primary-foreground/40 bg-primary-foreground/10' : 'border-primary/40 bg-muted/50'}`}>
                                  <p className={`text-xs ${isOwnMessage ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                    Replying to {msg.reply_to.sender.first_name} {msg.reply_to.sender.last_name}
                                  </p>
                                  <p className={`text-xs line-clamp-2 whitespace-pre-wrap break-words ${isOwnMessage ? 'text-primary-foreground/90' : 'text-foreground/80'}`}>
                                    {msg.reply_to.message_content}
                                  </p>
                                </div>
                              )}
                              {!msg.is_file && (
                                <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isOwnMessage ? 'text-primary-foreground' : 'text-foreground'}`}>
                                  {renderMessageWithMentions(msg.message_content, isOwnMessage)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Message Actions */}
                        {!msg.is_file && editingMessageId !== msg.message_id && (
                          <div className={`self-start md:opacity-0 md:group-hover:opacity-100 transition-opacity ${isOwnMessage ? 'mr-1' : 'ml-1'}`}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full bg-background/80 border border-border/70"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleReplyToMessage(msg)}
                                >
                                  <Reply className="mr-2 h-4 w-4" />
                                  Reply
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {isMessagePinned(msg.message_id) ? (
                                  <DropdownMenuItem
                                    onClick={() => handleUnpinMessage(msg.message_id)}
                                    disabled={pinningMessageId === msg.message_id}
                                  >
                                    <PinOff className="mr-2 h-4 w-4" />
                                    {pinningMessageId === msg.message_id ? 'Unpinning...' : 'Unpin Message'}
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handlePinMessage(msg.message_id)}
                                    disabled={pinningMessageId === msg.message_id}
                                  >
                                    <Pin className="mr-2 h-4 w-4" />
                                    {pinningMessageId === msg.message_id ? 'Pinning...' : 'Pin Message'}
                                  </DropdownMenuItem>
                                )}
                                {isOwnMessage && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleEditMessage(msg.message_id, msg.message_content)}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Message
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteMessageClick(msg.message_id)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Message
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                    )}
                  </div>
                </div>

                {/* Message Input Area */}
                <div className="border-t bg-background/70 backdrop-blur px-4 py-4">
                  <div className="max-w-6xl mx-auto">
                    <form onSubmit={handleSendMessage} className="relative">
                      <div className="rounded-2xl border border-border/70 bg-background/90 p-3 shadow-sm">
                        {/* Main Input Container */}
                        <div className="flex-1 relative">
                          {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-2 z-50 rounded-lg border bg-background shadow-xl overflow-hidden">
                              <div ref={emojiPickerContainerRef} />
                            </div>
                          )}

                          <div className="relative flex items-center bg-muted/35 rounded-full border border-input/80 shadow-sm hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            {/* Input Field */}
                            <Input
                              ref={messageInputRef}
                              placeholder={`Message #${channel.channel_name}`}
                              value={message}
                              onChange={(e) => handleMessageInputChange(e.target.value)}
                              onBlur={stopLocalTyping}
                              onKeyDown={handleKeyDown}
                              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-32 h-[50px] bg-transparent text-sm"
                            />

                            {showMentionSuggestions && (
                              <div className="absolute left-0 right-0 bottom-[58px] z-40 mx-2 rounded-xl border border-border/70 bg-background shadow-xl">
                                <div className="max-h-60 overflow-y-auto p-1">
                                  {mentionCandidates.map((member, index) => (
                                    <button
                                      key={member.user_id}
                                      type="button"
                                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${index === activeMentionIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted/70'}`}
                                      onMouseDown={(event) => {
                                        event.preventDefault()
                                        selectMention(member)
                                      }}
                                    >
                                      <span className="font-semibold">@{member.user_tag || `${member.first_name}${member.last_name}`}</span>
                                      <span className="truncate text-xs text-muted-foreground">
                                        {member.first_name} {member.last_name}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="absolute right-2 flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                                title="Add emoji"
                                ref={emojiButtonRef}
                                onClick={() => setShowEmojiPicker((prev) => !prev)}
                              >
                                <Smile className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                                title="Attach file"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingFile}
                              >
                                {isUploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Helper Text */}
                          <div className="flex items-center gap-2 mt-2 px-3">
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              onChange={handleFileSelected}
                            />
                            {replyToMessage && (
                              <div className="flex items-center justify-between gap-2 rounded-md border-l-2 border-primary/40 bg-muted/40 px-3 py-2 w-full">
                                <div className="min-w-0">
                                  <p className="text-xs text-muted-foreground">
                                    Replying to {replyToMessage.sender.first_name} {replyToMessage.sender.last_name}
                                  </p>
                                  <p className="text-xs text-foreground/80 line-clamp-1 whitespace-pre-wrap break-words">
                                    {replyToMessage.message_content}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={() => setReplyToMessage(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> to send
                            </p>
                            {typingIndicatorText && (
                              <p className="text-xs text-primary">{typingIndicatorText}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-end">
                          {/* Send Button */}
                          <Button 
                            type="submit" 
                            size="lg"
                            disabled={!message.trim() || isSendingMessage}
                            className="h-11 rounded-full px-6 shadow-sm"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            {isSendingMessage ? 'Sending...' : 'Send'}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Channel Info Sidebar - Fixed Position */}
      {showInfo && (
        <aside className="fixed top-0 right-80 h-screen w-80 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 overflow-y-auto z-30 shadow-xl">
          <div className="p-6 space-y-6">
            {/* Channel Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-base">Channel Info</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1.5">Channel Name</p>
                    <div className="flex items-center gap-2">
                      <ChannelIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="font-medium">{channel.channel_name}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1.5">Type</p>
                    <Badge variant="secondary" className="text-xs">
                      {channel.channel_category}
                    </Badge>
                  </div>
                  
                  {channel.description && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1.5">Description</p>
                      <p className="text-sm leading-relaxed">{channel.description}</p>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1.5">Created</p>
                    <p className="text-sm">{new Date(channel.created_at).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Organization Info */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-base">Organization</h3>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    <AvatarImage 
                      src={channel.organization.organaization_picture} 
                      alt={channel.organization.organization_name} 
                    />
                    <AvatarFallback className="bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {channel.organization.organization_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{channel.organization.organaization_tag}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Members Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-base">Members</h3>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground text-center py-2">
                  View all members in the right sidebar →
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Pinned Messages Sidebar */}
      {showPinnedMessages && (
        <aside className="fixed top-0 right-80 h-screen w-80 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 overflow-y-auto z-30 shadow-xl">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Pin className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-base">Pinned Messages</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowPinnedMessages(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {loadingPinnedMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : pinnedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-muted/50 rounded-full p-4 mb-3">
                  <Pin className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No pinned messages yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pin important messages to find them later
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pinnedMessages.map((pinned) => (
                  <div
                    key={pinned.id}
                    className="rounded-lg border border-border/60 bg-muted/30 p-3 space-y-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={pinned.sender.avatar_url || undefined} />
                          <AvatarFallback className="text-xs bg-primary/10">
                            {pinned.sender.first_name[0]}{pinned.sender.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">
                          {pinned.sender.first_name} {pinned.sender.last_name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleUnpinMessage(pinned.message_id)}
                        disabled={pinningMessageId === pinned.message_id}
                        title="Unpin message"
                      >
                        {pinningMessageId === pinned.message_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <PinOff className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words line-clamp-4">
                      {pinned.message_content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pinned {new Date(pinned.pinned_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Delete Message Dialog */}
      <Dialog open={deleteMessageDialogOpen} onOpenChange={setDeleteMessageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteMessageDialogOpen(false)}
              disabled={isDeletingMessage}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              onClick={handleDeleteMessage}
              disabled={isDeletingMessage}
            >
              {isDeletingMessage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Message"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
