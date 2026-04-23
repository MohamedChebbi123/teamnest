"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"

interface OnlineStatusContextType {
  onlineUsers: Set<number>
  isUserOnline: (userId: number) => boolean
  disconnect: () => void
}

const OnlineStatusContext = createContext<OnlineStatusContextType>({
  onlineUsers: new Set(),
  isUserOnline: () => false,
  disconnect: () => {},
})

export function OnlineStatusProvider({ children }: { children: React.ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set())
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(3000)
  const unmountedRef = useRef(false)

  useEffect(() => {
    unmountedRef.current = false

    const isTokenUsable = (t: string | null): t is string => {
      if (!t) return false
      try {
        const payload = JSON.parse(atob(t.split(".")[1]))
        return typeof payload.exp === "number" && payload.exp * 1000 > Date.now()
      } catch {
        return false
      }
    }

    const connect = () => {
      if (unmountedRef.current) return

      const token = localStorage.getItem("access_token")
      if (!isTokenUsable(token)) return

      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/connectivity?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelayRef.current = 3000
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }))
          }
        }, 10000)
        ws.addEventListener("close", () => clearInterval(pingInterval))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "user_online") {
            setOnlineUsers((prev) => new Set(prev).add(data.user_id))
          } else if (data.type === "user_offline") {
            setOnlineUsers((prev) => {
              const next = new Set(prev)
              next.delete(data.user_id)
              return next
            })
          } else if (data.type === "friends_online") {
            setOnlineUsers((prev) => {
              const next = new Set(prev)
              for (const uid of data.user_ids) next.add(uid)
              return next
            })
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

    const onStorage = (e: StorageEvent) => {
      if (e.key !== "access_token") return
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      reconnectDelayRef.current = 3000
      wsRef.current?.close()
      connect()
    }
    window.addEventListener("storage", onStorage)

    return () => {
      unmountedRef.current = true
      window.removeEventListener("storage", onStorage)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [])

  const isUserOnline = (userId: number) => onlineUsers.has(userId)

  const disconnect = () => {
    wsRef.current?.close()
    wsRef.current = null
    setOnlineUsers(new Set())
  }

  return (
    <OnlineStatusContext.Provider value={{ onlineUsers, isUserOnline, disconnect }}>
      {children}
    </OnlineStatusContext.Provider>
  )
}

export const useOnlineStatus = () => useContext(OnlineStatusContext)
