"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"

interface DirectMessageNotificationContextType {
  unreadDmCount: number
  markDmsRead: () => void
}

const DirectMessageNotificationContext = createContext<DirectMessageNotificationContextType>({
  unreadDmCount: 0,
  markDmsRead: () => {},
})

export function DirectMessageNotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadDmCount, setUnreadDmCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(3000)
  const unmountedRef = useRef(false)
  const currentUserIdRef = useRef<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    // Decode user_id from JWT to know which messages are "incoming"
    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      currentUserIdRef.current = payload.sub ? Number(payload.sub) : null
    } catch {}

    unmountedRef.current = false

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

          const senderId = data.message.sender_id
          // Only count messages received from others (not sent by current user)
          if (currentUserIdRef.current !== null && senderId !== currentUserIdRef.current) {
            setUnreadDmCount((prev) => prev + 1)
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
      wsRef.current?.close()
    }
  }, [])

  const markDmsRead = () => setUnreadDmCount(0)

  return (
    <DirectMessageNotificationContext.Provider value={{ unreadDmCount, markDmsRead }}>
      {children}
    </DirectMessageNotificationContext.Provider>
  )
}

export const useDirectMessageNotifications = () => useContext(DirectMessageNotificationContext)
