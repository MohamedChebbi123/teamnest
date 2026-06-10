"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar/page"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useFriendRequests } from "@/context/FriendRequestContext"
import { useDirectMessageNotifications } from "@/context/DirectMessageNotificationContext"
import { useMentionNotifications } from "@/context/MentionNotificationContext"
import { getAccessToken } from "@/lib/auth"
import {
  Bell,
  Users,
  Mail,
  FileText,
  Check,
  X,
  MessageCircle,
  CheckCheck,
  Trash2,
  BellOff,
  AtSign,
  Hash,
  Megaphone,
  ClipboardList,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface UserData {
  first_name?: string
  last_name?: string
  email?: string
  avatar_url?: string
  is_verified?: boolean
  profile_completed?: boolean
}

type TabType = "all" | "friend_requests" | "mentions" | "announcements" | "messages" | "tasks" | "system"

const formatTime = (dateStr: string) => {
  if (!dateStr) return ""
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

export default function NotificationsPage() {
  const router = useRouter()
  const { notifications: friendRequestNotifs, markAllRead: markFriendRequestsRead, dismiss } = useFriendRequests()
  const { unreadDmCount, dmNotifications, markDmsRead, dismissDm } = useDirectMessageNotifications()
  const {
    mentions,
    announcements,
    taskAssignments,
    unreadTaskCount,
    markAllRead: markMentionsRead,
    dismiss: dismissMention,
    dismissAnnouncement,
    dismissTaskAssignment,
  } = useMentionNotifications()
  const [user, setUser] = useState<UserData | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("all")
  const [fetchedTasks, setFetchedTasks] = useState<TaskAssignmentNotification[]>([])

  useEffect(() => {
    markFriendRequestsRead()
  }, [])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => {
        if (data.task_assignments) {
          setFetchedTasks(data.task_assignments.map((n: any) => ({
            id: `task-${n.id}`,
            task_id: n.task_id,
            task_title: n.task_title || "Untitled task",
            team_id: n.team_id,
            assigned_by_id: n.assigned_by_id,
            assigned_by_first_name: n.assigned_by_first_name || "",
            assigned_by_last_name: n.assigned_by_last_name || "",
            assigned_by_avatar_url: n.assigned_by_avatar_url ?? null,
            created_at: n.created_at,
            read: !!n.is_seen,
          })))
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const token = getAccessToken()
    if (!token) { router.push("/auth/login"); return }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then(setUser)
      .catch(() => router.push("/auth/login"))
  }, [router])

  const systemNotifications = [
    {
      id: "verify-email",
      title: "Verify your email",
      description: "Please verify your email address to access all features of TeamNest",
      icon: Mail,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      action: () => router.push("/auth/verify-email"),
      actionLabel: "Verify now",
      show: user && !user.is_verified,
    },
    {
      id: "complete-profile",
      title: "Complete your profile",
      description: "Add your details to help teammates find and connect with you",
      icon: FileText,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      action: () => router.push("/auth/complete-profile"),
      actionLabel: "Complete profile",
      show: user && !user.profile_completed,
    },
  ].filter((n) => n.show)

  const unreadDmNotifs = dmNotifications.filter((n) => !n.read)
  const unreadMentions = mentions.filter((m) => !m.read)
  const unreadAnnouncements = announcements.filter((a) => !a.read)

  const unreadTasks = [...fetchedTasks, ...taskAssignments].filter((t) => !t.read)
    .filter((t, i, arr) => arr.findIndex((x) => x.task_id === t.task_id) === i)

  const counts = {
    friend_requests: friendRequestNotifs.length,
    mentions: unreadMentions.length,
    announcements: unreadAnnouncements.length,
    messages: unreadDmNotifs.length,
    tasks: unreadTasks.length,
    system: systemNotifications.length,
  }
  const totalCount = counts.friend_requests + counts.mentions + counts.announcements + counts.messages + counts.tasks + counts.system

  const tabs: { key: TabType; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalCount },
    { key: "friend_requests", label: "Friend Requests", count: counts.friend_requests },
    { key: "mentions", label: "Mentions", count: counts.mentions },
    { key: "announcements", label: "Announcements", count: counts.announcements },
    { key: "messages", label: "Messages", count: counts.messages },
    { key: "tasks", label: "Tasks", count: counts.tasks },
    { key: "system", label: "System", count: counts.system },
  ]

  const showFriendRequests = activeTab === "all" || activeTab === "friend_requests"
  const showMentions = activeTab === "all" || activeTab === "mentions"
  const showAnnouncements = activeTab === "all" || activeTab === "announcements"
  const showMessages = activeTab === "all" || activeTab === "messages"
  const showTasks = activeTab === "all" || activeTab === "tasks"
  const showSystem = activeTab === "all" || activeTab === "system"

  const activeCount =
    activeTab === "all" ? totalCount
    : activeTab === "friend_requests" ? counts.friend_requests
    : activeTab === "mentions" ? counts.mentions
    : activeTab === "announcements" ? counts.announcements
    : activeTab === "messages" ? counts.messages
    : activeTab === "tasks" ? counts.tasks
    : counts.system

  const handleMarkAllRead = () => {
    markFriendRequestsRead()
    markDmsRead()
    markMentionsRead()
  }

  const handleClearAll = () => {
    friendRequestNotifs.forEach((n) => dismiss(n.id))
    markDmsRead()
    mentions.forEach((m) => dismissMention(m.id))
    announcements.forEach((a) => dismissAnnouncement(a.id))
    taskAssignments.forEach((t) => dismissTaskAssignment(t.id))
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {totalCount === 0 ? "You're all caught up" : `${totalCount} notification${totalCount !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleClearAll}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted/40 rounded-xl p-1 w-fit flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.count > 0 && (
                <Badge
                  variant={activeTab === tab.key ? "default" : "secondary"}
                  className="h-5 min-w-5 px-1.5 text-xs rounded-full"
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeCount === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-24 text-muted-foreground gap-4">
            <div className="h-20 w-20 rounded-2xl bg-muted/60 flex items-center justify-center">
              <BellOff className="h-10 w-10 opacity-40" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium">No notifications here</p>
              <p className="text-sm mt-1 opacity-70">
                {activeTab === "all" ? "You're completely caught up!" : `No ${activeTab.replace("_", " ")} notifications`}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">

            {/* Friend Requests Section */}
            {showFriendRequests && friendRequestNotifs.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Friend Requests
                    </span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">{counts.friend_requests}</Badge>
                  </div>
                )}
                <div className="space-y-2">
                  {friendRequestNotifs.map((notif) => (
                    <div
                      key={notif.id}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border bg-card transition-all",
                        "hover:shadow-sm hover:border-border/80",
                        !notif.read && "border-l-4 border-l-green-500"
                      )}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={notif.avatar_url ?? undefined} />
                          <AvatarFallback className="bg-green-500/10 text-green-600 font-semibold">
                            {notif.first_name[0]}{notif.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500/10 border-2 border-background flex items-center justify-center">
                          <Users className="h-2.5 w-2.5 text-green-500" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {notif.first_name} {notif.last_name}
                          <span className="font-normal text-muted-foreground"> sent you a friend request</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">@{notif.user_tag}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs bg-green-500 hover:bg-green-600 text-white"
                          onClick={() => { router.push("/friends"); dismiss(notif.id) }}
                        >
                          View
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => dismiss(notif.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Mentions Section */}
            {showMentions && unreadMentions.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <div className="flex items-center gap-2 mb-3">
                    <AtSign className="h-4 w-4 text-violet-500" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Mentions
                    </span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">{counts.mentions}</Badge>
                  </div>
                )}
                <div className="space-y-2">
                  {unreadMentions.map((mention) => (
                    <div
                      key={mention.id}
                      className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm hover:border-border/80 transition-all cursor-pointer border-l-4 border-l-violet-500"
                      onClick={() => {
                        dismissMention(mention.id)
                        router.push(`/channels/${mention.channel_id}`)
                      }}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={mention.sender_avatar_url ?? undefined} />
                          <AvatarFallback className="bg-violet-500/10 text-violet-600 font-semibold">
                            {mention.sender_first_name[0]}{mention.sender_last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-violet-500/10 border-2 border-background flex items-center justify-center">
                          <AtSign className="h-2.5 w-2.5 text-violet-500" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {mention.sender_first_name} {mention.sender_last_name}
                          <span className="font-normal text-muted-foreground"> mentioned you in </span>
                          <span className="text-violet-500">
                            <Hash className="h-3 w-3 inline-block" />
                            {mention.channel_name || "a channel"}
                          </span>
                        </p>
                        {mention.sender_user_tag && (
                          <p className="text-xs text-muted-foreground mt-0.5">@{mention.sender_user_tag}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTime(mention.created_at)}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs bg-violet-500 hover:bg-violet-600 text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            dismissMention(mention.id)
                            router.push(`/channels/${mention.channel_id}`)
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); dismissMention(mention.id) }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Announcements Section */}
            {showAnnouncements && unreadAnnouncements.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <div className="flex items-center gap-2 mb-3">
                    <Megaphone className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Announcements
                    </span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">{counts.announcements}</Badge>
                  </div>
                )}
                <div className="space-y-2">
                  {unreadAnnouncements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm hover:border-border/80 transition-all cursor-pointer border-l-4 border-l-amber-500"
                      onClick={() => {
                        dismissAnnouncement(announcement.id)
                        router.push(`/channels/${announcement.channel_id}`)
                      }}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={announcement.sender_avatar_url ?? undefined} />
                          <AvatarFallback className="bg-amber-500/10 text-amber-600 font-semibold">
                            {announcement.sender_first_name[0]}{announcement.sender_last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-amber-500/10 border-2 border-background flex items-center justify-center">
                          <Megaphone className="h-2.5 w-2.5 text-amber-500" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {announcement.sender_first_name} {announcement.sender_last_name}
                          <span className="font-normal text-muted-foreground"> posted an announcement in </span>
                          <span className="text-amber-600">
                            <Megaphone className="h-3 w-3 inline-block mr-0.5" />
                            {announcement.channel_name || "a channel"}
                          </span>
                        </p>
                        {announcement.sender_user_tag && (
                          <p className="text-xs text-muted-foreground mt-0.5">@{announcement.sender_user_tag}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTime(announcement.created_at)}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                          onClick={(e) => {
                            e.stopPropagation()
                            dismissAnnouncement(announcement.id)
                            router.push(`/channels/${announcement.channel_id}`)
                          }}
                        >
                          View
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); dismissAnnouncement(announcement.id) }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Messages Section */}
            {showMessages && unreadDmNotifs.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <div className="flex items-center gap-2 mb-3">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Direct Messages
                    </span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">{unreadDmCount}</Badge>
                  </div>
                )}
                <div className="space-y-2">
                  {unreadDmNotifs.map((dm) => (
                    <div
                      key={dm.id}
                      className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm hover:border-border/80 transition-all cursor-pointer border-l-4 border-l-primary"
                      onClick={() => {
                        dismissDm(dm.sender_id)
                        router.push(`/direct-messages?dm_user_id=${dm.sender_id}`)
                      }}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={dm.sender_avatar_url ?? undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {dm.sender_first_name[0]}{dm.sender_last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center">
                          <MessageCircle className="h-2.5 w-2.5 text-primary" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {dm.sender_first_name} {dm.sender_last_name}
                        </p>
                        {dm.sender_user_tag && (
                          <p className="text-xs text-muted-foreground truncate">@{dm.sender_user_tag}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{dm.last_message_preview}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTime(dm.latest_at)}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {dm.count > 1 && (
                          <Badge variant="destructive" className="text-xs">
                            {dm.count > 99 ? "99+" : dm.count}
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            dismissDm(dm.sender_id)
                            router.push(`/direct-messages?dm_user_id=${dm.sender_id}`)
                          }}
                        >
                          Reply
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => { e.stopPropagation(); dismissDm(dm.sender_id) }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Task Assignments Section */}
            {showTasks && unreadTasks.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Task Assignments
                    </span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">{counts.tasks}</Badge>
                  </div>
                )}
                <div className="space-y-2">
                  {unreadTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm hover:border-border/80 transition-all border-l-4 border-l-emerald-500"
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11">
                          <AvatarImage src={task.assigned_by_avatar_url ?? undefined} />
                          <AvatarFallback className="bg-emerald-500/10 text-emerald-600 font-semibold">
                            {task.assigned_by_first_name[0]}{task.assigned_by_last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500/10 border-2 border-background flex items-center justify-center">
                          <ClipboardList className="h-2.5 w-2.5 text-emerald-500" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {task.assigned_by_first_name} {task.assigned_by_last_name}
                          <span className="font-normal text-muted-foreground"> assigned you: </span>
                          <span className="text-emerald-600">{task.task_title}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTime(task.created_at)}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => dismissTaskAssignment(task.id)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Dismiss
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => dismissTaskAssignment(task.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* System Section */}
            {showSystem && systemNotifications.length > 0 && (
              <section>
                {activeTab === "all" && (
                  <div className="flex items-center gap-2 mb-3">
                    <Bell className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      System
                    </span>
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">{counts.system}</Badge>
                  </div>
                )}
                <div className="space-y-2">
                  {systemNotifications.map((notif) => {
                    const Icon = notif.icon
                    return (
                      <div
                        key={notif.id}
                        className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm hover:border-border/80 transition-all cursor-pointer border-l-4 border-l-amber-500"
                        onClick={notif.action}
                      >
                        <div className={cn("h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0", notif.bg)}>
                          <Icon className={cn("h-5 w-5", notif.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                        </div>
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs flex-shrink-0"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); notif.action() }}
                        >
                          {notif.actionLabel}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
