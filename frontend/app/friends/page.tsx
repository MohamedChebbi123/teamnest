"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar/page"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Users,
  UserPlus,
  Check,
  X,
  Loader2,
  MessageCircle,
  Search,
  Ban,
  ShieldOff,
} from "lucide-react"

import { toast } from "sonner"

interface Friend {
  friendship_id: number
  user_id: number
  first_name: string
  last_name: string
  user_tag: string | null
  avatar_url: string | null
  added_at: string
}

interface FriendRequest {
  request_id: number
  sender_id: number
  first_name: string
  last_name: string
  user_tag: string | null
  avatar_url: string | null
  sent_at: string
}

interface BlockedUser {
  block_id: number
  user_id: number
  first_name: string
  last_name: string
  user_tag: string | null
  avatar_url: string | null
  blocked_at: string
}

export default function FriendsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "add" | "blocked">("friends")
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [addTag, setAddTag] = useState("")
  const [sendingByTag, setSendingByTag] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const getToken = () => {
    const rawToken = localStorage.getItem("access_token") || localStorage.getItem("token")
    const token = rawToken?.replace(/^Bearer\s+/i, "")
    if (!token) {
      router.push("/auth/login")
      return null
    }
    return token
  }

  const fetchFriends = async () => {
    const token = getToken()
    if (!token) return

    try {
      const response = await fetch("http://localhost:8000/friends", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json().catch(() => [])
        const normalized = Array.isArray(data) ? data : Array.isArray(data?.friends) ? data.friends : []
        setFriends(normalized)
      } else if (response.status === 401) {
        router.push("/auth/login")
      } else {
        const data = await response.json().catch(() => null)
        toast.error("Failed to load friends", {
          description: data?.detail || "Unable to fetch friends list",
        })
      }
    } catch (error) {
      console.error("Error fetching friends:", error)
      toast.error("Network error", { description: "Could not reach server for friends list" })
    }
  }

  const fetchRequests = async () => {
    const token = getToken()
    if (!token) return

    try {
      const response = await fetch("http://localhost:8000/friends/requests", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json().catch(() => [])
        const normalized = Array.isArray(data) ? data : Array.isArray(data?.requests) ? data.requests : []
        setRequests(normalized)
      } else if (response.status === 401) {
        router.push("/auth/login")
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
    }
  }

  const fetchBlockedUsers = async () => {
    const token = getToken()
    if (!token) return

    try {
      const response = await fetch("http://localhost:8000/friends/blocked", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json().catch(() => [])
        const normalized = Array.isArray(data) ? data : Array.isArray(data?.blocked) ? data.blocked : []
        setBlockedUsers(normalized)
      } else if (response.status === 401) {
        router.push("/auth/login")
      }
    } catch (error) {
      console.error("Error fetching blocked users:", error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchFriends(), fetchRequests(), fetchBlockedUsers()])
      setLoading(false)
    }
    loadData()
  }, [])

  const handleRequestAction = async (requestId: number, action: "accepted" | "rejected") => {
    const token = getToken()
    if (!token) return

    setActionLoading(requestId)
    try {
      const response = await fetch(`http://localhost:8000/friends/request/${requestId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        toast.success(action === "accepted" ? "Friend request accepted!" : "Friend request rejected")
        setRequests((prev) => prev.filter((r) => r.request_id !== requestId))
        if (action === "accepted") {
          await fetchFriends()
        }
      } else {
        const data = await response.json().catch(() => null)
        toast.error("Failed", { description: data?.detail || "Something went wrong" })
      }
    } catch (error) {
      console.error("Error handling request:", error)
      toast.error("Error", { description: "Failed to process request" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveFriend = async (friendUserId: number) => {
    const token = getToken()
    if (!token) return

    setActionLoading(friendUserId)
    try {
      const response = await fetch(`http://localhost:8000/friends/${friendUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        toast.success("Friend removed")
        setFriends((prev) => prev.filter((f) => f.user_id !== friendUserId))
      } else {
        const data = await response.json().catch(() => null)
        toast.error("Failed", { description: data?.detail || "Something went wrong" })
      }
    } catch (error) {
      console.error("Error removing friend:", error)
      toast.error("Error", { description: "Failed to remove friend" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleBlockUser = async (userId: number) => {
    const token = getToken()
    if (!token) return

    setActionLoading(userId)
    try {
      const response = await fetch(`http://localhost:8000/friends/block/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        toast.success("User blocked")
        setFriends((prev) => prev.filter((f) => f.user_id !== userId))
        await fetchBlockedUsers()
      } else {
        const data = await response.json().catch(() => null)
        toast.error("Failed", { description: data?.detail || "Something went wrong" })
      }
    } catch (error) {
      console.error("Error blocking user:", error)
      toast.error("Error", { description: "Failed to block user" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnblockUser = async (userId: number) => {
    const token = getToken()
    if (!token) return

    setActionLoading(userId)
    try {
      const response = await fetch(`http://localhost:8000/friends/unblock/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        toast.success("User unblocked")
        setBlockedUsers((prev) => prev.filter((b) => b.user_id !== userId))
      } else {
        const data = await response.json().catch(() => null)
        toast.error("Failed", { description: data?.detail || "Something went wrong" })
      }
    } catch (error) {
      console.error("Error unblocking user:", error)
      toast.error("Error", { description: "Failed to unblock user" })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendByTag = async () => {
    const trimmed = addTag.trim()
    if (!trimmed) {
      toast.error("Enter a user tag")
      return
    }

    const token = getToken()
    if (!token) return

    setSendingByTag(true)
    try {
      const response = await fetch("http://localhost:8000/friends/request", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_tag: trimmed }),
      })

      if (response.ok) {
        toast.success("Friend request sent!")
        setAddTag("")
      } else {
        const data = await response.json().catch(() => null)
        toast.error("Failed", { description: data?.detail || "User not found" })
      }
    } catch (error) {
      console.error("Error sending request:", error)
      toast.error("Error", { description: "Failed to send friend request" })
    } finally {
      setSendingByTag(false)
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase() || "??"
  }

  const filteredFriends = friends.filter((f) => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return true
    return `${f.first_name} ${f.last_name}`.toLowerCase().includes(q) || f.user_tag?.toLowerCase().includes(q)
  })

  const tabs = [
    { key: "friends" as const, label: "Friends", count: friends.length, icon: Users },
    { key: "requests" as const, label: "Requests", count: requests.length, icon: UserPlus },
    { key: "add" as const, label: "Add Friend", count: null, icon: Search },
    { key: "blocked" as const, label: "Blocked", count: blockedUsers.length, icon: Ban },
  ]

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8 lg:p-12 max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Friends</h1>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border pb-3">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-muted-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <Badge
                      variant={activeTab === tab.key ? "secondary" : "outline"}
                      className="ml-1 h-5 min-w-[20px] flex items-center justify-center text-xs"
                    >
                      {tab.count}
                    </Badge>
                  )}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              {/* Friends List */}
              {activeTab === "friends" && (
                <div className="space-y-3">
                  {friends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                      <Users className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No friends yet</p>
                      <p className="text-sm text-muted-foreground/70">
                        Add friends by their tag or from the members sidebar
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="relative mb-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search friends..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      {filteredFriends.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">
                          No friends matching &quot;{searchQuery}&quot;
                        </p>
                      ) : (
                        filteredFriends.map((friend) => (
                          <div
                            key={friend.friendship_id}
                            className="flex items-center gap-4 p-4 rounded-xl border bg-card shadow-sm"
                          >
                            <Avatar className="h-12 w-12 border-2 border-background">
                              <AvatarImage src={friend.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(friend.first_name, friend.last_name)}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {friend.first_name} {friend.last_name}
                              </p>
                              {friend.user_tag && (
                                <p className="text-xs text-muted-foreground">@{friend.user_tag}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Send message"
                                onClick={() =>
                                  router.push(
                                    `/direct-messages?dm_user_id=${friend.user_id}&dm_name=${encodeURIComponent(
                                      `${friend.first_name} ${friend.last_name}`
                                    )}`
                                  )
                                }
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Block user"
                                disabled={actionLoading === friend.user_id}
                                onClick={() => handleBlockUser(friend.user_id)}
                              >
                                <Ban className="h-4 w-4 text-destructive" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Remove friend"
                                disabled={actionLoading === friend.user_id}
                                onClick={() => handleRemoveFriend(friend.user_id)}
                              >
                                {actionLoading === friend.user_id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Friend Requests */}
              {activeTab === "requests" && (
                <div className="space-y-3">
                  {requests.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                      <UserPlus className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No pending requests</p>
                    </div>
                  ) : (
                    requests.map((req) => (
                      <div
                        key={req.request_id}
                        className="flex items-center gap-4 p-4 rounded-xl border bg-card shadow-sm"
                      >
                        <Avatar className="h-12 w-12 border-2 border-background">
                          <AvatarImage src={req.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(req.first_name, req.last_name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {req.first_name} {req.last_name}
                          </p>
                          {req.user_tag && (
                            <p className="text-xs text-muted-foreground">@{req.user_tag}</p>
                          )}
                          <p className="text-xs text-muted-foreground/70">
                            Sent {new Date(req.sent_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            disabled={actionLoading === req.request_id}
                            onClick={() => handleRequestAction(req.request_id, "accepted")}
                          >
                            {actionLoading === req.request_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 mr-1" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading === req.request_id}
                            onClick={() => handleRequestAction(req.request_id, "rejected")}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Add Friend by Tag */}
              {activeTab === "add" && (
                <div className="max-w-md mx-auto">
                  <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                    <div className="text-center mb-2">
                      <UserPlus className="h-10 w-10 text-primary mx-auto mb-2" />
                      <h2 className="text-lg font-semibold">Add Friend</h2>
                      <p className="text-sm text-muted-foreground">
                        Enter their user tag to send a friend request
                      </p>
                    </div>
                    <Input
                      placeholder="Enter user tag"
                      value={addTag}
                      onChange={(e) => setAddTag(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendByTag()}
                      disabled={sendingByTag}
                    />
                    <Button
                      onClick={handleSendByTag}
                      className="w-full"
                      disabled={sendingByTag || !addTag.trim()}
                    >
                      {sendingByTag ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Send Friend Request
                    </Button>
                  </div>
                </div>
              )}

              {/* Blocked Users */}
              {activeTab === "blocked" && (
                <div className="space-y-3">
                  {blockedUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                      <ShieldOff className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">No blocked users</p>
                      <p className="text-sm text-muted-foreground/70">
                        Users you block won&apos;t be able to send you friend requests
                      </p>
                    </div>
                  ) : (
                    blockedUsers.map((blocked) => (
                      <div
                        key={blocked.block_id}
                        className="flex items-center gap-4 p-4 rounded-xl border bg-card shadow-sm"
                      >
                        <Avatar className="h-12 w-12 border-2 border-background">
                          <AvatarImage src={blocked.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {getInitials(blocked.first_name, blocked.last_name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {blocked.first_name} {blocked.last_name}
                          </p>
                          {blocked.user_tag && (
                            <p className="text-xs text-muted-foreground">@{blocked.user_tag}</p>
                          )}
                          <p className="text-xs text-muted-foreground/70">
                            Blocked {new Date(blocked.blocked_at).toLocaleDateString()}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          disabled={actionLoading === blocked.user_id}
                          onClick={() => handleUnblockUser(blocked.user_id)}
                        >
                          {actionLoading === blocked.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <ShieldOff className="h-4 w-4 mr-1" />
                          )}
                          Unblock
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
