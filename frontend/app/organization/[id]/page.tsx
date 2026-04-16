"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar/page"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Building2, Loader2, Users, Settings, Calendar, UserPlus, Edit, Trash2, FolderKanban, ChevronRight, Zap, XCircle, Activity } from "lucide-react"
import { toast } from "sonner"
import MembersSidebar from "@/components/MembersSidebar/page"
import OrganizationNavBar from "@/components/OrganizationNavBar/page"
import UpgradeModal from "@/components/UpgradeModal"

interface OrganizationDetails {
  organization_id: number
  organization_name: string
  organaization_picture: string
  organaization_tag: string
  organization_description?: string
  organization_plan?: string
  owner_id?: number
  created_at?: string
}

interface Team {
  team_id: number
  team_name: string
  team_size: number
  description?: string
  org_id: number
  created_at: string
}

interface LogEntry {
  id: number
  action: string
  target_id: number | null
  target_type: string | null
  metadata: Record<string, any> | null
  created_at: string | null
  actor: {
    user_id: number
    first_name: string
    last_name: string
    avatar_url: string | null
    user_tag: string | null
  }
}

interface PendingJoinRequest {
  request_id: number
  user_id: number
  org_id: number
  sent_at?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  user_tag?: string | null
  profile_picture?: string | null
}


export default function OrganizationPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = params.id
  
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [userTag, setUserTag] = useState("")
  const [roleUser, setRoleUser] = useState<"ADMIN" | "MEMBER">("MEMBER")
  const [addingMember, setAddingMember] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>("MEMBER")
  const [pendingJoinRequests, setPendingJoinRequests] = useState<PendingJoinRequest[]>([])
  const [loadingPendingJoinRequests, setLoadingPendingJoinRequests] = useState(false)
  
  // Edit organization states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editImage, setEditImage] = useState<File | null>(null)
  const [updating, setUpdating] = useState(false)
  
  // Delete organization states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Upgrade / cancel states
  const [upgrading, setUpgrading] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  
  // Create team states
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [teamSize, setTeamSize] = useState("")
  const [teamDescription, setTeamDescription] = useState("")
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  
  // Edit team states
  const [editTeamDialogOpen, setEditTeamDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editTeamName, setEditTeamName] = useState("")
  const [editTeamSize, setEditTeamSize] = useState("")
  const [editTeamDescription, setEditTeamDescription] = useState("")
  const [isEditingTeam, setIsEditingTeam] = useState(false)
  
  // Delete team states
  const [deleteTeamDialogOpen, setDeleteTeamDialogOpen] = useState(false)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)
  const [isDeletingTeam, setIsDeletingTeam] = useState(false)
  const [upgradeModal, setUpgradeModal] = useState<{ title: string; description: string } | null>(null)

  // Logs states
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    const fetchOrganizationDetails = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          toast.error("Authentication required", {
            description: "Please log in to view organization details"
          })
          router.push('/auth/login')
          return
        }

        // Get current user info
        const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setCurrentUserId(userData.user_id)

          const roleResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/members`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          })

          if (roleResponse.ok) {
            const membersData = await roleResponse.json()
            const me = membersData.find((member: any) => member.user_id === userData.user_id)
            if (me?.role_user) {
              setCurrentUserRole(me.role_user)
            }
          }
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_org_for_admin_org`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          // Find the organization with the matching ID
          const foundOrg = data.find((org: OrganizationDetails) => 
            org.organization_id === parseInt(organizationId as string)
          )
          
          if (foundOrg) {
            setOrganization(foundOrg)
            // Initialize edit form with current values
            setEditName(foundOrg.organization_name)
            setEditDescription(foundOrg.organization_description || "")
          } else {
            toast.error("Organization not found", {
              description: "The requested organization does not exist or you don't have access to it"
            })
            router.push('/welcome')
          }
        } else if (response.status === 401) {
          toast.error("Session expired", {
            description: "Please log in again"
          })
          router.push('/auth/login')
        } else {
          throw new Error("Failed to fetch organization details")
        }
      } catch (error) {
        console.error('Error fetching organization:', error)
        toast.error("Error", {
          description: "Failed to load organization details"
        })
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      fetchOrganizationDetails()
    }
  }, [organizationId, router])

  useEffect(() => {
    const fetchPendingJoinRequests = async () => {
      if (!organizationId) return
      if (!["OWNER", "ADMIN"].includes(currentUserRole)) {
        setPendingJoinRequests([])
        return
      }

      setLoadingPendingJoinRequests(true)
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/join-requests`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          const sorted = (Array.isArray(data) ? data : []).sort((a: PendingJoinRequest, b: PendingJoinRequest) => {
            const aDate = a.sent_at ? new Date(a.sent_at).getTime() : 0
            const bDate = b.sent_at ? new Date(b.sent_at).getTime() : 0
            return bDate - aDate
          })
          setPendingJoinRequests(sorted)
        } else {
          setPendingJoinRequests([])
        }
      } catch (error) {
        console.error('Error fetching pending join requests:', error)
        setPendingJoinRequests([])
      } finally {
        setLoadingPendingJoinRequests(false)
      }
    }

    fetchPendingJoinRequests()
  }, [organizationId, currentUserRole])

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!organizationId) return
      
      setLoadingTeams(true)
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setTeams(data)
        }
      } catch (error) {
        console.error('Error fetching teams:', error)
      } finally {
        setLoadingTeams(false)
      }
    }

    fetchTeams()
  }, [organizationId])

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      if (!organizationId) return
      if (!["OWNER", "ADMIN"].includes(currentUserRole)) return

      setLoadingLogs(true)
      try {
        const token = localStorage.getItem('access_token')
        if (!token) return

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/logs`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setLogs(data)
        }
      } catch (error) {
        console.error('Error fetching logs:', error)
      } finally {
        setLoadingLogs(false)
      }
    }

    fetchLogs()
  }, [organizationId, currentUserRole])

  // Listen for add member dialog event from navbar
  useEffect(() => {
    const handleOpenAddMemberDialog = () => {
      setAddMemberDialogOpen(true)
    }

    window.addEventListener('openAddMemberDialog', handleOpenAddMemberDialog)
    
    return () => {
      window.removeEventListener('openAddMemberDialog', handleOpenAddMemberDialog)
    }
  }, [])

  const handleAddMember = async () => {
    if (!userTag.trim()) {
      toast.error("User tag required", {
        description: "Please enter a user tag"
      })
      return
    }

    setAddingMember(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error("Authentication required")
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/add_member`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          user_tag: userTag,
          role_user: roleUser
        })
      })

      if (response.ok) {
        toast.success("Member added successfully", {
          description: `${userTag} has been added as ${roleUser}`
        })
        setAddMemberDialogOpen(false)
        setUserTag("")
        setRoleUser("MEMBER")
      } else if (response.status === 404) {
        toast.error("User not found", {
          description: "No user exists with this user tag"
        })
      } else if (response.status === 409) {
        toast.error("User already in organization", {
          description: "This user is already a member"
        })
      } else if (response.status === 403) {
        const data = await response.json()
        const isLimitError = data.detail?.toLowerCase().includes("maximum")
        if (isLimitError) {
          setAddMemberDialogOpen(false)
          setUpgradeModal({
            title: "Member limit reached",
            description: data.detail,
          })
        } else {
          toast.error("Permission denied", { description: data.detail || "You don't have permission to add members" })
        }
      } else {
        throw new Error("Failed to add member")
      }
    } catch (error) {
      console.error('Error adding member:', error)
      toast.error("Error", {
        description: "Failed to add member to organization"
      })
    } finally {
      setAddingMember(false)
    }
  }

  const handleEditOrganization = async () => {
    if (!editName.trim()) {
      toast.error("Organization name required", {
        description: "Please enter an organization name"
      })
      return
    }

    setUpdating(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error("Authentication required")
        router.push('/auth/login')
        return
      }

      const formData = new FormData()
      formData.append('organization_name', editName)
      formData.append('organization_description', editDescription)
      formData.append('organization_plan', organization?.organization_plan || "FREE")
      if (editImage) {
        formData.append('image', editImage)
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        toast.success("Organization updated successfully", {
          description: "Your changes have been saved"
        })
        setEditDialogOpen(false)
        // Update the organization state with new data
        if (data.organization) {
          setOrganization(prev => prev ? { ...prev, ...data.organization } : null)
        }
        // Refresh the page to get updated data
        window.location.reload()
      } else if (response.status === 403) {
        const data = await response.json()
        toast.error("Permission denied", {
          description: data.detail || "Only the owner can edit this organization"
        })
      } else if (response.status === 409) {
        toast.error("Name already exists", {
          description: "An organization with this name already exists"
        })
      } else {
        throw new Error("Failed to update organization")
      }
    } catch (error) {
      console.error('Error updating organization:', error)
      toast.error("Error", {
        description: "Failed to update organization"
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteOrganization = async () => {
    setDeleting(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error("Authentication required")
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (response.ok) {
        toast.success("Organization deleted successfully", {
          description: "The organization has been permanently deleted"
        })
        setDeleteDialogOpen(false)
        router.push('/welcome')
      } else if (response.status === 403) {
        const data = await response.json()
        toast.error("Permission denied", {
          description: data.detail || "Only the owner can delete this organization"
        })
      } else {
        throw new Error("Failed to delete organization")
      }
    } catch (error) {
      console.error('Error deleting organization:', error)
      toast.error("Error", {
        description: "Failed to delete organization"
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Team name required", {
        description: "Please enter a team name"
      })
      return
    }

    if (!teamSize || parseInt(teamSize) < 1) {
      toast.error("Invalid team size", {
        description: "Please enter a valid team size (minimum 1)"
      })
      return
    }

    setCreatingTeam(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error("Authentication required")
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/create_team`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          team_name: teamName,
          team_size: parseInt(teamSize),
          description: teamDescription,
          org_id: parseInt(organizationId as string)
        })
      })

      if (response.ok) {
        await response.json()
        toast.success("Team created successfully", {
          description: `${teamName} has been created`
        })
        setCreateTeamDialogOpen(false)
        setTeamName("")
        setTeamSize("")
        setTeamDescription("")
        
        // Refresh teams list
        const teamsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()
          setTeams(teamsData)
        }
      } else if (response.status === 403) {
        const data = await response.json()
        toast.error("Permission denied", {
          description: data.detail || "Only organization owner or admin can create teams"
        })
      } else if (response.status === 400) {
        const data = await response.json()
        toast.error("Team name already exists", {
          description: data.detail || "This team name is already taken in this organization"
        })
      } else {
        throw new Error("Failed to create team")
      }
    } catch (error) {
      console.error('Error creating team:', error)
      toast.error("Error", {
        description: "Failed to create team"
      })
    } finally {
      setCreatingTeam(false)
    }
  }

  const handleEditTeam = async () => {
    if (!editingTeam) return

    if (!editTeamName.trim()) {
      toast.error("Team name required", {
        description: "Please enter a team name"
      })
      return
    }

    if (!editTeamSize || parseInt(editTeamSize) < 1) {
      toast.error("Invalid team size", {
        description: "Please enter a valid team size (minimum 1)"
      })
      return
    }

    setIsEditingTeam(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error("Authentication required")
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/${editingTeam.team_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          team_name: editTeamName,
          team_size: parseInt(editTeamSize),
          description: editTeamDescription,
          org_id: parseInt(organizationId as string)
        })
      })

      if (response.ok) {
        toast.success("Team updated successfully", {
          description: `${editTeamName} has been updated`
        })
        setEditTeamDialogOpen(false)
        setEditingTeam(null)
        
        // Refresh teams list
        const teamsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()
          setTeams(teamsData)
        }
      } else if (response.status === 403) {
        const data = await response.json()
        toast.error("Permission denied", {
          description: data.detail || "Only organization owner or admin can edit teams"
        })
      } else if (response.status === 400) {
        const data = await response.json()
        toast.error("Team name already exists", {
          description: data.detail || "This team name is already taken in this organization"
        })
      } else {
        throw new Error("Failed to update team")
      }
    } catch (error) {
      console.error('Error updating team:', error)
      toast.error("Error", {
        description: "Failed to update team"
      })
    } finally {
      setIsEditingTeam(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return

    setIsDeletingTeam(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error("Authentication required")
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/team/${deletingTeam.team_id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (response.ok) {
        toast.success("Team deleted successfully", {
          description: `${deletingTeam.team_name} has been deleted`
        })
        setDeleteTeamDialogOpen(false)
        setDeletingTeam(null)
        
        // Refresh teams list
        const teamsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/teams`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        if (teamsResponse.ok) {
          const teamsData = await teamsResponse.json()
          setTeams(teamsData)
        }
      } else if (response.status === 403) {
        const data = await response.json()
        toast.error("Permission denied", {
          description: data.detail || "Only organization owner or admin can delete teams"
        })
      } else if (response.status === 404) {
        toast.error("Team not found", {
          description: "This team may have already been deleted"
        })
      } else {
        throw new Error("Failed to delete team")
      }
    } catch (error) {
      console.error('Error deleting team:', error)
      toast.error("Error", {
        description: "Failed to delete team"
      })
    } finally {
      setIsDeletingTeam(false)
    }
  }

  const handleJoinRequestAction = async (
    requestId: number,
    action: "accept" | "reject",
    roleUser: "ADMIN" | "MEMBER" = "MEMBER"
  ) => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error("Authentication required")
        router.push('/auth/login')
        return
      }

      const url = `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/join-requests/${requestId}?action=${action}&role_user=${roleUser}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        toast.error("Request failed", {
          description: data?.detail || "Could not process join request"
        })
        return
      }

      toast.success(action === "accept" ? "Request accepted" : "Request rejected", {
        description: action === "accept"
          ? `Member added as ${roleUser}`
          : "Join request has been rejected"
      })

      setPendingJoinRequests(prev => prev.filter(req => req.request_id !== requestId))
    } catch (error) {
      console.error('Error handling join request:', error)
      toast.error("Error", {
        description: "Failed to handle join request"
      })
    }
  }

  const handleUpgrade = async () => {
    setUpgrading(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        toast.error("Authentication required")
        router.push('/auth/login')
        return
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const url = await response.json()
        window.location.href = url
      } else {
        const data = await response.json()
        toast.error("Failed to start upgrade", {
          description: data.detail || "Please try again"
        })
      }
    } catch (error) {
      console.error('Error starting upgrade:', error)
      toast.error("Error", { description: "Failed to initiate upgrade" })
    } finally {
      setUpgrading(false)
    }
  }

  const handleCancelSubscription = async () => {
    setCancelling(true)
    try {
      const token = localStorage.getItem("access_token")
      if (!token) { router.push("/auth/login"); return }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/cancel-subscription`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        toast.success("Subscription cancelled", { description: "Your plan has been downgraded to Free." })
        setOrganization((prev) => prev ? { ...prev, organization_plan: "FREE" } : prev)
        setCancelDialogOpen(false)
      } else {
        const data = await response.json()
        toast.error("Failed to cancel", { description: data.detail || "Please try again" })
      }
    } catch {
      toast.error("Error", { description: "Failed to cancel subscription" })
    } finally {
      setCancelling(false)
    }
  }

  const formatLogAction = (log: LogEntry): string => {
    const actor = `${log.actor.first_name} ${log.actor.last_name}`
    const meta = log.metadata || {}
    switch (log.action) {
      case "member_added": return `${actor} added a member (${meta.role || "MEMBER"})`
      case "org_updated": return `${actor} updated the organization`
      case "org_deleted": return `${actor} deleted the organization`
      case "join_request_sent": return `${actor} sent a join request`
      case "join_request_accepted": return `${actor} accepted a join request (${meta.role || "MEMBER"})`
      case "join_request_rejected": return `${actor} rejected a join request`
      case "plan_upgraded": return `${actor} upgraded the plan to ${meta.plan || "PRO"}`
      case "subscription_cancelled": return `${actor} cancelled the subscription`
      case "team_created": return `${actor} created team "${meta.team_name || ""}"`
      case "team_updated": return `${actor} updated team "${meta.team_name || ""}"`
      case "team_deleted": return `${actor} deleted team "${meta.team_name || ""}"`
      case "team_member_added": return `${actor} added ${meta.member_name || "a member"} to team "${meta.team_name || ""}" (${meta.role || "MEMBER"})`
      case "team_member_kicked": return `${actor} kicked ${meta.member_name || "a member"} from team "${meta.team_name || ""}"`
      case "team_member_permissions_updated": {
        const memberName = meta.member_name || "a member"
        const changes = meta.changes || {}
        const granted: string[] = []
        const revoked: string[] = []
        Object.keys(changes).forEach((key) => {
          if (key === "role") return
          const label = key.replace(/^can_/, "").replace(/_/g, " ")
          if (changes[key].to === true) granted.push(label)
          else if (changes[key].to === false) revoked.push(label)
        })
        const parts: string[] = []
        if (granted.length > 0) parts.push(`granted ${granted.join(", ")}`)
        if (revoked.length > 0) parts.push(`revoked ${revoked.join(", ")}`)
        const roleChange = changes.role ? ` role → ${changes.role.to}` : ""
        const permText = parts.length > 0 ? ` (${parts.join(" | ")})` : ""
        return `${actor} updated permissions for ${memberName}${roleChange}${permText}`
      }
      case "team_member_permissions_revoked": {
        const revokedMember = meta.member_name || "a member"
        const perm = meta.permission === "all" ? "all permissions" : (meta.permission || "permissions").replace(/^can_/, "").replace(/_/g, " ")
        return `${actor} revoked ${perm} from ${revokedMember}`
      }
      case "channel_created": return `${actor} created channel "${meta.channel_name || ""}"`
      case "channel_updated": return `${actor} updated channel "${meta.channel_name || ""}"`
      case "channel_deleted": return `${actor} deleted channel "${meta.channel_name || ""}"`
      case "task_created": return `${actor} created task "${meta.title || ""}"`
      case "task_updated": return `${actor} updated task "${meta.title || ""}"`
      case "task_deleted": return `${actor} deleted task "${meta.title || ""}"`
      case "task_status_updated": return `${actor} changed task status to ${meta.status || ""}`
      case "task_review_accepted": return `${actor} accepted a task review`
      case "task_review_rejected": return `${actor} rejected a task review`
      case "message_pinned": return `${actor} pinned a message`
      case "message_unpinned": return `${actor} unpinned a message`
      default: return `${actor} performed ${log.action.replace(/_/g, " ")}`
    }
  }

  const isOwner = organization?.owner_id === currentUserId

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen w-full flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading organization...</p>
          </div>
        </div>
      </>
    )
  }

  if (!organization) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen w-full flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Organization Not Found</CardTitle>
              <CardDescription>
                The organization you're looking for doesn't exist or you don't have access to it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/welcome')} className="w-full">
                Go Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Sidebar />
      <OrganizationNavBar organizationId={organizationId as string} />

      <div className="min-h-screen bg-background lg:ml-[308px] xl:ml-[368px] lg:mr-[250px] xl:mr-[320px]">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <Avatar className="h-12 w-12 rounded-xl border shadow-sm shrink-0">
                <AvatarImage src={organization.organaization_picture} alt={organization.organization_name} />
                <AvatarFallback className="rounded-xl bg-muted text-muted-foreground">
                  <Building2 className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold tracking-tight truncate">{organization.organization_name}</h1>
                  {organization.organization_plan && (
                    <Badge
                      variant={organization.organization_plan === "pro" ? "default" : "secondary"}
                      className="text-[11px] font-medium shrink-0"
                    >
                      {organization.organization_plan.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">#{organization.organaization_tag}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Member to Organization</DialogTitle>
                    <DialogDescription>
                      Invite a user to join {organization.organization_name} by their user tag
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="userTag">User Tag</Label>
                      <Input
                        id="userTag"
                        placeholder="Enter user tag (e.g., @username)"
                        value={userTag}
                        onChange={(e) => setUserTag(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <select
                        id="role"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={roleUser}
                        onChange={(e) => setRoleUser(e.target.value as "ADMIN" | "MEMBER")}
                      >
                        <option value="MEMBER">Member</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => { setAddMemberDialogOpen(false); setUserTag(""); setRoleUser("MEMBER") }}
                      disabled={addingMember}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddMember} disabled={addingMember}>
                      {addingMember ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> : "Add Member"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Organization</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    General Settings
                  </DropdownMenuItem>
                  {isOwner && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Organization
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteDialogOpen(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Organization
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {organization.organization_description && (
            <p className="text-sm text-muted-foreground leading-relaxed -mt-2">
              {organization.organization_description}
            </p>
          )}

          <Separator />

          {/* ── Stats ── */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="rounded-xl transition-all duration-200 hover:shadow-md">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Members</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl transition-all duration-200 hover:shadow-md">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <FolderKanban className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="text-2xl font-bold">{loadingTeams ? "—" : teams.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl transition-all duration-200 hover:shadow-md">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="text-2xl font-bold capitalize">{organization.organization_plan || "Free"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Main Content ── */}
          <div className="grid grid-cols-3 gap-6">

            {/* Teams — 2 cols */}
            <Card className="col-span-2 rounded-xl">
              <CardHeader className="px-6 py-5 flex flex-row items-center justify-between space-y-0 border-b">
                <div>
                  <CardTitle className="text-base font-semibold">Teams</CardTitle>
                  <CardDescription className="mt-0.5">All teams within {organization.organization_name}</CardDescription>
                </div>
                <Button size="sm" onClick={() => setCreateTeamDialogOpen(true)}>
                  <FolderKanban className="h-4 w-4 mr-2" />
                  New Team
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loadingTeams ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : teams.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <FolderKanban className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No teams yet</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Create your first team to get started</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setCreateTeamDialogOpen(true)}>
                      Create Team
                    </Button>
                  </div>
                ) : (
                  <div>
                    {teams.map((team, index) => (
                      <div key={team.team_id}>
                        <div
                          onClick={() => router.push(`/organization/${organizationId}/${team.team_id}`)}
                          className="group flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-muted/50 transition-all duration-200"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-9 w-9 rounded-lg shrink-0">
                              <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-bold">
                                {team.team_name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{team.team_name}</p>
                              {team.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{team.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Users className="h-3 w-3" />
                              {team.team_size}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingTeam(team)
                                setEditTeamName(team.team_name)
                                setEditTeamSize(team.team_size.toString())
                                setEditTeamDescription(team.description || "")
                                setEditTeamDialogOpen(true)
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingTeam(team)
                                setDeleteTeamDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                        {index < teams.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Column */}
            <div className="col-span-1 space-y-6">
              <Card className="rounded-xl h-fit">
                <CardHeader className="px-6 py-5 border-b">
                  <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-0.5">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm font-normal hover:bg-muted"
                    onClick={() => setAddMemberDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 shrink-0" />
                    Invite Members
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 h-9 text-sm font-normal hover:bg-muted"
                    onClick={() => setCreateTeamDialogOpen(true)}
                  >
                    <FolderKanban className="h-4 w-4 shrink-0" />
                    Create a Team
                  </Button>
                  {isOwner && (
                    <>
                      <Separator className="my-1" />
                      {organization.organization_plan?.toUpperCase() !== "PRO" ? (
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-9 text-sm font-normal text-amber-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                          onClick={() => router.push(`/organization/${organizationId}/upgrade`)}
                        >
                          <Zap className="h-4 w-4 shrink-0" />
                          Upgrade to Pro
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-3 h-9 text-sm font-normal text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setCancelDialogOpen(true)}
                        >
                          <XCircle className="h-4 w-4 shrink-0" />
                          Cancel Pro Plan
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-9 text-sm font-normal hover:bg-muted"
                        onClick={() => setEditDialogOpen(true)}
                      >
                        <Edit className="h-4 w-4 shrink-0" />
                        Edit Organization
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-9 text-sm font-normal text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                        Delete Organization
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {["OWNER", "ADMIN"].includes(currentUserRole) && (
                <Card className="rounded-xl h-fit">
                  <CardHeader className="px-6 py-5 border-b">
                    <CardTitle className="text-base font-semibold">Pending Join Requests</CardTitle>
                    <CardDescription>
                      Users waiting to join this organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {loadingPendingJoinRequests ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading requests...
                      </div>
                    ) : pendingJoinRequests.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No pending requests.</p>
                    ) : (
                      pendingJoinRequests.map((request) => {
                        const fullName = `${request.first_name || ""} ${request.last_name || ""}`.trim() || "Unknown User"
                        return (
                          <div key={request.request_id} className="rounded-md border p-3">
                            <p className="text-sm font-medium">{fullName}</p>
                            <p className="text-xs text-muted-foreground">{request.email || "No email"}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Sent: {request.sent_at ? new Date(request.sent_at).toLocaleString() : "N/A"}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleJoinRequestAction(request.request_id, "accept", "ADMIN")}
                              >
                                Accept as Admin
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleJoinRequestAction(request.request_id, "accept", "MEMBER")}
                              >
                                Accept as Member
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleJoinRequestAction(request.request_id, "reject", "MEMBER")}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* ── Activity Log ── */}
          {["OWNER", "ADMIN"].includes(currentUserRole) && (
            <Card className="rounded-xl">
              <CardHeader className="px-6 py-5 flex flex-row items-center justify-between space-y-0 border-b">
                <div>
                  <CardTitle className="text-base font-semibold">Activity Log</CardTitle>
                  <CardDescription className="mt-0.5">Recent actions in {organization.organization_name}</CardDescription>
                </div>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-0">
                {loadingLogs ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : logs.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-16 text-center px-6">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Activity className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">No activity yet</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Actions will appear here as they happen</p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y">
                    {logs.slice(0, 20).map((log) => (
                      <div key={log.id} className="flex items-start gap-3 px-6 py-3">
                        <Avatar className="h-7 w-7 mt-0.5 shrink-0">
                          <AvatarImage src={log.actor.avatar_url || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {log.actor.first_name?.[0]}{log.actor.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug">{formatLogAction(log)}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <MembersSidebar organizationId={organizationId as string} />

      {/* ── Edit Organization Dialog ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>Update your organization details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Organization Name</Label>
              <Input id="editName" placeholder="Enter organization name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Input id="editDescription" placeholder="Enter organization description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editImage">Organization Image</Label>
              <Input id="editImage" type="file" accept="image/*" onChange={(e) => setEditImage(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false)
                setEditName(organization.organization_name)
                setEditDescription(organization.organization_description || "")
                setEditImage(null)
              }}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleEditOrganization} disabled={updating}>
              {updating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Organization Dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{organization.organization_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrganization} disabled={deleting}>
              {deleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete Organization"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Team Dialog ── */}
      <Dialog open={createTeamDialogOpen} onOpenChange={setCreateTeamDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>Create a team within {organization?.organization_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="teamName">Team Name <span className="text-destructive">*</span></Label>
              <Input id="teamName" placeholder="Enter team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamSize">Team Size <span className="text-destructive">*</span></Label>
              <Input id="teamSize" type="number" min="1" placeholder="Maximum team size" value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamDescription">Description</Label>
              <Textarea
                id="teamDescription"
                placeholder="Enter team description (optional)"
                value={teamDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTeamDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setCreateTeamDialogOpen(false); setTeamName(""); setTeamSize(""); setTeamDescription("") }}
              disabled={creatingTeam}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} disabled={creatingTeam}>
              {creatingTeam ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><FolderKanban className="h-4 w-4 mr-2" />Create Team</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Team Dialog ── */}
      <Dialog open={editTeamDialogOpen} onOpenChange={setEditTeamDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update team details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editTeamName">Team Name <span className="text-destructive">*</span></Label>
              <Input id="editTeamName" placeholder="Enter team name" value={editTeamName} onChange={(e) => setEditTeamName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeamSize">Team Size <span className="text-destructive">*</span></Label>
              <Input id="editTeamSize" type="number" min="1" placeholder="Maximum team size" value={editTeamSize} onChange={(e) => setEditTeamSize(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeamDescription">Description</Label>
              <Textarea
                id="editTeamDescription"
                placeholder="Enter team description (optional)"
                value={editTeamDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditTeamDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setEditTeamDialogOpen(false); setEditingTeam(null) }}
              disabled={isEditingTeam}
            >
              Cancel
            </Button>
            <Button onClick={handleEditTeam} disabled={isEditingTeam}>
              {isEditingTeam ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Subscription Dialog ── */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Pro Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your Pro subscription for <strong>{organization?.organization_name}</strong>? Your organization will be immediately downgraded to the Free plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
              Keep Pro
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={cancelling}>
              {cancelling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelling...</> : "Cancel Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Team Dialog ── */}
      <Dialog open={deleteTeamDialogOpen} onOpenChange={setDeleteTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingTeam?.team_name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setDeleteTeamDialogOpen(false); setDeletingTeam(null) }}
              disabled={isDeletingTeam}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={isDeletingTeam}>
              {isDeletingTeam ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UpgradeModal
        open={!!upgradeModal}
        onClose={() => setUpgradeModal(null)}
        title={upgradeModal?.title ?? ""}
        description={upgradeModal?.description ?? ""}
        upgradeUrl={`/organization/${organizationId}/upgrade`}
      />
    </>
  )
}
