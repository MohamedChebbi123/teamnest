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

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) return

    const ws = new WebSocket(`/ws/connectivity?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
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

    return () => {
      ws.close()
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
