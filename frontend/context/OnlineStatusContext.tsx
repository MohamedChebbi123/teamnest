"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { getAccessToken } from "@/lib/auth"

export type PresenceStatus = "online" | "away" | "dnd" | "offline"

interface OnlineStatusContextType {
  onlineUsers: Set<number>
  isUserOnline: (userId: number) => boolean
  getUserStatus: (userId: number) => PresenceStatus
  getUserLastSeen: (userId: number) => string | null
  myStatus: PresenceStatus
  setMyStatus: (status: PresenceStatus) => void
  disconnect: () => void
}

const OnlineStatusContext = createContext<OnlineStatusContextType>({
  onlineUsers: new Set(),
  isUserOnline: () => false,
  getUserStatus: () => "offline",
  getUserLastSeen: () => null,
  myStatus: "offline",
  setMyStatus: () => {},
  disconnect: () => {},
})

const SETTABLE_STATUSES: PresenceStatus[] = ["online", "away", "dnd"]
const IDLE_AWAY_MS = 5 * 60 * 1000

export function OnlineStatusProvider({ children }: { children: React.ReactNode }) {
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set())
  const [statuses, setStatuses] = useState<Map<number, PresenceStatus>>(new Map())
  const [lastSeen, setLastSeen] = useState<Map<number, string>>(new Map())
  const [myStatus, setMyStatusState] = useState<PresenceStatus>("offline")

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(3000)
  const unmountedRef = useRef(false)
  const desiredStatusRef = useRef<PresenceStatus>("online")
  const manualStatusRef = useRef<PresenceStatus | null>(null)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHiddenRef = useRef(false)

  const sendStatus = useCallback((status: PresenceStatus) => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "set_status", status }))
    }
  }, [])

  const applyDesiredStatus = useCallback(() => {
    let target: PresenceStatus = "online"
    if (manualStatusRef.current === "dnd") {
      target = "dnd"
    } else if (manualStatusRef.current === "away" || isHiddenRef.current) {
      target = "away"
    } else if (manualStatusRef.current) {
      target = manualStatusRef.current
    }
    if (target !== desiredStatusRef.current) {
      desiredStatusRef.current = target
      setMyStatusState(target)
      sendStatus(target)
    }
  }, [sendStatus])

  const armIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => {
      isHiddenRef.current = true
      applyDesiredStatus()
    }, IDLE_AWAY_MS)
  }, [applyDesiredStatus])

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

      const token = getAccessToken()
      if (!isTokenUsable(token)) return

      const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/connectivity?token=${token}`)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectDelayRef.current = 3000
        const initial = manualStatusRef.current ?? "online"
        desiredStatusRef.current = initial
        setMyStatusState(initial)
        if (initial !== "online") sendStatus(initial)

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
          if (data.type === "user_status") {
            setOnlineUsers((prev) => new Set(prev).add(data.user_id))
            setStatuses((prev) => {
              const next = new Map(prev)
              next.set(data.user_id, data.status as PresenceStatus)
              return next
            })
          } else if (data.type === "user_online") {
            setOnlineUsers((prev) => new Set(prev).add(data.user_id))
            setStatuses((prev) => {
              const next = new Map(prev)
              next.set(data.user_id, "online")
              return next
            })
          } else if (data.type === "user_offline") {
            setOnlineUsers((prev) => {
              const next = new Set(prev)
              next.delete(data.user_id)
              return next
            })
            setStatuses((prev) => {
              const next = new Map(prev)
              next.set(data.user_id, "offline")
              return next
            })
            if (data.last_seen_at) {
              setLastSeen((prev) => {
                const next = new Map(prev)
                next.set(data.user_id, data.last_seen_at as string)
                return next
              })
            }
          } else if (data.type === "friends_status") {
            setOnlineUsers((prev) => {
              const next = new Set(prev)
              for (const u of data.users) next.add(u.user_id)
              return next
            })
            setStatuses((prev) => {
              const next = new Map(prev)
              for (const u of data.users) next.set(u.user_id, u.status as PresenceStatus)
              return next
            })
          } else if (data.type === "friends_online") {
            setOnlineUsers((prev) => {
              const next = new Set(prev)
              for (const uid of data.user_ids) next.add(uid)
              return next
            })
          } else if (data.type === "status_ack") {
            setMyStatusState(data.status as PresenceStatus)
          }
        } catch {}
      }

      ws.onclose = () => {
        if (unmountedRef.current) return
        setMyStatusState("offline")
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000)
          connect()
        }, reconnectDelayRef.current)
      }
    }

    connect()

    const onActivity = () => {
      if (isHiddenRef.current) {
        isHiddenRef.current = false
        applyDesiredStatus()
      }
      armIdleTimer()
    }

    const onVisibility = () => {
      if (document.hidden) {
        isHiddenRef.current = true
        applyDesiredStatus()
      } else {
        isHiddenRef.current = false
        applyDesiredStatus()
        armIdleTimer()
      }
    }

    const activityEvents: (keyof WindowEventMap)[] = ["mousemove", "keydown", "click", "scroll", "touchstart"]
    activityEvents.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))
    document.addEventListener("visibilitychange", onVisibility)
    armIdleTimer()

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
      activityEvents.forEach((e) => window.removeEventListener(e, onActivity))
      document.removeEventListener("visibilitychange", onVisibility)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      wsRef.current?.close()
    }
  }, [applyDesiredStatus, armIdleTimer, sendStatus])

  const isUserOnline = useCallback((userId: number) => onlineUsers.has(userId), [onlineUsers])
  const getUserStatus = useCallback(
    (userId: number): PresenceStatus => statuses.get(userId) ?? (onlineUsers.has(userId) ? "online" : "offline"),
    [statuses, onlineUsers]
  )
  const getUserLastSeen = useCallback((userId: number) => lastSeen.get(userId) ?? null, [lastSeen])

  const setMyStatus = useCallback(
    (status: PresenceStatus) => {
      if (!SETTABLE_STATUSES.includes(status)) return
      manualStatusRef.current = status
      if (status !== "away") isHiddenRef.current = false
      applyDesiredStatus()
      armIdleTimer()
    },
    [applyDesiredStatus, armIdleTimer]
  )

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
    setOnlineUsers(new Set())
    setStatuses(new Map())
    setMyStatusState("offline")
  }, [])

  return (
    <OnlineStatusContext.Provider
      value={{
        onlineUsers,
        isUserOnline,
        getUserStatus,
        getUserLastSeen,
        myStatus,
        setMyStatus,
        disconnect,
      }}
    >
      {children}
    </OnlineStatusContext.Provider>
  )
}

export const useOnlineStatus = () => useContext(OnlineStatusContext)
