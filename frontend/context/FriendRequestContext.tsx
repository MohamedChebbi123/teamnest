"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { getAccessToken } from "@/lib/auth"

export interface FriendRequestNotification {
  id: string
  request_id: number
  sender_id: number
  first_name: string
  last_name: string
  user_tag: string
  avatar_url: string | null
  read: boolean
}

interface FriendRequestContextType {
  notifications: FriendRequestNotification[]
  unreadCount: number
  markAllRead: () => void
  dismiss: (id: string) => void
}

const FriendRequestContext = createContext<FriendRequestContextType>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  dismiss: () => {},
})

export function FriendRequestProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<FriendRequestNotification[]>([])
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

    const playSound = () => {
      try {
        const AudioContextCtor =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (!AudioContextCtor) return
        const ctx = new AudioContextCtor()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = "sine"
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        gain.gain.setValueAtTime(0.0001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.22)
        osc.onended = () => ctx.close().catch(() => undefined)
      } catch {}
    }

    const connect = () => {
      if (unmountedRef.current) return

      const token = getAccessToken()
      if (!isTokenUsable(token)) return

      const ws = new WebSocket(
        `${process.env.NEXT_PUBLIC_WS_URL}/ws/friend-requests?token=${token}`
      )
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelayRef.current = 3000
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type !== "friend_request_received") return

          const notif: FriendRequestNotification = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            request_id: data.request_id,
            sender_id: data.sender_id,
            first_name: data.first_name,
            last_name: data.last_name,
            user_tag: data.user_tag,
            avatar_url: data.avatar_url,
            read: false,
          }

          setNotifications((prev) => [notif, ...prev].slice(0, 30))
          playSound()
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

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

  const dismiss = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id))

  return (
    <FriendRequestContext.Provider value={{ notifications, unreadCount, markAllRead, dismiss }}>
      {children}
    </FriendRequestContext.Provider>
  )
}

export const useFriendRequests = () => useContext(FriendRequestContext)
