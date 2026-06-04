"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import UpgradeModal from "@/components/UpgradeModal"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Building2,
  LayoutDashboard,
  Users,
  FolderKanban,
  MessageCircle,
  Bell,
  Settings,
  Loader2,
  Hash,
  Volume2,
  VolumeX,
  Megaphone,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit,
  Trash2,
  Search,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { formatApiError } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { getAccessToken, hydrateAccessToken } from "@/lib/auth"

interface OrganizationNavBarProps {
  organizationId: string | number
  onClose?: () => void
}

interface OrganizationDetails {
  organization_id: number
  organization_name: string
  organaization_picture: string
  organaization_tag: string
  organization_plan?: string
  owner_id?: number
  organization_description?: string
}

interface Member {
  user_id: number
  first_name: string
  last_name: string
  profile_picture?: string
  role_user: string
}

interface Channel {
  channel_id: number
  channel_name: string
  channel_mode: string
  channel_category: string
  description?: string
  org_id: number
  team_id?: number | null
  created_at: string
}

interface Team {
  team_id: number
  team_name: string
  description?: string
  org_id: number
  created_at: string
}

interface LiveNotification {
  id: string
  type: string
  message_id?: number
  sender_id?: number
  channel_id?: number
  org_id?: number
  created_at?: string
  read: boolean
}

interface SearchResult {
  message_id: number
  message_content: string
  sent_at: string
  edited_at: string
  score: number
  channel: {
    channel_id: number
    channel_name: string
    channel_mode: string
    channel_category: string
    team_id: number | null
  }
  sender: {
    user_id: number
    first_name: string
    last_name: string
    avatar_url: string | null
    user_tag: string | null
  }
}

const getChannelIcon = (mode: string, category: string, className: string) => {
  if ((mode || "").toLowerCase() === "announcement") {
    return <Megaphone className={className} />
  }
  const isVoiceChannel = (category || "").toLowerCase() === "voice"
  return isVoiceChannel ? <Volume2 className={className} /> : <Hash className={className} />
}

export default function OrganizationNavBar({ organizationId, onClose }: OrganizationNavBarProps) {
  const MAIN_SIDEBAR_WIDTH = 80
  const router = useRouter()
  const pathname = usePathname()
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null)
  const [userRole, setUserRole] = useState<string>("MEMBER")
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)
  const [upgradeModal, setUpgradeModal] = useState<{ title: string; description: string } | null>(null)
  const [navbarWidth, setNavbarWidth] = useState(240)
  const [isResizing, setIsResizing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [customSoundUrl, setCustomSoundUrl] = useState<string | null>(null)
  const [customSoundName, setCustomSoundName] = useState("")
  const soundInputRef = useRef<HTMLInputElement | null>(null)
  const customSoundObjectUrlRef = useRef<string | null>(null)
  const [newChannel, setNewChannel] = useState({
    channel_name: "",
    channel_mode: "orgbased",
    channel_category: "text",
    description: ""
  })
  
  const minWidth = 64;
  const maxWidth = 400;
  
  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX - 80; // Subtract main sidebar width
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setNavbarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);
  
  // Edit channel states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [editChannelData, setEditChannelData] = useState({
    channel_name: "",
    channel_mode: "orgbased",
    channel_category: "text",
    description: ""
  })
  const [isEditingChannel, setIsEditingChannel] = useState(false)
  
  // Delete channel states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null)
  const [isDeletingChannel, setIsDeletingChannel] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = getAccessToken()
        if (!token) {
          router.push('/auth/login')
          return
        }

        // Get current user info
        const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        let userId: number | null = null
        if (userResponse.ok) {
          const userData = await userResponse.json()
          userId = userData.user_id
          setCurrentUserId(userId)
        }

        // Fetch all user organizations
        const orgsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_org_for_admin_org`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json()
          
          // Find current organization
          const currentOrg = orgsData.find((org: OrganizationDetails) => 
            org.organization_id === parseInt(organizationId as string)
          )
          
          if (currentOrg) {
            setOrganization(currentOrg)
          }
        }

        // Fetch members and user role
        const membersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/members`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          setMembers(membersData)
          if (userId !== null) {
            const currentUserMember = membersData.find((member: Member) => member.user_id === userId)
            if (currentUserMember) {
              setUserRole(currentUserMember.role_user)
            }
          }
        }

        
        const channelsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/channels`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json()
          setChannels(channelsData)
        }

        // Fetch user teams
        const teamsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()
          // Filter teams for current organization
          const orgTeams = teamsData.filter((team: Team) => team.org_id === parseInt(organizationId as string))
          setTeams(orgTeams)
        }

      } catch (error) {
        console.error('Error fetching organization data:', error)
        toast.error("Error", {
          description: "Failed to load organization details"
        })
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      fetchData()
    }
  }, [organizationId, router, refreshTick])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ organizationId?: string | number }>).detail
      if (detail && detail.organizationId !== undefined) {
        if (String(detail.organizationId) !== String(organizationId)) return
      }
      setRefreshTick((n) => n + 1)
    }
    window.addEventListener("org-sidebar-refresh", handler)
    return () => window.removeEventListener("org-sidebar-refresh", handler)
  }, [organizationId])

  useEffect(() => {
    return () => {
      if (customSoundObjectUrlRef.current) {
        URL.revokeObjectURL(customSoundObjectUrlRef.current)
      }
    }
  }, [])

  const handlePickNotificationSound = () => {
    soundInputRef.current?.click()
  }

  const handleNotificationSoundSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith("audio/")) {
      toast.error("Invalid file", {
        description: "Please choose an audio file",
      })
      return
    }

    if (customSoundObjectUrlRef.current) {
      URL.revokeObjectURL(customSoundObjectUrlRef.current)
    }

    const nextObjectUrl = URL.createObjectURL(file)
    customSoundObjectUrlRef.current = nextObjectUrl
    setCustomSoundUrl(nextObjectUrl)
    setCustomSoundName(file.name)

    toast.success("Notification sound updated", {
      description: file.name,
    })

    event.target.value = ""
  }

  useEffect(() => {
    let active = true
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let ws: WebSocket | null = null

    const playNotificationSound = () => {
      if (!soundEnabled || typeof window === "undefined") {
        return
      }

      try {
        if (customSoundUrl) {
          const audio = new Audio(customSoundUrl)
          audio.volume = 0.6
          void audio.play().catch((err) => {
            console.error("Failed to play custom notification sound:", err)
          })
          return
        }

        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext
        if (!AudioContextCtor) {
          return
        }

        const context = new AudioContextCtor()
        const oscillator = context.createOscillator()
        const gainNode = context.createGain()

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(880, context.currentTime)
        gainNode.gain.setValueAtTime(0.0001, context.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22)

        oscillator.connect(gainNode)
        gainNode.connect(context.destination)

        oscillator.start(context.currentTime)
        oscillator.stop(context.currentTime + 0.22)

        oscillator.onended = () => {
          context.close().catch(() => undefined)
        }
      } catch (err) {
        console.error("Failed to play notification sound:", err)
      }
    }

    const connect = (token: string) => {
      if (ws && ws.readyState === WebSocket.OPEN) return

      ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/notifications?token=${encodeURIComponent(token)}`)

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          if (parsed?.type !== "new_notification") {
            return
          }

          const payload = parsed.notification ?? {}
          const nextNotification: LiveNotification = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            type: String(payload.type ?? "direct_message"),
            message_id: payload.message_id,
            sender_id: payload.sender_id,
            channel_id: payload.channel_id,
            org_id: payload.org_id,
            created_at: payload.created_at,
            read: false,
          }

          setLiveNotifications((prev) => [nextNotification, ...prev].slice(0, 30))
          playNotificationSound()

          if (pathname === "/notifications") {
            router.refresh()
          }

          if (nextNotification.type === "channel_mention") {
            const sender = members.find((m) => m.user_id === nextNotification.sender_id)
            const channel = channels.find((c) => c.channel_id === nextNotification.channel_id)
            const senderName = sender ? `${sender.first_name} ${sender.last_name}` : "Someone"
            const channelName = channel ? `#${channel.channel_name}` : "a channel"
            toast.info(`${senderName} mentioned you`, { description: `In ${channelName}` })
          } else if (nextNotification.type === "channel_announcement") {
            const sender = members.find((m) => m.user_id === nextNotification.sender_id)
            const channel = channels.find((c) => c.channel_id === nextNotification.channel_id)
            const senderName = sender ? `${sender.first_name} ${sender.last_name}` : "Someone"
            const channelName = channel ? `#${channel.channel_name}` : "an announcement channel"
            toast.info(`New announcement from ${senderName}`, { description: `In ${channelName}` })
          } else {
            toast.info("New notification", { description: "You received a new direct message" })
          }
        } catch (err) {
          console.error("Failed to parse notification event:", err)
        }
      }

      ws.onerror = () => {
        // Browser WebSocket errors never expose details — silence the noise
      }

      ws.onclose = () => {
        reconnectTimeout = setTimeout(() => connect(token), 3000)
      }
    }

    const init = async () => {
      const token = getAccessToken() ?? await hydrateAccessToken()
      if (!active || !token) return
      connect(token)
    }

    void init()

    return () => {
      active = false
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      ws?.close()
    }
  }, [soundEnabled, customSoundUrl])

  useEffect(() => {
    if (!isNotificationsOpen) {
      return
    }

    setLiveNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
  }, [isNotificationsOpen])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setSearchError(null)
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsSearching(true)
      setSearchError(null)
      try {
        const token = getAccessToken()
        if (!token) {
          router.push('/auth/login')
          return
        }
        const url = `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/search/messages?q=${encodeURIComponent(trimmed)}&top_k=20`
        const response = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!response.ok) {
          const text = await response.text()
          let detail = "Search failed"
          try { detail = formatApiError(JSON.parse(text)?.detail, detail) } catch {}
          setSearchResults([])
          setSearchError(detail)
          return
        }
        const data = await response.json()
        setSearchResults(Array.isArray(data?.results) ? data.results : [])
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setSearchError("Search failed")
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [searchQuery, organizationId, router])

  useEffect(() => {
    const channelMatch = pathname.match(/^\/channels\/(\d+)$/)
    if (!channelMatch) {
      return
    }

    const openedChannelId = Number(channelMatch[1])
    setLiveNotifications((prev) => prev.map((item) => {
      if ((item.type === "channel_mention" || item.type === "channel_announcement") && item.channel_id === openedChannelId) {
        return { ...item, read: true }
      }
      return item
    }))
  }, [pathname])

  const navigationTabs = [
    {
      name: "Overview",
      path: `/organization/${organizationId}`,
      icon: LayoutDashboard
    },
    {
      name: "Teams",
      path: `/organization/${organizationId}/teams`,
      icon: Users
    },
 
    {
      name: "Settings",
      path: `/organization/${organizationId}/settings`,
      icon: Settings,
      adminOnly: true
    }
  ]

  const isTabActive = (path: string) => {
    return pathname === path
  }

  const canAccessTab = (tab: any) => {
    if (tab.adminOnly) {
      return userRole === "OWNER" || userRole === "ADMIN"
    }
    return true
  }

  const unreadNotificationsCount = liveNotifications.filter((item) => !item.read).length
  const unreadMentionChannelIds = new Set(
    liveNotifications
      .filter((item) => !item.read && (item.type === "channel_mention" || item.type === "channel_announcement") && typeof item.channel_id === "number")
      .map((item) => item.channel_id as number)
  )

  const toggleTeamExpansion = (teamId: number) => {
    const newExpanded = new Set(expandedTeams)
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId)
    } else {
      newExpanded.add(teamId)
    }
    setExpandedTeams(newExpanded)
  }

  const getTeamChannels = (teamId: number) => {
    return channels.filter(channel => channel.team_id === teamId)
  }

  const handleCreateChannel = async () => {
    if (!newChannel.channel_name.trim()) {
      toast.error("Error", {
        description: "Channel name is required"
      })
      return
    }

    setIsCreatingChannel(true)
    try {
      const token = getAccessToken()
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/create_channel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(newChannel)
        }
      )

      const text = await response.text()
      let data: any = null
      try { data = JSON.parse(text) } catch {}

      if (response.ok) {
        toast.success("Success", {
          description: "Channel created successfully"
        })
        setChannels([...channels, data.channel])
        setIsDialogOpen(false)
        setNewChannel({ channel_name: "", channel_mode: "orgbased", channel_category: "text", description: "" })
      } else if (response.status === 403) {
        setIsDialogOpen(false)
        setUpgradeModal({
          title: "Channel limit reached",
          description: formatApiError(data?.detail, "Upgrade to Pro for unlimited channels."),
        })
      } else {
        toast.error("Error", {
          description: formatApiError(data?.detail, "Failed to create channel")
        })
      }
    } catch (error) {
      console.error('Error creating channel:', error)
      toast.error("Error", {
        description: "An error occurred while creating the channel"
      })
    } finally {
      setIsCreatingChannel(false)
    }
  }

  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel)
    setEditChannelData({
      channel_name: channel.channel_name,
      channel_mode: channel.channel_mode,
      channel_category: channel.channel_category,
      description: channel.description || ""
    })
    setEditDialogOpen(true)
  }

  const handleUpdateChannel = async () => {
    if (!editChannelData.channel_name.trim()) {
      toast.error("Error", {
        description: "Channel name is required"
      })
      return
    }

    if (!editingChannel) return

    setIsEditingChannel(true)
    try {
      const token = getAccessToken()
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/channel/${editingChannel.channel_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(editChannelData)
        }
      )

      const text = await response.text()
      let data: any = null
      try { data = JSON.parse(text) } catch {}

      if (response.ok) {
        toast.success("Success", {
          description: "Channel updated successfully"
        })
        setChannels(channels.map(ch =>
          ch.channel_id === editingChannel.channel_id ? data.channel : ch
        ))
        setEditDialogOpen(false)
        setEditingChannel(null)
      } else {
        toast.error("Error", {
          description: formatApiError(data?.detail, "Failed to update channel")
        })
      }
    } catch (error) {
      console.error('Error updating channel:', error)
      toast.error("Error", {
        description: "An error occurred while updating the channel"
      })
    } finally {
      setIsEditingChannel(false)
    }
  }

  const handleDeleteClick = (channel: Channel) => {
    setDeletingChannel(channel)
    setDeleteDialogOpen(true)
  }

  const handleDeleteChannel = async () => {
    if (!deletingChannel) return

    setIsDeletingChannel(true)
    try {
      const token = getAccessToken()
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/channel/${deletingChannel.channel_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      const text = await response.text()
      let data: any = null
      try { data = JSON.parse(text) } catch {}

      if (response.ok) {
        toast.success("Success", {
          description: "Channel deleted successfully"
        })
        setChannels(channels.filter(ch => ch.channel_id !== deletingChannel.channel_id))
        setDeleteDialogOpen(false)
        setDeletingChannel(null)

        if (pathname === `/channels/${deletingChannel.channel_id}`) {
          router.push(`/organization/${organizationId}`)
        }
      } else {
        toast.error("Error", {
          description: formatApiError(data?.detail, "Failed to delete channel")
        })
      }
    } catch (error) {
      console.error('Error deleting channel:', error)
      toast.error("Error", {
        description: "An error occurred while deleting the channel"
      })
    } finally {
      setIsDeletingChannel(false)
    }
  }

  const canEditDeleteChannel = (channel: Channel) => {
    // For organization-level channels (no team_id), only admins and owners can edit/delete
    if (!channel.team_id) {
      return userRole === "OWNER" || userRole === "ADMIN"
    }
    // For team-level channels, show edit/delete options
    // Backend will enforce actual permissions based on team roles
    return true
  }


  const isExpanded = navbarWidth > 100

  const resolveNotificationText = (notification: LiveNotification) => {
    if (notification.type === "channel_mention") {
      const sender = members.find((m) => m.user_id === notification.sender_id)
      const channel = channels.find((c) => c.channel_id === notification.channel_id)
      const senderName = sender ? `${sender.first_name} ${sender.last_name}` : "Someone"
      const channelName = channel ? `#${channel.channel_name}` : "a channel"
      return { title: `${senderName} mentioned you`, subtitle: `In ${channelName}` }
    }
    if (notification.type === "channel_announcement") {
      const sender = members.find((m) => m.user_id === notification.sender_id)
      const channel = channels.find((c) => c.channel_id === notification.channel_id)
      const senderName = sender ? `${sender.first_name} ${sender.last_name}` : "Someone"
      const channelName = channel ? `#${channel.channel_name}` : "an announcement channel"
      return { title: `New announcement from ${senderName}`, subtitle: `In ${channelName}` }
    }
    return {
      title: "New message",
      subtitle: notification.sender_id ? `From user #${notification.sender_id}` : "Direct message notification",
    }
  }

  const NotificationList = ({ notifications }: { notifications: LiveNotification[] }) => (
    <>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-3 py-8">
          <Bell className="h-7 w-7 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        notifications.map((notification) => (
          <DropdownMenuItem
            key={notification.id}
            className={cn("cursor-pointer px-3 py-2.5 gap-2.5", !notification.read && "bg-primary/5")}
            onClick={() => {
              if ((notification.type === "channel_mention" || notification.type === "channel_announcement") && notification.channel_id) {
                router.push(`/channels/${notification.channel_id}`)
                return
              }
              if (notification.sender_id) {
                router.push(`/direct-messages?dm_user_id=${notification.sender_id}`)
              }
            }}
          >
            <div className={cn(
              "mt-0.5 rounded-full p-1.5 flex-shrink-0",
              notification.type === "channel_mention" ? "bg-purple-500/10"
                : notification.type === "channel_announcement" ? "bg-amber-500/10"
                : "bg-blue-500/10"
            )}>
              {notification.type === "channel_mention"
                ? <Hash className="h-3 w-3 text-purple-500" />
                : notification.type === "channel_announcement"
                  ? <Megaphone className="h-3 w-3 text-amber-500" />
                  : <MessageCircle className="h-3 w-3 text-blue-500" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {resolveNotificationText(notification).title}
                </span>
                {!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
              </div>
              <span className="text-xs text-muted-foreground">
                {resolveNotificationText(notification).subtitle}
              </span>
            </div>
          </DropdownMenuItem>
        ))
      )}
    </>
  )

  if (loading) {
    return (
      <TooltipProvider>
        <aside
          style={{
            width: isMobile ? '280px' : `${navbarWidth}px`,
            left: isMobile ? '0' : `var(--main-sidebar-width, ${MAIN_SIDEBAR_WIDTH}px)`
          }}
          className={cn(
            "fixed top-0 h-screen bg-sidebar border-r flex items-center justify-center z-30",
            isMobile ? "-translate-x-full" : "hidden lg:flex",
            isResizing ? 'select-none' : ''
          )}
        >
          <div onMouseDown={startResizing} className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 transition-colors z-50" />
          <div className="flex flex-col items-center gap-2.5">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            {isExpanded && <p className="text-xs text-muted-foreground">Loading...</p>}
          </div>
        </aside>
      </TooltipProvider>
    )
  }

  if (!organization) {
    return null
  }

  return (
    <TooltipProvider delayDuration={300}>
      <>
      <style jsx global>{`
        :root {
          --org-navbar-width: ${navbarWidth}px;
        }
      `}</style>

      <aside
        style={{
          width: isMobile ? '280px' : `${navbarWidth}px`,
          left: isMobile ? '0' : `var(--main-sidebar-width, ${MAIN_SIDEBAR_WIDTH}px)`
        }}
        className={cn(
          "fixed top-0 h-screen bg-sidebar border-r flex flex-col z-30 transition-transform duration-300",
          isMobile ? (isMobileNavOpen ? "translate-x-0" : "-translate-x-full") : "hidden lg:flex",
          isResizing ? 'select-none' : ''
        )}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/40 transition-colors z-50"
        />

        {/* Collapse Toggle */}
        <button
          onClick={() => setNavbarWidth(navbarWidth > 100 ? 64 : 240)}
          className="absolute -right-3.5 top-6 bg-background border border-border rounded-full p-1.5 hover:bg-accent hover:border-primary/30 transition-all shadow-sm z-50"
        >
          {isExpanded
            ? <ChevronLeft className="h-3 w-3 text-muted-foreground" />
            : <ChevronRight className="h-3 w-3 text-muted-foreground" />
          }
        </button>

        {/* Organization Header */}
        <div className={cn("border-b", isExpanded ? "p-4 space-y-2" : "p-2 py-3")}>
          {!isExpanded ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-9 w-9 ring-2 ring-background shadow-sm cursor-pointer">
                    <AvatarImage src={organization.organaization_picture} alt={organization.organization_name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      <Building2 className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">{organization.organization_name}</TooltipContent>
              </Tooltip>
              <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-8 w-8">
                    <Bell className="h-4 w-4" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <div className="px-3 py-2 text-sm font-semibold">Notifications</div>
                  <DropdownMenuSeparator />
                  <NotificationList notifications={liveNotifications} />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm flex-shrink-0">
                  <AvatarImage src={organization.organaization_picture} alt={organization.organization_name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="font-semibold text-sm truncate leading-tight">{organization.organization_name}</h2>
                    {organization.organization_plan && (
                      <Badge
                        variant={organization.organization_plan === "pro" ? "default" : "secondary"}
                        className="text-[10px] h-4 px-1.5 flex-shrink-0"
                      >
                        {organization.organization_plan.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">#{organization.organaization_tag}</p>
                </div>
                <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative h-7 w-7 flex-shrink-0">
                      <Bell className="h-3.5 w-3.5" />
                      {unreadNotificationsCount > 0 && (
                        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive ring-1 ring-sidebar" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="px-3 py-2 text-sm font-semibold">Notifications</div>
                    <DropdownMenuSeparator />
                    <NotificationList notifications={liveNotifications} />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {organization.organization_description && (
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {organization.organization_description}
                </p>
              )}
            </>
          )}
        </div>

        {/* Global semantic search */}
        {isExpanded && (
          <div className="border-b p-3">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (!searchOpen) setSearchOpen(true)
                    }}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Search messages..."
                    className="h-8 pl-8 pr-2 text-xs"
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[320px] p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="px-3 py-2 border-b flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Semantic search</span>
                  {isSearching && <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <ScrollArea className="max-h-80">
                  <div className="py-1">
                    {searchQuery.trim().length < 2 ? (
                      <p className="px-3 py-6 text-xs text-muted-foreground text-center">
                        Type at least 2 characters to search across the organization.
                      </p>
                    ) : searchError ? (
                      <p className="px-3 py-6 text-xs text-destructive text-center">{searchError}</p>
                    ) : !isSearching && searchResults.length === 0 ? (
                      <p className="px-3 py-6 text-xs text-muted-foreground text-center">No matches found.</p>
                    ) : (
                      searchResults.map((result) => {
                        const senderName = `${result.sender.first_name} ${result.sender.last_name}`.trim() || "Unknown"
                        const initials = ((result.sender.first_name?.[0] ?? "") + (result.sender.last_name?.[0] ?? "")).toUpperCase() || "?"
                        return (
                          <button
                            key={result.message_id}
                            onClick={() => {
                              setSearchOpen(false)
                              router.push(`/channels/${result.channel.channel_id}`)
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-accent flex items-start gap-2.5 transition-colors"
                          >
                            <Avatar className="h-7 w-7 flex-shrink-0">
                              <AvatarImage src={result.sender.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <span className="font-medium text-foreground truncate">{senderName}</span>
                                <span>in</span>
                                <span className="inline-flex items-center gap-0.5 truncate">
                                  {getChannelIcon(result.channel.channel_mode, result.channel.channel_category, "h-3 w-3")}
                                  <span className="truncate">{result.channel.channel_name}</span>
                                </span>
                              </div>
                              <p className="text-xs text-foreground/80 line-clamp-2 mt-0.5">
                                {result.message_content}
                              </p>
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* DM + Sound Controls */}
        <div className={cn("border-b", isExpanded ? "p-3" : "p-2")}>
          <input
            ref={soundInputRef}
            type="file"
            accept="audio/*"
            onChange={handleNotificationSoundSelected}
            className="hidden"
          />
          {isExpanded ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1 px-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSoundEnabled((prev) => !prev)}
                      className="h-7 w-7 flex-shrink-0"
                    >
                      {soundEnabled
                        ? <Volume2 className="h-3.5 w-3.5" />
                        : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                      }
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{soundEnabled ? "Mute notifications" : "Unmute notifications"}</TooltipContent>
                </Tooltip>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePickNotificationSound}
                  className="h-7 flex-1 justify-start px-2 text-xs text-muted-foreground hover:text-foreground truncate"
                  title={customSoundName ? `Current: ${customSoundName}` : "Choose notification sound"}
                >
                  <span className="truncate">{customSoundName || "Default sound"}</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSoundEnabled((prev) => !prev)} className="h-9 w-9">
                    {soundEnabled
                      ? <Volume2 className="h-4 w-4" />
                      : <VolumeX className="h-4 w-4 text-muted-foreground" />
                    }
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{soundEnabled ? "Mute notifications" : "Unmute notifications"}</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className={cn("space-y-0.5", isExpanded ? "p-3" : "p-2")}>
            {/* Main Nav Tabs */}
            <div className="space-y-0.5">
              {navigationTabs.filter(canAccessTab).map((tab) => {
                const Icon = tab.icon
                const active = isTabActive(tab.path)
                return isExpanded ? (
                  <Button
                    key={tab.name}
                    variant="ghost"
                    onClick={() => router.push(tab.path)}
                    className={cn(
                      "w-full h-9 justify-start gap-3 px-3 text-sm font-normal",
                      active
                        ? "bg-primary/10 text-primary font-medium hover:bg-primary/15"
                        : "text-foreground/70 hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                    {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Button>
                ) : (
                  <Tooltip key={tab.name}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        onClick={() => router.push(tab.path)}
                        className={cn(
                          "w-full h-9 justify-center px-0",
                          active
                            ? "bg-primary/10 text-primary hover:bg-primary/15"
                            : "text-foreground/70 hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{tab.name}</TooltipContent>
                  </Tooltip>
                )
              })}
            </div>

            {/* Channels Section */}
            <div className="mt-4">
              <Separator className="mb-3" />
              {isExpanded ? (
                <div className="flex items-center justify-between mb-1 px-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Channels</span>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-5 w-5 rounded-sm">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Create Channel</DialogTitle>
                        <DialogDescription>Add a new channel to your organization.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="channel_name">Channel Name</Label>
                          <Input
                            id="channel_name"
                            placeholder="e.g., general, announcements"
                            value={newChannel.channel_name}
                            onChange={(e) => setNewChannel({ ...newChannel, channel_name: e.target.value })}
                            maxLength={50}
                          />
                          <p className="text-xs text-muted-foreground">3-50 characters.</p>
                        </div>
                        <div className="grid gap-2">
                          <Label>Channel Mode</Label>
                          <Select value={newChannel.channel_mode} onValueChange={(v) => setNewChannel({ ...newChannel, channel_mode: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="announcement">Announcement</SelectItem>
                              <SelectItem value="orgbased">Organization Based</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>Channel Category</Label>
                          <Select value={newChannel.channel_category} onValueChange={(v) => setNewChannel({ ...newChannel, channel_category: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="voice">Voice</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Input
                            id="description"
                            placeholder="What is this channel about?"
                            value={newChannel.description}
                            onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isCreatingChannel}>Cancel</Button>
                        <Button onClick={handleCreateChannel} disabled={isCreatingChannel}>
                          {isCreatingChannel ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Channel"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-full h-8 mb-1" onClick={() => setIsDialogOpen(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Create Channel</TooltipContent>
                </Tooltip>
              )}

              <div className="space-y-0.5">
                {channels.filter(channel => !channel.team_id).length === 0
                  ? isExpanded && <p className="text-xs text-muted-foreground px-2 py-2">No channels yet.</p>
                  : channels.filter(channel => !channel.team_id).map((channel) =>
                    isExpanded ? (
                      <div key={channel.channel_id} className="group flex items-center gap-1">
                        <Button
                          variant="ghost"
                          className={cn(
                            "flex-1 h-8 justify-start gap-2 px-2 font-normal text-foreground/70 hover:text-foreground hover:bg-accent",
                            pathname === `/channels/${channel.channel_id}` && "bg-accent text-foreground"
                          )}
                          onClick={() => router.push(`/channels/${channel.channel_id}`)}
                        >
                          <span className="relative inline-flex flex-shrink-0">
                            {getChannelIcon(channel.channel_mode, channel.channel_category, "h-3.5 w-3.5")}
                            {unreadMentionChannelIds.has(channel.channel_id) && (
                              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                            )}
                          </span>
                          <span className="text-sm truncate">{channel.channel_name}</span>
                        </Button>
                        {canEditDeleteChannel(channel) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditChannel(channel)} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />Edit Channel
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteClick(channel)} className="cursor-pointer text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />Delete Channel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ) : (
                      <Tooltip key={channel.channel_id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full h-8 justify-center px-0 text-foreground/70 hover:text-foreground hover:bg-accent"
                            onClick={() => router.push(`/channels/${channel.channel_id}`)}
                          >
                            <span className="relative inline-flex">
                              {getChannelIcon(channel.channel_mode, channel.channel_category, "h-3.5 w-3.5")}
                              {unreadMentionChannelIds.has(channel.channel_id) && (
                                <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                              )}
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">{channel.channel_name}</TooltipContent>
                      </Tooltip>
                    )
                  )
                }
              </div>
            </div>

            {/* Teams Section */}
            <div className="mt-4">
              <Separator className="mb-3" />
              {isExpanded && (
                <div className="flex items-center justify-between mb-1 px-2">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">My Teams</span>
                </div>
              )}
              <div className="space-y-0.5">
                {teams.length === 0
                  ? isExpanded && <p className="text-xs text-muted-foreground px-2 py-2">No teams enrolled yet.</p>
                  : teams.map((team) => {
                      const teamChannels = getTeamChannels(team.team_id)
                      const isTeamExpanded = expandedTeams.has(team.team_id)
                      return (
                        <div key={team.team_id} className="space-y-0.5">
                          {isExpanded ? (
                            <div className="flex items-center gap-1">
                              {teamChannels.length > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-6 flex-shrink-0"
                                  onClick={() => toggleTeamExpansion(team.team_id)}
                                >
                                  {isTeamExpanded
                                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  }
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                className={cn(
                                  "h-8 flex-1 justify-start gap-2 font-normal text-foreground/70 hover:text-foreground hover:bg-accent",
                                  teamChannels.length === 0 && "px-2"
                                )}
                                onClick={() => router.push(`/organization/${organizationId}/${team.team_id}`)}
                              >
                                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="text-sm truncate">{team.team_name}</span>
                                {teamChannels.length > 0 && (
                                  <span className="text-xs text-muted-foreground ml-auto">{teamChannels.length}</span>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="w-full h-8 justify-center px-0 text-foreground/70 hover:text-foreground hover:bg-accent"
                                  onClick={() => router.push(`/organization/${organizationId}/${team.team_id}`)}
                                >
                                  <Users className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="right">{team.team_name}</TooltipContent>
                            </Tooltip>
                          )}
                          {isExpanded && isTeamExpanded && teamChannels.length > 0 && (
                            <div className="ml-6 space-y-0.5">
                              {teamChannels.map((channel) => (
                                <div key={channel.channel_id} className="group flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    className={cn(
                                      "h-7 flex-1 justify-start gap-2 px-2 font-normal text-foreground/70 hover:text-foreground hover:bg-accent",
                                      pathname === `/channels/${channel.channel_id}` && "bg-accent text-foreground"
                                    )}
                                    onClick={() => router.push(`/channels/${channel.channel_id}`)}
                                  >
                                    <span className="relative inline-flex flex-shrink-0">
                                      {getChannelIcon(channel.channel_mode, channel.channel_category, "h-3 w-3")}
                                      {unreadMentionChannelIds.has(channel.channel_id) && (
                                        <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-destructive" />
                                      )}
                                    </span>
                                    <span className="text-xs truncate">{channel.channel_name}</span>
                                  </Button>
                                  {canEditDeleteChannel(channel) && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="h-3 w-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEditChannel(channel)} className="cursor-pointer">
                                          <Edit className="mr-2 h-4 w-4" />Edit Channel
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDeleteClick(channel)} className="cursor-pointer text-destructive focus:text-destructive">
                                          <Trash2 className="mr-2 h-4 w-4" />Delete Channel
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                }
              </div>
            </div>
          </nav>
        </ScrollArea>

        {/* Edit Channel Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Channel</DialogTitle>
              <DialogDescription>Update channel details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_channel_name">Channel Name</Label>
                <Input
                  id="edit_channel_name"
                  placeholder="e.g., general, announcements"
                  value={editChannelData.channel_name}
                  onChange={(e) => setEditChannelData({ ...editChannelData, channel_name: e.target.value })}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground">3-50 characters.</p>
              </div>
              <div className="grid gap-2">
                <Label>Channel Mode</Label>
                <Select value={editChannelData.channel_mode} onValueChange={(v) => setEditChannelData({ ...editChannelData, channel_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="orgbased">Organization Based</SelectItem>
                    <SelectItem value="teambased">Team Based</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Channel Category</Label>
                <Select value={editChannelData.channel_category} onValueChange={(v) => setEditChannelData({ ...editChannelData, channel_category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="voice">Voice</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_description">Description (Optional)</Label>
                <Input
                  id="edit_description"
                  placeholder="What is this channel about?"
                  value={editChannelData.description}
                  onChange={(e) => setEditChannelData({ ...editChannelData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isEditingChannel}>Cancel</Button>
              <Button onClick={handleUpdateChannel} disabled={isEditingChannel}>
                {isEditingChannel ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : "Update Channel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Channel Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Channel</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <span className="font-semibold">#{deletingChannel?.channel_name}</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeletingChannel}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteChannel} disabled={isDeletingChannel}>
                {isDeletingChannel ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete Channel"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </aside>
      <UpgradeModal
        open={!!upgradeModal}
        onClose={() => setUpgradeModal(null)}
        title={upgradeModal?.title ?? ""}
        description={upgradeModal?.description ?? ""}
        upgradeUrl={`/organization/${organizationId}/upgrade`}
      />
      </>
    </TooltipProvider>
  )
}