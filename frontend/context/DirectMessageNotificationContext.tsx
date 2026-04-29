"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { getAccessToken } from "@/lib/auth"

export interface DmNotification {
  id: string
  sender_id: number
  sender_first_name: string
  sender_last_name: string
  sender_avatar_url: string | null
  sender_user_tag: string | null
  last_message_preview: string
  count: number
  latest_at: string
  read: boolean
}

interface DirectMessageNotificationContextType {
  unreadDmCount: number
  dmNotifications: DmNotification[]
  markDmsRead: () => void
  dismissDm: (senderId: number) => void
}

const DirectMessageNotificationContext = createContext<DirectMessageNotificationContextType>({
  unreadDmCount: 0,
  dmNotifications: [],
  markDmsRead: () => {},
  dismissDm: () => {},
})

export function DirectMessageNotificationProvider({ children }: { children: React.ReactNode }) {
  const [dmNotifications, setDmNotifications] = useState<DmNotification[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(3000)
  const unmountedRef = useRef(false)
  const currentUserIdRef = useRef<number | null>(null)

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      currentUserIdRef.current = payload.sub ? Number(payload.sub) : null
    } catch {}

    unmountedRef.current = false

    const loadStored = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        const stored: DmNotification[] = (data.direct_messages || []).map((d: {
          id: string
          sender_id: number
          sender_first_name: string
          sender_last_name: string
          sender_avatar_url: string | null
          sender_user_tag: string | null
          last_message_preview: string
          count: number
          latest_at: string
        }) => ({
          id: d.id,
          sender_id: d.sender_id,
          sender_first_name: d.sender_first_name || "",
          sender_last_name: d.sender_last_name || "",
          sender_avatar_url: d.sender_avatar_url ?? null,
          sender_user_tag: d.sender_user_tag ?? null,
          last_message_preview: d.last_message_preview || "",
          count: d.count || 1,
          latest_at: d.latest_at || new Date().toISOString(),
          read: false,
        }))
        setDmNotifications((prev) => {
          const bySender = new Map<number, DmNotification>()
          for (const item of stored) bySender.set(item.sender_id, item)
          for (const item of prev) {
            const existing = bySender.get(item.sender_id)
            if (!existing) {
              bySender.set(item.sender_id, item)
            } else if ((item.latest_at || "") > (existing.latest_at || "")) {
              bySender.set(item.sender_id, item)
            }
          }
          return Array.from(bySender.values())
            .sort((a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime())
            .slice(0, 30)
        })
      } catch {}
    }

    loadStored()

    const connect = () => {
      if (unmountedRef.current) return

      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/ws/direct-messages?token=${token}`
      )
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelayRef.current = 3000
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type !== "new_direct_message" || !data.message) return

          const msg = data.message
          const senderId = msg.sender_id

          if (currentUserIdRef.current !== null && senderId === currentUserIdRef.current) return

          const sender = msg.sender ?? {}

          setDmNotifications((prev) => {
            const existing = prev.find((n) => n.sender_id === senderId)
            if (existing) {
              return prev.map((n) =>
                n.sender_id === senderId
                  ? {
                      ...n,
                      count: n.count + 1,
                      last_message_preview: msg.is_file ? "Sent a file" : (msg.content || ""),
                      latest_at: msg.sent_at || new Date().toISOString(),
                      read: false,
                    }
                  : n
              )
            }
            const newNotif: DmNotification = {
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              sender_id: senderId,
              sender_first_name: sender.first_name || "",
              sender_last_name: sender.last_name || "",
              sender_avatar_url: sender.avatar_url ?? null,
              sender_user_tag: sender.user_tag ?? null,
              last_message_preview: msg.is_file ? "Sent a file" : (msg.content || ""),
              count: 1,
              latest_at: msg.sent_at || new Date().toISOString(),
              read: false,
            }
            return [newNotif, ...prev].slice(0, 30)
          })
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

  const unreadDmCount = dmNotifications.filter((n) => !n.read).reduce((sum, n) => sum + n.count, 0)
  const markDmsRead = () => setDmNotifications((prev) => prev.map((n) => ({ ...n, read: true, count: 0 })))
  const dismissDm = (senderId: number) =>
    setDmNotifications((prev) => prev.filter((n) => n.sender_id !== senderId))

  return (
    <DirectMessageNotificationContext.Provider value={{ unreadDmCount, dmNotifications, markDmsRead, dismissDm }}>
      {children}
    </DirectMessageNotificationContext.Provider>
  )
}

export const useDirectMessageNotifications = () => useContext(DirectMessageNotificationContext)
