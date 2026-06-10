"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { getAccessToken, hydrateAccessToken } from "@/lib/auth"

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

export interface TaskAssignmentNotification {
  id: string
  task_id: number
  task_title: string
  team_id: number
  assigned_by_id: number
  assigned_by_first_name: string
  assigned_by_last_name: string
  assigned_by_avatar_url: string | null
  created_at: string
  read: boolean
}

interface MentionNotificationContextType {
  mentions: MentionNotification[]
  announcements: AnnouncementNotification[]
  taskAssignments: TaskAssignmentNotification[]
  unreadCount: number
  unreadAnnouncementCount: number
  unreadTaskCount: number
  markAllRead: () => void
  dismiss: (id: string) => void
  dismissAnnouncement: (id: string) => void
  dismissTaskAssignment: (id: string) => void
}

const MentionNotificationContext = createContext<MentionNotificationContextType>({
  mentions: [],
  announcements: [],
  taskAssignments: [],
  unreadCount: 0,
  unreadAnnouncementCount: 0,
  unreadTaskCount: 0,
  markAllRead: () => {},
  dismiss: () => {},
  dismissAnnouncement: () => {},
  dismissTaskAssignment: () => {},
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

type ServerTaskNotification = {
  id: number
  task_id: number
  task_title: string
  team_id: number
  assigned_by_id: number
  assigned_by_first_name: string
  assigned_by_last_name: string
  assigned_by_avatar_url: string | null
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

const mapServerTaskNotification = (n: ServerTaskNotification): TaskAssignmentNotification => ({
  id: `task-${n.id}`,
  task_id: n.task_id,
  task_title: n.task_title,
  team_id: n.team_id,
  assigned_by_id: n.assigned_by_id,
  assigned_by_first_name: n.assigned_by_first_name || "",
  assigned_by_last_name: n.assigned_by_last_name || "",
  assigned_by_avatar_url: n.assigned_by_avatar_url ?? null,
  created_at: n.created_at,
  read: !!n.is_seen,
})

function mergeTaskUnique(incoming: TaskAssignmentNotification[], existing: TaskAssignmentNotification[]): TaskAssignmentNotification[] {
  const existingIds = new Set(existing.map((e) => e.id))
  const existingTaskIds = new Set(existing.map((e) => e.task_id))
  const merged = [...existing]
  for (const item of incoming) {
    if (existingIds.has(item.id) || existingTaskIds.has(item.task_id)) continue
    merged.push(item)
  }
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  return merged.slice(0, 100)
}

export function MentionNotificationProvider({ children }: { children: React.ReactNode }) {
  const [mentions, setMentions] = useState<MentionNotification[]>([])
  const [announcements, setAnnouncements] = useState<AnnouncementNotification[]>([])
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignmentNotification[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(3000)
  const unmountedRef = useRef(false)

  useEffect(() => {
    let active = true
    unmountedRef.current = false

    const init = async () => {
      const token = getAccessToken() ?? await hydrateAccessToken()
      if (!active || !token) return

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
          taskAssignments: (data.task_assignments || []).map(mapServerTaskNotification),
        }
        setMentions((prev) => mergeUnique(mapped.mentions, prev))
        setAnnouncements((prev) => mergeUnique(mapped.announcements, prev))
        setTaskAssignments((prev) => mergeTaskUnique(mapped.taskAssignments, prev))
      } catch {}
      }

      await loadStored()

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
            if (notif?.type === "channel_mention") {
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
              setMentions((prev) => [entry, ...prev].slice(0, 100))
            } else if (notif?.type === "channel_announcement") {
              const entry: AnnouncementNotification = {
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
              setAnnouncements((prev) => [entry, ...prev].slice(0, 100))
            } else if (notif?.type === "task_assigned") {
              const entry: TaskAssignmentNotification = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                task_id: notif.task_id,
                task_title: notif.task_title || "Untitled task",
                team_id: notif.team_id,
                assigned_by_id: notif.assigned_by_id,
                assigned_by_first_name: notif.assigned_by_first_name || "",
                assigned_by_last_name: notif.assigned_by_last_name || "",
                assigned_by_avatar_url: notif.assigned_by_avatar_url ?? null,
                created_at: notif.created_at,
                read: false,
              }
              setTaskAssignments((prev) => [entry, ...prev].slice(0, 100))
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
    }

    void init()

    return () => {
      active = false
      unmountedRef.current = true
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      const ws = wsRef.current
      wsRef.current = null
      if (ws) {
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
  const unreadTaskCount = taskAssignments.filter((t) => !t.read).length

  const markAllRead = () => {
    setMentions((prev) => prev.map((m) => ({ ...m, read: true })))
    setAnnouncements((prev) => prev.map((a) => ({ ...a, read: true })))
    setTaskAssignments((prev) => prev.map((t) => ({ ...t, read: true })))

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
  const dismissTaskAssignment = (id: string) => setTaskAssignments((prev) => prev.filter((t) => t.id !== id))

  return (
    <MentionNotificationContext.Provider value={{
      mentions,
      announcements,
      taskAssignments,
      unreadCount,
      unreadAnnouncementCount,
      unreadTaskCount,
      markAllRead,
      dismiss,
      dismissAnnouncement,
      dismissTaskAssignment,
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
