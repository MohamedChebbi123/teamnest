"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { getAccessToken } from "@/lib/auth"

export interface MentionNotification {
  id: string
  message_id: number
  sender_id: number
  channel_id: number
  org_id: number
  channel_name: string
  sender_first_name: string
  sender_last_name: string
  sender_avatar_url: string | null
  sender_user_tag: string | null
  created_at: string
  read: boolean
}

export interface AnnouncementNotification extends MentionNotification {}

interface MentionNotificationContextType {
  mentions: MentionNotification[]
  announcements: AnnouncementNotification[]
  unreadCount: number
  unreadAnnouncementCount: number
  markAllRead: () => void
  dismiss: (id: string) => void
  dismissAnnouncement: (id: string) => void
}

const MentionNotificationContext = createContext<MentionNotificationContextType>({
  mentions: [],
  announcements: [],
  unreadCount: 0,
  unreadAnnouncementCount: 0,
  markAllRead: () => {},
  dismiss: () => {},
  dismissAnnouncement: () => {},
})

type ServerNotification = {
  id: number
  message_id: number
  sender_id: number
  channel_id: number
  org_id: number
  channel_name: string | null
  sender_first_name: string | null
  sender_last_name: string | null
  sender_avatar_url: string | null
  sender_user_tag: string | null
  created_at: string
  is_seen: boolean
}

const mapServerNotification = (n: ServerNotification): MentionNotification => ({
  id: `srv-${n.id}`,
  message_id: n.message_id,
  sender_id: n.sender_id,
  channel_id: n.channel_id,
  org_id: n.org_id,
  channel_name: n.channel_name || "",
  sender_first_name: n.sender_first_name || "",
  sender_last_name: n.sender_last_name || "",
  sender_avatar_url: n.sender_avatar_url ?? null,
  sender_user_tag: n.sender_user_tag ?? null,
  created_at: n.created_at,
  read: !!n.is_seen,
})

export function MentionNotificationProvider({ children }: { children: React.ReactNode }) {
  const [mentions, setMentions] = useState<MentionNotification[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementNotification[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(3000)
  const unmountedRef = useRef(false)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const token = getAccessToken()
    if (!token) return

    unmountedRef.current = false

    const loadStored = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        const mapped = {
          mentions: (data.mentions || []).map(mapServerNotification),
          announcements: (data.announcements || []).map(mapServerNotification),
        }
        setMentions((prev) => mergeUnique(mapped.mentions, prev))
        setAnnouncements((prev) => mergeUnique(mapped.announcements, prev))
      } catch {}
    }

    loadStored()

    const connect = () => {
      if (unmountedRef.current) return

      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/ws/notifications?token=${token}`
      )
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelayRef.current = 3000
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type !== "new_notification") return
          const notif = data.notification
          if (notif?.type !== "channel_mention" && notif?.type !== "channel_announcement") return

          const entry: MentionNotification = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            message_id: notif.message_id,
            sender_id: notif.sender_id,
            channel_id: notif.channel_id,
            org_id: notif.org_id,
            channel_name: notif.channel_name || "",
            sender_first_name: notif.sender_first_name || "",
            sender_last_name: notif.sender_last_name || "",
            sender_avatar_url: notif.sender_avatar_url ?? null,
            sender_user_tag: notif.sender_user_tag ?? null,
            created_at: notif.created_at,
            read: false,
          }

          if (notif.type === "channel_mention") {
            setMentions((prev) => [entry, ...prev].slice(0, 100))
          } else {
            setAnnouncements((prev) => [entry, ...prev].slice(0, 100))
          }
        } catch {}
      }

      ws.onclose = () => {
        if (unmountedRef.current) return
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000)
          connect()
        }, reconnectDelayRef.current)
      }
    }

    connect()

    return () => {
      unmountedRef.current = true
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      const ws = wsRef.current
      wsRef.current = null
      if (ws) {
        // Detach handlers so the close that fires on a CONNECTING socket
        // doesn't bubble through onclose and trigger the reconnect path
        // (or noisy logs) after Strict Mode tears the effect down in dev.
        ws.onopen = null
        ws.onmessage = null
        ws.onerror = null
        ws.onclose = null
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close()
        }
      }
    }
  }, [])

  const unreadCount = mentions.filter((m) => !m.read).length
  const unreadAnnouncementCount = announcements.filter((a) => !a.read).length

  const markAllRead = () => {
    setMentions((prev) => prev.map((m) => ({ ...m, read: true })))
    setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })))

    const token = getAccessToken()
    if (!token) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/notifications/seen`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(null),
    }).catch(() => {})
  }

  const dismiss = (id: string) => setMentions((prev) => prev.filter((m) => m.id !== id))
  const dismissAnnouncement = (id: string) => setAnnouncements((prev) => prev.filter((a) => a.id !== id))

  return (
    <MentionNotificationContext.Provider value={{
      mentions,
      announcements,
      unreadCount,
      unreadAnnouncementCount,
      markAllRead,
      dismiss,
      dismissAnnouncement,
    }}>
      {children}
    </MentionNotificationContext.Provider>
  )
}

function mergeUnique(incoming: MentionNotification[], existing: MentionNotification[]): MentionNotification[] {
  const existingIds = new Set(existing.map((e) => e.id))
  const existingMessageIds = new Set(existing.map((e) => e.message_id))
  const merged = [...existing]
  for (const item of incoming) {
    if (existingIds.has(item.id) || existingMessageIds.has(item.message_id)) continue
    merged.push(item)
  }
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return merged.slice(0, 100)
}

export const useMentionNotifications = () => useContext(MentionNotificationContext)
