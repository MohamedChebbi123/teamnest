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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
  team_size: number
  org_id: number
  created_at: string
}

interface LiveNotification {
  id: string
  type: string
  message_id?: number
  sender_id?: number
  created_at?: string
  read: boolean
}

const getChannelIcon = (category: string, className: string) => {
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
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [expandedTeams, setExpandedTeams] = useState<Set<number>>(new Set())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)
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
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        // Get current user info
        const userResponse = await fetch("http://localhost:8000/profile", {
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
        const orgsResponse = await fetch("http://localhost:8000/get_org_for_admin_org", {
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
        const membersResponse = await fetch(`http://localhost:8000/organization/${organizationId}/members`, {
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

        
        const channelsResponse = await fetch(`http://localhost:8000/organization/${organizationId}/channels`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (channelsResponse.ok) {
          const channelsData = await channelsResponse.json()
          setChannels(channelsData)
        }

        // Fetch user teams
        const teamsResponse = await fetch('http://localhost:8000/user/teams', {
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
  }, [organizationId, router])

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
    const token = localStorage.getItem('access_token')
    if (!token) {
      return
    }

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

    const ws = new WebSocket(`ws://localhost:8000/ws/notifications?token=${encodeURIComponent(token)}`)

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
          created_at: payload.created_at,
          read: false,
        }

        setLiveNotifications((prev) => [nextNotification, ...prev].slice(0, 30))
        playNotificationSound()
        toast.info("New notification", {
          description: "You received a new direct message",
        })
      } catch (err) {
        console.error("Failed to parse notification event:", err)
      }
    }

    ws.onerror = (err) => {
      console.error("Notification websocket error:", err)
    }

    return () => {
      ws.close()
    }
  }, [soundEnabled, customSoundUrl])

  useEffect(() => {
    if (!isNotificationsOpen) {
      return
    }

    setLiveNotifications((prev) => prev.map((item) => ({ ...item, read: true })))
  }, [isNotificationsOpen])

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
      name: "Projects", 
      path: `/organization/${organizationId}/projects`, 
      icon: FolderKanban 
    },
    {
      name: "Direct Messages",
      path: "/direct-messages",
      icon: MessageCircle
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
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `http://localhost:8000/organization/${organizationId}/create_channel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(newChannel)
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Channel created successfully"
        })
        setChannels([...channels, data.channel])
        setIsDialogOpen(false)
        setNewChannel({ channel_name: "", channel_mode: "orgbased", channel_category: "text", description: "" })
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to create channel"
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
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `http://localhost:8000/channel/${editingChannel.channel_id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(editChannelData)
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Channel updated successfully"
        })
        // Update the channel in the list
        setChannels(channels.map(ch => 
          ch.channel_id === editingChannel.channel_id ? data.channel : ch
        ))
        setEditDialogOpen(false)
        setEditingChannel(null)
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to update channel"
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
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `http://localhost:8000/channel/${deletingChannel.channel_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Channel deleted successfully"
        })
        // Remove the channel from the list
        setChannels(channels.filter(ch => ch.channel_id !== deletingChannel.channel_id))
        setDeleteDialogOpen(false)
        setDeletingChannel(null)
        
        // If user is currently viewing this channel, redirect to org page
        if (pathname === `/channels/${deletingChannel.channel_id}`) {
          router.push(`/organization/${organizationId}`)
        }
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to delete channel"
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


  if (loading) {
    return (
      <aside 
        style={{ 
          width: isMobile ? '280px' : `${navbarWidth}px`,
          left: isMobile ? '0' : `var(--main-sidebar-width, ${MAIN_SIDEBAR_WIDTH}px)`
        }}
        className={cn(
          "fixed top-0 h-screen bg-background border-r flex items-center justify-center z-30",
          isMobile ? "-translate-x-full" : "hidden lg:block",
          isResizing ? 'select-none' : ''
        )}
      >
        <div
          onMouseDown={startResizing}
          className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-50"
        />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          {navbarWidth > 100 && <p className="text-sm text-muted-foreground">Loading...</p>}
        </div>
      </aside>
    )
  }

  if (!organization) {
    return null
  }

  return (
    <>
    {/* Set CSS variable for org navbar width */}
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
        "fixed top-0 h-screen bg-muted/35 border-r flex flex-col z-30 shadow-sm backdrop-blur-[1px] transition-transform duration-300",
        isMobile ? (isMobileNavOpen ? "translate-x-0" : "-translate-x-full") : "hidden lg:block",
        isResizing ? 'select-none' : ''
      )}
    >
      {/* Resize Handle - Hidden on mobile */}
      <div
        onMouseDown={startResizing}
        className="hidden lg:block absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-50"
      />

      {/* Toggle Button */}
      <button
        onClick={() => setNavbarWidth(navbarWidth > 100 ? 64 : 240)}
        className="absolute -right-3 top-6 bg-muted/60 border border-border rounded-full p-1 hover:bg-accent transition-colors shadow-md z-50"
      >
        {navbarWidth > 100 ? (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Organization Header */}
      <div className={cn("border-b", navbarWidth > 100 ? "p-4 space-y-3" : "p-2")}>
        {navbarWidth <= 100 ? (
          <div className="flex justify-center">
            <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
              <AvatarImage src={organization.organaization_picture} alt={organization.organization_name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                  <AvatarImage src={organization.organaization_picture} alt={organization.organization_name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <Building2 className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-sm truncate">{organization.organization_name}</h2>
                  <p className="text-xs text-muted-foreground">#{organization.organaization_tag}</p>
                  {organization.organization_plan && (
                    <Badge 
                      variant={organization.organization_plan === "pro" ? "default" : "secondary"}
                      className="mt-1 text-xs"
                    >
                      {organization.organization_plan.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>

              <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-8 w-8">
                    <Bell className="h-4 w-4" />
                    {unreadNotificationsCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 text-[10px]"
                      >
                        {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="px-2 py-1.5 text-sm font-medium">Notifications</div>
                  <DropdownMenuSeparator />
                  {liveNotifications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No notifications yet
                    </div>
                  ) : (
                    liveNotifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className="cursor-pointer items-start"
                        onClick={() => {
                          if (notification.sender_id) {
                            router.push(`/direct-messages?dm_user_id=${notification.sender_id}`)
                          }
                        }}
                      >
                        <div className="flex w-full flex-col gap-1 py-1">
                          <div className="flex items-center gap-2">
                            <Bell className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-medium">New message</span>
                            {!notification.read && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {notification.sender_id
                              ? `From user #${notification.sender_id}`
                              : "Direct message notification"}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {organization.organization_description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {organization.organization_description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Direct Messages Quick Access */}
      <div className={cn("border-b", navbarWidth > 100 ? "px-3 py-2" : "px-2 py-2")}>
        <input
          ref={soundInputRef}
          type="file"
          accept="audio/*"
          onChange={handleNotificationSoundSelected}
          className="hidden"
        />

        <div className={cn("flex items-center", navbarWidth > 100 ? "gap-2" : "justify-center")}>
          <Button
            variant="outline"
            onClick={() => router.push('/direct-messages')}
            title={navbarWidth <= 100 ? "Direct Messages" : undefined}
            className={cn(
              "relative h-9",
              navbarWidth > 100 ? "flex-1 justify-start gap-3" : "w-full justify-center px-0"
            )}
          >
            <MessageCircle className="h-4 w-4" />
            {navbarWidth > 100 && <span className="text-sm">Direct Messages</span>}
            {unreadNotificationsCount > 0 && (
              <span
                className={cn(
                  "absolute h-2.5 w-2.5 rounded-full bg-red-500",
                  navbarWidth > 100 ? "right-3" : "right-2 top-2"
                )}
              />
            )}
          </Button>

          {navbarWidth <= 100 && (
            <DropdownMenu open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative h-9 w-9">
                  <Bell className="h-4 w-4" />
                  {unreadNotificationsCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full px-1 text-[10px]"
                    >
                      {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <div className="px-2 py-1.5 text-sm font-medium">Notifications</div>
                <DropdownMenuSeparator />
                {liveNotifications.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  liveNotifications.map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="cursor-pointer items-start"
                      onClick={() => {
                        if (notification.sender_id) {
                          router.push(`/direct-messages?dm_user_id=${notification.sender_id}`)
                        }
                      }}
                    >
                      <div className="flex w-full flex-col gap-1 py-1">
                        <span className="text-sm font-medium">New message</span>
                        <span className="text-xs text-muted-foreground">
                          {notification.sender_id
                            ? `From user #${notification.sender_id}`
                            : "Direct message notification"}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {navbarWidth > 100 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="h-9 px-2 text-xs"
              title={soundEnabled ? "Mute notification sound" : "Enable notification sound"}
            >
              {soundEnabled ? "Sound: On" : "Sound: Off"}
            </Button>
          )}

          {navbarWidth > 100 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePickNotificationSound}
              className="h-9 px-2 text-xs"
              title={customSoundName ? `Current: ${customSoundName}` : "Choose notification sound"}
            >
              {customSoundName ? "Change Sound" : "Choose Sound"}
            </Button>
          )}
        </div>

        {navbarWidth > 100 && customSoundName && (
          <p className="mt-1 truncate px-1 text-[11px] text-muted-foreground" title={customSoundName}>
            Using: {customSoundName}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto space-y-1", navbarWidth > 100 ? "p-3" : "p-2")}>
        <div className="space-y-1">
          {navigationTabs
            .filter(canAccessTab)
            .map((tab) => {
              const Icon = tab.icon
              const active = isTabActive(tab.path)
              return (
                <Button
                  key={tab.name}
                  variant={active ? "secondary" : "ghost"}
                  onClick={() => router.push(tab.path)}
                  title={navbarWidth <= 100 ? tab.name : undefined}
                  className={cn(
                    "w-full h-9",
                    navbarWidth > 100 ? "justify-start gap-3" : "justify-center px-0",
                    active && "bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                >
                  <span className="relative inline-flex">
                    <Icon className="h-4 w-4" />
                    {tab.name === "Direct Messages" && unreadNotificationsCount > 0 && (
                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </span>
                  {navbarWidth > 100 && <span className="text-sm">{tab.name}</span>}
                </Button>
              )
            })}
        </div>

        {/* Channels Section */}
        <div className="pt-4 mt-4 border-t">
          {navbarWidth > 100 && (
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Channels
              </h3>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create Channel</DialogTitle>
                  <DialogDescription>
                    Add a new channel to your organization. Channels help organize conversations.
                  </DialogDescription>
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
                    <p className="text-xs text-muted-foreground">
                      3-50 characters. Letters, numbers, spaces, hyphens, underscores.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="channel_mode">Channel Mode</Label>
                    <select
                      id="channel_mode"
                      value={newChannel.channel_mode}
                      onChange={(e) => setNewChannel({ ...newChannel, channel_mode: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="announcement">Announcement</option>
                      <option value="orgbased">Organization Based</option>
                      <option value="teambased">Team Based</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="channel_category">Channel Category</Label>
                    <select
                      id="channel_category"
                      value={newChannel.channel_category}
                      onChange={(e) => setNewChannel({ ...newChannel, channel_category: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="text">Text</option>
                      <option value="voice">Voice</option>
                      <option value="video">Video</option>
                    </select>
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
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isCreatingChannel}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    onClick={handleCreateChannel}
                    disabled={isCreatingChannel}
                  >
                    {isCreatingChannel ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Channel"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          )}
          
          {navbarWidth <= 100 ? (
            <Button 
              variant="ghost" 
              size="icon"
              className="w-full h-9"
              onClick={() => setIsDialogOpen(true)}
              title="Create Channel"
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
          
          <div className="space-y-0.5">
            {channels.filter(channel => !channel.team_id).length === 0 ? (
              navbarWidth > 100 && (
                <p className="text-xs text-muted-foreground px-2 py-2">
                  No channels yet. Click + to create one.
                </p>
              )
            ) : (
              channels.filter(channel => !channel.team_id).map((channel) => (
                <div
                  key={channel.channel_id}
                  className={cn(
                    "flex items-center",
                    navbarWidth <= 100 ? "justify-center" : "gap-1"
                  )}
                >
                  <Button
                    variant="ghost"
                    title={navbarWidth <= 100 ? channel.channel_name : undefined}
                    className={cn(
                      "h-8",
                      navbarWidth <= 100 ? "w-full justify-center px-0" : "flex-1 justify-start gap-2 px-2"
                    )}
                    onClick={() => router.push(`/channels/${channel.channel_id}`)}
                  >
                    {getChannelIcon(channel.channel_category, "h-3.5 w-3.5 text-muted-foreground")}
                    {navbarWidth > 100 && <span className="text-sm truncate">{channel.channel_name}</span>}
                  </Button>
                  {navbarWidth > 100 && canEditDeleteChannel(channel) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditChannel(channel)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Channel
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(channel)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Channel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Teams Section */}
        <div className="pt-4 mt-4 border-t">
          {navbarWidth > 100 && (
            <div className="flex items-center justify-between mb-2 px-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                My Teams
              </h3>
            </div>
          )}
          
          <div className="space-y-0.5">
            {teams.length === 0 ? (
              navbarWidth > 100 && (
                <p className="text-xs text-muted-foreground px-2 py-2">
                  No teams enrolled yet.
                </p>
              )
            ) : (
              teams.map((team) => {
                const teamChannels = getTeamChannels(team.team_id)
                const isExpanded = expandedTeams.has(team.team_id)
                
                return (
                  <div key={team.team_id} className="space-y-0.5">
                    {/* Team Header */}
                    <div className="flex items-center">
                      {navbarWidth > 100 && teamChannels.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-6 flex-shrink-0"
                          onClick={() => toggleTeamExpansion(team.team_id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        title={navbarWidth <= 100 ? team.team_name : undefined}
                        className={cn(
                          "h-8 flex-1",
                          navbarWidth <= 100 ? "justify-center px-0" : "justify-start gap-2",
                          navbarWidth > 100 && teamChannels.length === 0 && "px-2"
                        )}
                        onClick={() => router.push(`/organization/${organizationId}/${team.team_id}`)}
                      >
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {navbarWidth > 100 && (
                          <>
                            <span className="text-sm truncate">{team.team_name}</span>
                            {teamChannels.length > 0 && (
                              <span className="text-xs text-muted-foreground ml-auto">
                                {teamChannels.length}
                              </span>
                            )}
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {/* Team Channels */}
                    {navbarWidth > 100 && isExpanded && teamChannels.length > 0 && (
                      <div className="ml-6 space-y-0.5">
                        {teamChannels.map((channel) => (
                          <div
                            key={channel.channel_id}
                            className="flex items-center gap-1"
                          >
                            <Button
                              variant="ghost"
                              className="h-7 flex-1 justify-start gap-2 px-2"
                              onClick={() => router.push(`/channels/${channel.channel_id}`)}
                            >
                              {getChannelIcon(channel.channel_category, "h-3 w-3 text-muted-foreground")}
                              <span className="text-xs truncate">{channel.channel_name}</span>
                            </Button>
                            {canEditDeleteChannel(channel) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleEditChannel(channel)}
                                    className="cursor-pointer"
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Channel
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteClick(channel)}
                                    className="cursor-pointer text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Channel
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
            )}
          </div>
        </div>
      </nav>

      {/* Edit Channel Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
            <DialogDescription>
              Update channel details.
            </DialogDescription>
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
              <p className="text-xs text-muted-foreground">
                3-50 characters. Letters, numbers, spaces, hyphens, underscores.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_channel_mode">Channel Mode</Label>
              <select
                id="edit_channel_mode"
                value={editChannelData.channel_mode}
                onChange={(e) => setEditChannelData({ ...editChannelData, channel_mode: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="announcement">Announcement</option>
                <option value="orgbased">Organization Based</option>
                <option value="teambased">Team Based</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_channel_category">Channel Category</Label>
              <select
                id="edit_channel_category"
                value={editChannelData.channel_category}
                onChange={(e) => setEditChannelData({ ...editChannelData, channel_category: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="text">Text</option>
                <option value="voice">Voice</option>
                <option value="video">Video</option>
              </select>
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
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setEditDialogOpen(false)}
              disabled={isEditingChannel}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleUpdateChannel}
              disabled={isEditingChannel}
            >
              {isEditingChannel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Channel"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Channel Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">#{deletingChannel?.channel_name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeletingChannel}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              onClick={handleDeleteChannel}
              disabled={isDeletingChannel}
            >
              {isDeletingChannel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Channel"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
    </>
  )
}