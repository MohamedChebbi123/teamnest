"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"

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

interface MentionNotificationContextType {
  mentions: MentionNotification[]
  unreadCount: number
  markAllRead: () => void
  dismiss: (id: string) => void
}

const MentionNotificationContext = createContext<MentionNotificationContextType>({
  mentions: [],
  unreadCount: 0,
  markAllRead: () => {},
  dismiss: () => {},
})

export function MentionNotificationProvider({ children }: { children: React.ReactNode }) {
  const [mentions, setMentions] = useState<MentionNotification[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(3000)
  const unmountedRef = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    unmountedRef.current = false

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
          if (notif?.type !== "channel_mention") return

          const mention: MentionNotification = {
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

          setMentions((prev) => [mention, ...prev].slice(0, 50))
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
      wsRef.current?.close()
    }
  }, [])

  const unreadCount = mentions.filter((m) => !m.read).length
  const markAllRead = () => setMentions((prev) => prev.map((m) => ({ ...m, read: true })))
  const dismiss = (id: string) => setMentions((prev) => prev.filter((m) => m.id !== id))

  return (
    <MentionNotificationContext.Provider value={{ mentions, unreadCount, markAllRead, dismiss }}>
      {children}
    </MentionNotificationContext.Provider>
  )
}

export const useMentionNotifications = () => useContext(MentionNotificationContext)
