"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { 
  Users,
  Loader2,
  ClipboardList,
  ArrowLeft,
  Edit,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Check,
  X,
  UserMinus,
  Hash,
  Plus,
  Mic,
  Video,
  Paperclip,
  Megaphone,
} from "lucide-react"
import { toast } from "sonner"
import OrganizationNavBar from "@/components/OrganizationNavBar/page"
import MembersSidebar from "@/components/MembersSidebar/page"
import UpgradeModal from "@/components/UpgradeModal"
import PdfViewerModal from "@/components/PdfViewerModal"
import Sidebar from "@/components/Sidebar/page"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
interface TeamDetails {
  team_id: number
  team_name: string
  description: string
  team_size: number
  org_id: number
  created_at: string
}

interface OrganizationMember {
  user_id: number
  first_name: string
  last_name: string
  email: string
  role_user: string
}

interface TeamMember {
  user_id: number
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  user_tag: string | null
  phone_number: string | null
  country: string | null
  role: string
  permissions: {
    can_create_channels: boolean
    can_send_messages: boolean
    can_delete_messages: boolean
    can_manage_roles: boolean
    can_kick_members: boolean
    can_make_announcement: boolean
    can_manage_tasks : Boolean
  } | null
}

interface Channel {
  channel_id: number
  channel_name: string
  channel_mode: string
  channel_category: string
  description: string | null
  team_id: number
  org_id: number
  created_at: string
}

interface TeamChannelFile {
  id: number
  file_name: string
  file_url: string
  file_size: number
  sent_at: string
  channel_id: number
  channel_name: string
  sender: {
    user_id: number
    first_name: string
    last_name: string
    avatar_url: string | null
    user_tag: string | null
  }
}

export default function TeamPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = params.id as string
  const teamId = params.team_id as string

  const [team, setTeam] = useState<TeamDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [userRole, setUserRole] = useState<string>("MEMBER")
  const [organizationMembers, setOrganizationMembers] = useState<OrganizationMember[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [memberDetailsOpen, setMemberDetailsOpen] = useState(false)

  // Edit team dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editTeamName, setEditTeamName] = useState("")
  const [editTeamDescription, setEditTeamDescription] = useState("")
  const [editTeamSize, setEditTeamSize] = useState("")
  const [isEditingTeam, setIsEditingTeam] = useState(false)

  // Add member dialog
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [memberRole, setMemberRole] = useState<string>("MEMBER")
  const [canCreateChannels, setCanCreateChannels] = useState(false)
  const [canSendMessages, setCanSendMessages] = useState(true)
  const [canDeleteMessages, setCanDeleteMessages] = useState(false)
  const [canManageRoles, setCanManageRoles] = useState(false)
  const [canKickMembers, setCanKickMembers] = useState(false)
  const [canMakeAnnouncement, setCanMakeAnnouncement] = useState(false)
  const [canManageTasks, setCanManageTasks] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Edit permissions dialog
  const [editPermissionsOpen, setEditPermissionsOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editRole, setEditRole] = useState<string>("")
  const [editCanCreateChannels, setEditCanCreateChannels] = useState(false)
  const [editCanSendMessages, setEditCanSendMessages] = useState(false)
  const [editCanDeleteMessages, setEditCanDeleteMessages] = useState(false)
  const [editCanManageRoles, setEditCanManageRoles] = useState(false)
  const [editCanKickMembers, setEditCanKickMembers] = useState(false)
  const [editCanMakeAnnouncement, setEditCanMakeAnnouncement] = useState(false)
  const [editCanManageTasks, setEditCanManageTasks] = useState(false)
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false)

  // Current user's permissions
  const [currentUserPermissions, setCurrentUserPermissions] = useState<{
    can_manage_roles: boolean
    can_kick_members: boolean
    can_create_channels: boolean
  }>({ can_manage_roles: false, can_kick_members: false, can_create_channels: false })

  // Channel creation dialog
  const [createChannelDialogOpen, setCreateChannelDialogOpen] = useState(false)
  const [channelName, setChannelName] = useState("")
  const [channelMode, setChannelMode] = useState<"text" | "voice">("text")
  const [channelCategory, setChannelCategory] = useState<"teambased" | "orgbased" | "announcement">("teambased")
  const [channelDescription, setChannelDescription] = useState("")
  const [isCreatingChannel, setIsCreatingChannel] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<{ title: string; description: string } | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [teamChannelFiles, setTeamChannelFiles] = useState<TeamChannelFile[]>([])
  const [pdfViewer, setPdfViewer] = useState<{ fileId: number; fileUrl: string; fileName: string } | null>(null)


  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const fetchTeamMembers = async (userId?: number) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/team/${teamId}/members`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.members || [])
        
        // Set current user's permissions - use passed userId or state currentUserId
        const userIdToCheck = userId ?? currentUserId
        if (userIdToCheck !== null) {
          const currentUserMember = data.members.find((m: TeamMember) => m.user_id === userIdToCheck)
          if (currentUserMember && currentUserMember.permissions) {
            setCurrentUserPermissions({
              can_manage_roles: currentUserMember.permissions.can_manage_roles,
              can_kick_members: currentUserMember.permissions.can_kick_members,
              can_create_channels: currentUserMember.permissions.can_create_channels
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
    }
  }

  const fetchTeamChannels = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/channels`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setChannels(data)
        await fetchFilesForTeamChannels(data)
      }
    } catch (error) {
      console.error('Error fetching team channels:', error)
    }
  }

  const fetchFilesForTeamChannels = async (teamChannels: Channel[]) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      if (!teamChannels.length) {
        setTeamChannelFiles([])
        return
      }

      const fileResponses = await Promise.all(
        teamChannels.map(async (channel) => {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/channel/${channel.channel_id}/files`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }
          )

          if (!response.ok) {
            return [] as TeamChannelFile[]
          }

          const data = await response.json()
          const files = Array.isArray(data?.files) ? data.files : []

          return files.map((file: any) => ({
            id: file.id,
            file_name: file.file_name,
            file_url: file.file_url,
            file_size: file.file_size,
            sent_at: file.sent_at,
            channel_id: channel.channel_id,
            channel_name: channel.channel_name,
            sender: {
              user_id: file.sender?.user_id,
              first_name: file.sender?.first_name,
              last_name: file.sender?.last_name,
              avatar_url: file.sender?.avatar_url ?? null,
              user_tag: file.sender?.user_tag ?? null,
            }
          }))
        })
      )

      const mergedFiles = fileResponses
        .flat()
        .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())

      const uniqueById = mergedFiles.filter((file, index, arr) =>
        arr.findIndex((item) => item.id === file.id) === index
      )

      setTeamChannelFiles(uniqueById)
    } catch (error) {
      console.error('Error fetching team channel files:', error)
    }
  }

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        const token = localStorage.getItem('access_token')
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

        // Fetch all teams and find the specific one
        const teamsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/teams`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()
          const foundTeam = teamsData.find((t: TeamDetails) => t.team_id === parseInt(teamId))
          
          if (foundTeam) {
            setTeam(foundTeam)
            setEditTeamName(foundTeam.team_name)
            setEditTeamDescription(foundTeam.description || "")
            setEditTeamSize(foundTeam.team_size.toString())
          } else {
            toast.error("Error", {
              description: "Team not found"
            })
            router.push(`/organization/${organizationId}`)
          }
        } else {
          toast.error("Error", {
            description: "Failed to load team details"
          })
          router.push(`/organization/${organizationId}`)
        }

        // Fetch organization members to determine user role
        const orgMembersResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/members`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (orgMembersResponse.ok) {
          const orgMembersData = await orgMembersResponse.json()
          setOrganizationMembers(orgMembersData)
          if (userId !== null) {
            const currentUserMember = orgMembersData.find((member: any) => member.user_id === userId)
            if (currentUserMember) {
              setUserRole(currentUserMember.role_user)
            }
          }
        }

        // Fetch team members
        await fetchTeamMembers(userId ?? undefined)

        // Fetch team channels
        await fetchTeamChannels()


      } catch (error) {
        console.error('Error fetching team data:', error)
        toast.error("Error", {
          description: "An error occurred while loading team data"
        })
      } finally {
        setLoading(false)
      }
    }

    if (organizationId && teamId) {
      fetchTeamData()
    }
  }, [organizationId, teamId, router])

  const handleUpdateTeam = async () => {
    if (!editTeamName.trim()) {
      toast.error("Error", {
        description: "Team name is required"
      })
      return
    }

    const teamSize = parseInt(editTeamSize)
    if (isNaN(teamSize) || teamSize < 1) {
      toast.error("Error", {
        description: "Team size must be at least 1"
      })
      return
    }

    setIsEditingTeam(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/team/${teamId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            team_name: editTeamName,
            description: editTeamDescription,
            team_size: teamSize
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Team updated successfully"
        })
        setTeam(data.team)
        setEditDialogOpen(false)
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to update team"
        })
      }
    } catch (error) {
      console.error('Error updating team:', error)
      toast.error("Error", {
        description: "An error occurred while updating team"
      })
    } finally {
      setIsEditingTeam(false)
    }
  }

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error("Error", {
        description: "Please select a member to add"
      })
      return
    }

    setIsAddingMember(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/team/${teamId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: parseInt(selectedUserId),
            role: memberRole,
            can_create_channels: canCreateChannels,
            can_send_messages: canSendMessages,
            can_delete_messages: canDeleteMessages,
            can_manage_roles: canManageRoles,
            can_kick_members: canKickMembers,
            can_make_announcement: canMakeAnnouncement,
            can_manage_tasks: canManageTasks
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Member added to team successfully"
        })
        setAddMemberDialogOpen(false)
        // Reset form
        setSelectedUserId("")
        setMemberRole("MEMBER")
        setCanCreateChannels(false)
        setCanSendMessages(true)
        setCanDeleteMessages(false)
        setCanManageRoles(false)
        setCanKickMembers(false)
        setCanMakeAnnouncement(false)
        setCanManageTasks(false)
        // Refresh team members
        await fetchTeamMembers()
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to add member to team"
        })
      }
    } catch (error) {
      console.error('Error adding member:', error)
      toast.error("Error", {
        description: "An error occurred while adding member"
      })
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member)
    setMemberDetailsOpen(true)
  }

  const handleEditPermissions = (member: TeamMember) => {
    setEditingMember(member)
    setEditRole(member.role)
    if (member.permissions) {
      setEditCanCreateChannels(member.permissions.can_create_channels)
      setEditCanSendMessages(member.permissions.can_send_messages)
      setEditCanDeleteMessages(member.permissions.can_delete_messages)
      setEditCanManageRoles(member.permissions.can_manage_roles)
      setEditCanKickMembers(member.permissions.can_kick_members)
      setEditCanMakeAnnouncement(member.permissions.can_make_announcement)
      setEditCanManageTasks(member.permissions.can_manage_tasks === true)
    }
    setEditPermissionsOpen(true)
    setMemberDetailsOpen(false)
  }

  const handleUpdatePermissions = async () => {
    if (!editingMember) return

    setIsUpdatingPermissions(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/team/${teamId}/member/${editingMember.user_id}/permissions`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            role: editRole,
            can_create_channels: editCanCreateChannels,
            can_send_messages: editCanSendMessages,
            can_delete_messages: editCanDeleteMessages,
            can_manage_roles: editCanManageRoles,
            can_kick_members: editCanKickMembers,
            can_make_announcement: editCanMakeAnnouncement,
            can_manage_tasks: editCanManageTasks
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Member permissions updated successfully"
        })
        setEditPermissionsOpen(false)
        await fetchTeamMembers()
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to update permissions"
        })
      }
    } catch (error) {
      console.error('Error updating permissions:', error)
      toast.error("Error", {
        description: "An error occurred while updating permissions"
      })
    } finally {
      setIsUpdatingPermissions(false)
    }
  }

  const handleKickMember = async (memberId: number, memberName: string) => {
    if (!confirm(`Are you sure you want to kick ${memberName} from the team?`)) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/team/${teamId}/member/${memberId}`,
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
          description: "Member kicked successfully"
        })
        setMemberDetailsOpen(false)
        await fetchTeamMembers()
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to kick member"
        })
      }
    } catch (error) {
      console.error('Error kicking member:', error)
      toast.error("Error", {
        description: "An error occurred while kicking member"
      })
    }
  }

  const handleCreateChannel = async () => {
    if (!channelName.trim()) {
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
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/channels`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            channel_name: channelName,
            channel_mode: channelMode,
            channel_category: channelCategory,
            description: channelDescription || null
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Channel created successfully"
        })
        setCreateChannelDialogOpen(false)
        // Reset form
        setChannelName("")
        setChannelMode("text")
        setChannelCategory("teambased")
        setChannelDescription("")
        // Refresh channels list
        await fetchTeamChannels()
      } else if (response.status === 403) {
        setCreateChannelDialogOpen(false)
        setUpgradeModal({
          title: "Channel limit reached",
          description: data.detail || "Upgrade to Pro for unlimited channels.",
        })
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to create channel"
        })
      }
    } catch (error) {
      console.error('Error creating channel:', error)
      toast.error("Error", {
        description: "An error occurred while creating channel"
      })
    } finally {
      setIsCreatingChannel(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <OrganizationNavBar organizationId={organizationId} />
        <MembersSidebar organizationId={organizationId} teamId={teamId} />
        <main className="p-4 md:p-6 lg:p-8 lg:ml-[308px] xl:ml-[368px] lg:mr-[250px] xl:mr-[320px]">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-muted" />
                <Loader2 className="h-16 w-16 animate-spin text-primary absolute inset-0" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium text-foreground">Loading team...</p>
                <p className="text-sm text-muted-foreground">Fetching team details and members</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <OrganizationNavBar organizationId={organizationId} />
        <MembersSidebar organizationId={organizationId} teamId={teamId} />
        <main className="p-4 md:p-6 lg:p-8 lg:ml-[308px] xl:ml-[368px] lg:mr-[250px] xl:mr-[320px]">
          <div className="flex items-center justify-center h-[60vh]">
            <Card className="max-w-md w-full text-center">
              <CardContent className="pt-8 pb-6 space-y-4">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Team not found</h2>
                  <p className="text-sm text-muted-foreground">This team may have been removed or you don&apos;t have access.</p>
                </div>
                <Button onClick={() => router.push(`/organization/${organizationId}`)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Organization
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  const getChannelIcon = (mode: string) => {
    switch (mode) {
      case "voice": return <Mic className="h-4 w-4" />
      case "video": return <Video className="h-4 w-4" />
      case "announcement": return <Megaphone className="h-4 w-4" />
      default: return <Hash className="h-4 w-4" />
    }
  }

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" | "destructive" => {
    const upper = role.toUpperCase()
    if (upper === "OWNER" || upper === "ADMIN") return "default"
    if (upper === "MODERATOR") return "secondary"
    return "outline"
  }

  const getPresenceBadge = (index: number) => {
    const cycle = [
      { label: "Online", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
      { label: "Away", className: "bg-slate-100 text-slate-700 border-slate-200" },
      { label: "Busy", className: "bg-red-100 text-red-700 border-red-200" },
    ]
    return cycle[index % cycle.length]
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <OrganizationNavBar organizationId={organizationId} />
      <MembersSidebar organizationId={organizationId} teamId={teamId} />
      
      <main className="px-4 py-5 md:px-8 md:py-8 lg:ml-[308px] xl:ml-[368px] lg:mr-[250px] xl:mr-[320px] overflow-y-auto">
        <div className="mx-auto max-w-7xl space-y-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/organization/${organizationId}`)}
                className="mb-2 -ml-2"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Back
              </Button>
              <h1 className="text-2xl font-semibold tracking-tight">Team Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage members and channels for <span className="font-medium text-foreground">{team.team_name}</span>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push(`/organization/${organizationId}/${teamId}/tasks`)}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Tasks
              </Button>
              {(userRole === "OWNER" || currentUserPermissions.can_create_channels) && (
                <Button variant="outline" onClick={() => setCreateChannelDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Channel
                </Button>
              )}
              {(userRole === "OWNER" || userRole === "ADMIN") && (
                <Button onClick={() => setAddMemberDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Member
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <Card className="xl:col-span-4 py-0">
              <CardHeader className="border-b py-4">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle>Channels</CardTitle>
                  <Badge variant="secondary" className="font-medium">
                    {channels.length} active
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-2">
                {channels.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    No channels yet.
                  </div>
                ) : (
                  channels.slice(0, 8).map((channel, index) => (
                    <button
                      key={channel.channel_id}
                      onClick={() => router.push(`/channels/${channel.channel_id}`)}
                      className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-muted/70"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="text-muted-foreground">{getChannelIcon(channel.channel_mode)}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{channel.channel_name}</p>
                          {channel.description && (
                            <p className="truncate text-xs text-muted-foreground">{channel.description}</p>
                          )}
                        </div>
                      </div>
                      {index === 2 ? (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">HOT</Badge>
                      ) : (
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {channel.channel_category}
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </CardContent>

              <CardFooter className="border-t py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => channels[0] && router.push(`/channels/${channels[0].channel_id}`)}
                  disabled={channels.length === 0}
                >
                  View All Channels
                </Button>
              </CardFooter>
            </Card>

            <Card className="xl:col-span-8 py-0">
              <CardHeader className="border-b py-4">
                <CardTitle>Team Members</CardTitle>
                <CardDescription>
                  {teamMembers.length}/{team.team_size} seats filled
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                {teamMembers.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">No members in this team yet.</div>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 text-left font-medium">Member</th>
                        <th className="px-5 py-3 text-left font-medium">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.slice(0, 8).map((member, index) => {
                        const presence = getPresenceBadge(index)
                        return (
                          <tr
                            key={member.user_id}
                            className="border-t hover:bg-muted/40 cursor-pointer"
                            onClick={() => handleMemberClick(member)}
                          >
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={member.avatar_url || undefined} alt={`${member.first_name} ${member.last_name}`} />
                                  <AvatarFallback>
                                    {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{member.first_name} {member.last_name}</p>
                                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <Badge variant={getRoleBadgeVariant(member.role)}>{member.role}</Badge>
                            </td>
                          
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>

              <CardFooter className="border-t flex items-center justify-between py-3 text-sm text-muted-foreground">
                <span>
                  Showing 1-{Math.min(teamMembers.length, 8)} of {teamMembers.length} members
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Prev
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>

          <Card className="py-0">
            <CardHeader className="border-b py-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>Shared Files</CardTitle>
                <Badge variant="secondary" className="font-medium">
                  {teamChannelFiles.length} files
                </Badge>
              </div>
              <CardDescription>Files posted in team-based channels</CardDescription>
            </CardHeader>

            <CardContent className="p-2">
              {teamChannelFiles.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No files uploaded in this team channels yet.
                </div>
              ) : (
                teamChannelFiles.slice(0, 12).map((file) => (
                  <button
                    key={`${file.channel_id}-${file.id}`}
                    type="button"
                    onClick={() => setPdfViewer({ fileId: file.id, fileUrl: file.file_url, fileName: file.file_name })}
                    className="group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-muted/70"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="text-muted-foreground"><Paperclip className="h-4 w-4" /></span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{file.file_name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          #{file.channel_name} • {file.sender.first_name} {file.sender.last_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatFileSize(file.file_size)}</p>
                      <p>{new Date(file.sent_at).toLocaleDateString()}</p>
                    </div>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Edit Team Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
              <DialogDescription>
                Update team information
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_team_name">Team Name *</Label>
                <Input
                  id="edit_team_name"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_description">Description</Label>
                <Textarea
                  id="edit_description"
                  value={editTeamDescription}
                  onChange={(e) => setEditTeamDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_team_size">Max Team Size *</Label>
                <Input
                  id="edit_team_size"
                  type="number"
                  min="1"
                  value={editTeamSize}
                  onChange={(e) => setEditTeamSize(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={isEditingTeam}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTeam}
                disabled={isEditingTeam}
              >
                {isEditingTeam ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Team"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Member to Team</DialogTitle>
              <DialogDescription>
                Select an organization member and assign their role and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-2">
              {/* Member Selection */}
              <div className="grid gap-2">
                <Label htmlFor="select_member">Select Member</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="select_member">
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id.toString()}>
                        {member.first_name} {member.last_name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Input */}
              <div className="grid gap-2">
                <Label htmlFor="member_role">Role</Label>
                <Input
                  id="member_role"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  placeholder="e.g., MEMBER, ADMIN, MODERATOR"
                />
              </div>

              <Separator />

              {/* Permissions */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Permissions</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "can_create_channels", label: "Create Channels", checked: canCreateChannels, onChange: setCanCreateChannels },
                    { id: "can_send_messages", label: "Send Messages", checked: canSendMessages, onChange: setCanSendMessages },
                    { id: "can_make_announcement", label: "Announcements", checked: canMakeAnnouncement, onChange: setCanMakeAnnouncement },
                    { id: "can_delete_messages", label: "Delete Messages", checked: canDeleteMessages, onChange: setCanDeleteMessages },
                    { id: "can_manage_roles", label: "Manage Roles", checked: canManageRoles, onChange: setCanManageRoles },
                    { id: "can_kick_members", label: "Kick Members", checked: canKickMembers, onChange: setCanKickMembers },
                    { id: "can_manage_tasks", label: "Manage Tasks", checked: canManageTasks, onChange: setCanManageTasks },
                  ].map((perm) => (
                    <label
                      key={perm.id}
                      htmlFor={perm.id}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                        perm.checked ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        id={perm.id}
                        checked={perm.checked}
                        onCheckedChange={(checked) => perm.onChange(checked === true)}
                      />
                      <span className="text-sm font-medium">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddMemberDialogOpen(false)}
                disabled={isAddingMember}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddMember}
                disabled={isAddingMember}
              >
                {isAddingMember ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Member
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Member Details Dialog */}
        <Dialog open={memberDetailsOpen} onOpenChange={setMemberDetailsOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Member Details</DialogTitle>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-5">
                {/* Member Info */}
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={selectedMember.avatar_url || undefined} alt={`${selectedMember.first_name} ${selectedMember.last_name}`} />
                    <AvatarFallback className="text-lg">
                      {selectedMember.first_name.charAt(0)}{selectedMember.last_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold truncate">
                      {selectedMember.first_name} {selectedMember.last_name}
                    </h3>
                    {selectedMember.user_tag && (
                      <p className="text-sm text-muted-foreground">@{selectedMember.user_tag}</p>
                    )}
                    <Badge variant={getRoleBadgeVariant(selectedMember.role)} className="mt-1">
                      {selectedMember.role}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Contact Information */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{selectedMember.email}</span>
                  </div>
                  {selectedMember.phone_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{selectedMember.phone_number}</span>
                    </div>
                  )}
                  {selectedMember.country && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>{selectedMember.country}</span>
                    </div>
                  )}
                </div>

                {/* Permissions */}
                {selectedMember.permissions && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Permissions
                      </h4>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { label: "Create Channels", value: selectedMember.permissions.can_create_channels },
                          { label: "Send Messages", value: selectedMember.permissions.can_send_messages },
                          { label: "Delete Messages", value: selectedMember.permissions.can_delete_messages },
                          { label: "Manage Roles", value: selectedMember.permissions.can_manage_roles },
                          { label: "Kick Members", value: selectedMember.permissions.can_kick_members },
                          { label: "Announcements", value: selectedMember.permissions.can_make_announcement },
                          { label: "Manage Tasks", value: selectedMember.permissions.can_manage_tasks === true },
                        ].map((perm) => (
                          <div
                            key={perm.label}
                            className="flex items-center gap-2 text-sm py-1"
                          >
                            {perm.value ? (
                              <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                            ) : (
                              <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                            )}
                            <span className={`text-xs ${perm.value ? "text-foreground" : "text-muted-foreground"}`}>{perm.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
              <div className="flex gap-2 flex-1">
                {(userRole === "OWNER" || userRole === "ADMIN" || currentUserPermissions.can_manage_roles) && selectedMember && selectedMember.user_id !== currentUserId && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleEditPermissions(selectedMember)}
                    className="flex-1 sm:flex-none"
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Permissions
                  </Button>
                )}
                {(userRole === "OWNER" || userRole === "ADMIN" || currentUserPermissions.can_kick_members) && selectedMember && selectedMember.user_id !== currentUserId && (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleKickMember(selectedMember.user_id, `${selectedMember.first_name} ${selectedMember.last_name}`)}
                    className="flex-1 sm:flex-none"
                    size="sm"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Kick
                  </Button>
                )}
              </div>
              <Button variant="secondary" onClick={() => setMemberDetailsOpen(false)} size="sm">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Permissions Dialog */}
        <Dialog open={editPermissionsOpen} onOpenChange={setEditPermissionsOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Permissions</DialogTitle>
              <DialogDescription>
                Update {editingMember?.first_name} {editingMember?.last_name}&apos;s role and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-2">
              {/* Role Input */}
              <div className="grid gap-2">
                <Label htmlFor="edit_role">Role</Label>
                <Input
                  id="edit_role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="e.g., MEMBER, ADMIN, MODERATOR"
                />
              </div>

              <Separator />

              {/* Permissions */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Permissions</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "edit_can_create_channels", label: "Create Channels", checked: editCanCreateChannels, onChange: setEditCanCreateChannels },
                    { id: "edit_can_send_messages", label: "Send Messages", checked: editCanSendMessages, onChange: setEditCanSendMessages },
                    { id: "edit_can_make_announcement", label: "Announcements", checked: editCanMakeAnnouncement, onChange: setEditCanMakeAnnouncement },
                    { id: "edit_can_delete_messages", label: "Delete Messages", checked: editCanDeleteMessages, onChange: setEditCanDeleteMessages },
                    { id: "edit_can_manage_roles", label: "Manage Roles", checked: editCanManageRoles, onChange: setEditCanManageRoles },
                    { id: "edit_can_kick_members", label: "Kick Members", checked: editCanKickMembers, onChange: setEditCanKickMembers },
                    { id: "edit_can_manage_tasks", label: "Manage Tasks", checked: editCanManageTasks, onChange: setEditCanManageTasks },
                  ].map((perm) => (
                    <label
                      key={perm.id}
                      htmlFor={perm.id}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors ${
                        perm.checked ? "bg-primary/5 border-primary/30" : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox
                        id={perm.id}
                        checked={perm.checked}
                        onCheckedChange={(checked) => perm.onChange(checked === true)}
                      />
                      <span className="text-sm font-medium">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditPermissionsOpen(false)}
                disabled={isUpdatingPermissions}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePermissions}
                disabled={isUpdatingPermissions}
              >
                {isUpdatingPermissions ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Permissions"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Channel Dialog */}
        <Dialog open={createChannelDialogOpen} onOpenChange={setCreateChannelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Channel</DialogTitle>
              <DialogDescription>
                Create a new channel for team communication
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="channel_name">Channel Name *</Label>
                <Input
                  id="channel_name"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g., general, announcements"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="channel_mode">Channel Mode *</Label>
                <Select value={channelMode} onValueChange={(value: "text" | "voice") => setChannelMode(value)}>
                  <SelectTrigger id="channel_mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="voice">Voice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="channel_category">Channel Category *</Label>
                <Select value={channelCategory} onValueChange={(value: "teambased" | "orgbased" | "announcement") => setChannelCategory(value)}>
                  <SelectTrigger id="channel_category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="teambased">Team Based</SelectItem>
                    <SelectItem value="orgbased">Organization Based</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="channel_description">Description</Label>
                <Textarea
                  id="channel_description"
                  value={channelDescription}
                  onChange={(e) => setChannelDescription(e.target.value)}
                  placeholder="What is this channel for?"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateChannelDialogOpen(false)}
                disabled={isCreatingChannel}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateChannel}
                disabled={isCreatingChannel}
              >
                {isCreatingChannel ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Channel
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
      <UpgradeModal
        open={!!upgradeModal}
        onClose={() => setUpgradeModal(null)}
        title={upgradeModal?.title ?? ""}
        description={upgradeModal?.description ?? ""}
        upgradeUrl={`/organization/${organizationId}/upgrade`}
      />
      {pdfViewer && (
        <PdfViewerModal
          open={!!pdfViewer}
          onOpenChange={(v) => { if (!v) setPdfViewer(null) }}
          fileId={pdfViewer.fileId}
          fileUrl={pdfViewer.fileUrl}
          fileName={pdfViewer.fileName}
          contentUrl={`/organization/${organizationId}/team/${teamId}/file/${pdfViewer.fileId}/content`}
          fullPageUrl={`/organization/${organizationId}/${teamId}/file/${pdfViewer.fileId}?name=${encodeURIComponent(pdfViewer.fileName)}&url=${encodeURIComponent(pdfViewer.fileUrl)}`}
        />
      )}
    </div>
  )
}
