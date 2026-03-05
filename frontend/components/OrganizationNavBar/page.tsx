"use client"

import { useState, useEffect } from "react"
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
  Settings,
  Loader2,
  Hash,
  Plus,
  ChevronLeft,
  ChevronRight,
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
  type: string
  description?: string
  org_id: number
  created_at: string
}

export default function OrganizationNavBar({ organizationId, onClose }: OrganizationNavBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null)
  const [userRole, setUserRole] = useState<string>("MEMBER")
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [newChannel, setNewChannel] = useState({
    channel_name: "",
    type: "text",
    description: ""
  })
  
  // Edit channel states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [editChannelData, setEditChannelData] = useState({
    channel_name: "",
    type: "text",
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
        setNewChannel({ channel_name: "", type: "text", description: "" })
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
      type: channel.type,
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
    // If channel type is "general", only owner can edit/delete
    if (channel.type === "general") {
      return organization?.owner_id === currentUserId
    }
    // For other channel types, any member can edit/delete
    return true
  }


  if (loading) {
    return (
      <aside className={cn(
        "fixed left-20 top-0 h-screen bg-background border-r flex items-center justify-center z-30 transition-all duration-300",
        isCollapsed ? "w-16" : "w-72"
      )}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          {!isCollapsed && <p className="text-sm text-muted-foreground">Loading...</p>}
        </div>
      </aside>
    )
  }

  if (!organization) {
    return null
  }

  return (
    <aside className={cn(
      "fixed left-20 top-0 h-screen bg-background border-r flex flex-col z-30 shadow-sm transition-all duration-300",
      isCollapsed ? "w-16" : "w-72"
    )}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-background border border-border rounded-full p-1 hover:bg-muted transition-colors shadow-md z-50"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Organization Header */}
      <div className={cn("border-b", isCollapsed ? "p-2" : "p-4 space-y-3")}>
        {isCollapsed ? (
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
            </div>

            {organization.organization_description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {organization.organization_description}
              </p>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 overflow-y-auto space-y-1", isCollapsed ? "p-2" : "p-3")}>
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
                  title={isCollapsed ? tab.name : undefined}
                  className={cn(
                    "w-full h-9",
                    isCollapsed ? "justify-center px-0" : "justify-start gap-3",
                    active && "bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {!isCollapsed && <span className="text-sm">{tab.name}</span>}
                </Button>
              )
            })}
        </div>

        {/* Channels Section */}
        <div className="pt-4 mt-4 border-t">
          {!isCollapsed && (
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
                    <Label htmlFor="type">Channel Type</Label>
                    <select
                      id="type"
                      value={newChannel.type}
                      onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="announcement">announcement</option>
                      <option value="orgbased">orgbased</option>
                      <option value="teambased">teambased</option>
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
          
          {isCollapsed ? (
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
            {channels.length === 0 ? (
              !isCollapsed && (
                <p className="text-xs text-muted-foreground px-2 py-2">
                  No channels yet. Click + to create one.
                </p>
              )
            ) : (
              channels.map((channel) => (
                <div
                  key={channel.channel_id}
                  className={cn(
                    "flex items-center",
                    isCollapsed ? "justify-center" : "gap-1"
                  )}
                >
                  <Button
                    variant="ghost"
                    title={isCollapsed ? channel.channel_name : undefined}
                    className={cn(
                      "h-8",
                      isCollapsed ? "w-full justify-center px-0" : "flex-1 justify-start gap-2 px-2"
                    )}
                    onClick={() => router.push(`/channels/${channel.channel_id}`)}
                  >
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    {!isCollapsed && <span className="text-sm truncate">{channel.channel_name}</span>}
                  </Button>
                  {!isCollapsed && canEditDeleteChannel(channel) && (
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
      </nav>

      {/* Edit Channel Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Channel</DialogTitle>
            <DialogDescription>
              Update channel details. {editingChannel?.type === "general" && "Only organization owners can edit general channels."}
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
              <Label htmlFor="edit_type">Channel Type</Label>
              <select
                id="edit_type"
                value={editChannelData.type}
                onChange={(e) => setEditChannelData({ ...editChannelData, type: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="text">Text</option>
                <option value="general">General</option>
                <option value="announcement">Announcement</option>
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
              {deletingChannel?.type === "general" && " Only organization owners can delete general channels."}
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
  )
}
