"use client"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { 
  Users, 
  Settings,
  Loader2,
  ArrowLeft,
  Edit,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Shield,
  Check,
  X,
  UserMinus,
} from "lucide-react"
import { toast } from "sonner"
import OrganizationNavBar from "@/components/OrganizationNavBar/page"
import MembersSidebar from "@/components/MembersSidebar/page"
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
  } | null
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
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false)

  // Current user's permissions
  const [currentUserPermissions, setCurrentUserPermissions] = useState<{
    can_manage_roles: boolean
    can_kick_members: boolean
  }>({ can_manage_roles: false, can_kick_members: false })

  const fetchTeamMembers = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return

      const response = await fetch(
        `http://localhost:8000/team/${teamId}/members`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setTeamMembers(data.members || [])
        
        // Set current user's permissions
        if (currentUserId !== null) {
          const currentUserMember = data.members.find((m: TeamMember) => m.user_id === currentUserId)
          if (currentUserMember && currentUserMember.permissions) {
            setCurrentUserPermissions({
              can_manage_roles: currentUserMember.permissions.can_manage_roles,
              can_kick_members: currentUserMember.permissions.can_kick_members
            })
          }
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
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

        // Fetch all teams and find the specific one
        const teamsResponse = await fetch(
          `http://localhost:8000/organization/${organizationId}/teams`,
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
          `http://localhost:8000/organization/${organizationId}/members`,
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
        await fetchTeamMembers()

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
        `http://localhost:8000/team/${teamId}`,
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
        `http://localhost:8000/team/${teamId}`,
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
            can_make_announcement: canMakeAnnouncement
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
        `http://localhost:8000/team/${teamId}/member/${editingMember.user_id}/permissions`,
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
            can_make_announcement: editCanMakeAnnouncement
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
        `http://localhost:8000/team/${teamId}/member/${memberId}`,
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

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <OrganizationNavBar organizationId={organizationId} />
        <MembersSidebar organizationId={organizationId} />
        <main className="flex-1 lg:ml-[560px] xl:ml-[680px] p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading team...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="min-h-screen flex">
        <OrganizationNavBar organizationId={organizationId} />
        <MembersSidebar organizationId={organizationId} />
        <main className="flex-1 lg:ml-[560px] xl:ml-[680px] p-4 md:p-6 lg:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Team not found</h1>
            <Button
              onClick={() => router.push(`/organization/${organizationId}`)}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organization
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-background">
      <OrganizationNavBar organizationId={organizationId} />
      <MembersSidebar organizationId={organizationId} />
      
      <main className="flex-1 lg:ml-[560px] xl:ml-[680px] p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/organization/${organizationId}`)}
            className="mb-4"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Organization</span>
            <span className="sm:hidden">Back</span>
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold break-words">{team.team_name}</h1>
              {team.description && (
                <p className="text-muted-foreground text-sm md:text-base">{team.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  Max: {team.team_size}
                </Badge>
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  Team ID: {team.team_id}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {(userRole === "OWNER" || userRole === "ADMIN") && (
                <>
                  <Button
                    variant="default"
                    onClick={() => setAddMemberDialogOpen(true)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(true)}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Team
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 gap-6">
          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                View and manage members in this team ({teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {teamMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-4">No team members yet</p>
                  {(userRole === "OWNER" || userRole === "ADMIN") && (
                    <Button onClick={() => setAddMemberDialogOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First Member
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                  {teamMembers.map((member) => (
                    <div
                      key={member.user_id}
                      onClick={() => handleMemberClick(member)}
                      className="flex flex-col items-center p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    >
                      <Avatar className="h-16 w-16 mb-3">
                        <AvatarImage src={member.avatar_url || undefined} alt={`${member.first_name} ${member.last_name}`} />
                        <AvatarFallback className="text-lg">
                          {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-center">
                        {member.first_name} {member.last_name}
                      </h3>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        {member.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Statistics or Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
              <CardDescription>Recent team activity and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p>Team activity tracking coming soon</p>
              </div>
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
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Member to Team</DialogTitle>
              <DialogDescription>
                Select an organization member and assign their role and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Member Selection */}
              <div className="grid gap-2">
                <Label htmlFor="select_member">Select Member *</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="select_member">
                    <SelectValue placeholder="Choose a member..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizationMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id.toString()}>
                        {member.first_name} {member.last_name} ({member.email}) - {member.role_user}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Input */}
              <div className="grid gap-2">
                <Label htmlFor="member_role">Role *</Label>
                <Input
                  id="member_role"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  placeholder="Enter role (e.g., MEMBER, ADMIN, MODERATOR)"
                />
              </div>

              {/* Permissions */}
              <div className="grid gap-4">
                <Label className="text-base font-semibold">Permissions</Label>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_create_channels"
                    checked={canCreateChannels}
                    onCheckedChange={(checked) => setCanCreateChannels(checked === true)}
                  />
                  <label 
                    htmlFor="can_create_channels" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can create channels
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_send_messages"
                    checked={canSendMessages}
                    onCheckedChange={(checked) => setCanSendMessages(checked === true)}
                  />
                  <label 
                    htmlFor="can_send_messages" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can send messages
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_make_announcement"
                    checked={canMakeAnnouncement}
                    onCheckedChange={(checked) => setCanMakeAnnouncement(checked === true)}
                  />
                  <label 
                    htmlFor="can_make_announcement" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can make announcement
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_delete_messages"
                    checked={canDeleteMessages}
                    onCheckedChange={(checked) => setCanDeleteMessages(checked === true)}
                  />
                  <label 
                    htmlFor="can_delete_messages" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can delete messages
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_manage_roles"
                    checked={canManageRoles}
                    onCheckedChange={(checked) => setCanManageRoles(checked === true)}
                  />
                  <label 
                    htmlFor="can_manage_roles" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can manage roles
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="can_kick_members"
                    checked={canKickMembers}
                    onCheckedChange={(checked) => setCanKickMembers(checked === true)}
                  />
                  <label 
                    htmlFor="can_kick_members" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can kick members
                  </label>
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
          <DialogContent className="max-w-[95vw] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Member Details</DialogTitle>
              <DialogDescription>
                View member information and permissions
              </DialogDescription>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-6 py-4">
                {/* Member Info */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={selectedMember.avatar_url || undefined} alt={`${selectedMember.first_name} ${selectedMember.last_name}`} />
                    <AvatarFallback className="text-2xl">
                      {selectedMember.first_name.charAt(0)}{selectedMember.last_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">
                      {selectedMember.first_name} {selectedMember.last_name}
                    </h3>
                    {selectedMember.user_tag && (
                      <p className="text-muted-foreground">@{selectedMember.user_tag}</p>
                    )}
                  </div>
                  <Badge variant="default" className="h-fit">
                    <Shield className="h-3 w-3 mr-1" />
                    {selectedMember.role}
                  </Badge>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Contact Information
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedMember.email}</span>
                    </div>
                    {selectedMember.phone_number && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedMember.phone_number}</span>
                      </div>
                    )}
                    {selectedMember.country && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedMember.country}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Permissions */}
                {selectedMember.permissions && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Permissions
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <span className="text-sm font-medium">Create Channels</span>
                        {selectedMember.permissions.can_create_channels ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <span className="text-sm font-medium">Send Messages</span>
                        {selectedMember.permissions.can_send_messages ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <span className="text-sm font-medium">Delete Messages</span>
                        {selectedMember.permissions.can_delete_messages ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <span className="text-sm font-medium">Manage Roles</span>
                        {selectedMember.permissions.can_manage_roles ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <span className="text-sm font-medium">Kick Members</span>
                        {selectedMember.permissions.can_kick_members ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 text-red-600" />
                        )}
                      </div>

                      <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
                        <span className="text-sm font-medium">Make Announcement</span>
                        {selectedMember.permissions.can_make_announcement ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex gap-2 flex-1">
                {(userRole === "OWNER" || userRole === "ADMIN" || currentUserPermissions.can_manage_roles) && selectedMember && selectedMember.user_id !== currentUserId && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleEditPermissions(selectedMember)}
                    className="flex-1 sm:flex-none"
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
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Kick Member
                  </Button>
                )}
              </div>
              <Button variant="secondary" onClick={() => setMemberDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Permissions Dialog */}
        <Dialog open={editPermissionsOpen} onOpenChange={setEditPermissionsOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Member Permissions</DialogTitle>
              <DialogDescription>
                Update {editingMember?.first_name} {editingMember?.last_name}'s role and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Role Input */}
              <div className="grid gap-2">
                <Label htmlFor="edit_role">Role *</Label>
                <Input
                  id="edit_role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  placeholder="Enter role (e.g., MEMBER, ADMIN, MODERATOR)"
                />
              </div>

              {/* Permissions */}
              <div className="grid gap-4">
                <Label className="text-base font-semibold">Permissions</Label>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_can_create_channels"
                    checked={editCanCreateChannels}
                    onCheckedChange={(checked) => setEditCanCreateChannels(checked === true)}
                  />
                  <label 
                    htmlFor="edit_can_create_channels" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can create channels
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_can_send_messages"
                    checked={editCanSendMessages}
                    onCheckedChange={(checked) => setEditCanSendMessages(checked === true)}
                  />
                  <label 
                    htmlFor="edit_can_send_messages" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can send messages
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_can_delete_messages"
                    checked={editCanDeleteMessages}
                    onCheckedChange={(checked) => setEditCanDeleteMessages(checked === true)}
                  />
                  <label 
                    htmlFor="edit_can_delete_messages" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can delete messages
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_can_manage_roles"
                    checked={editCanManageRoles}
                    onCheckedChange={(checked) => setEditCanManageRoles(checked === true)}
                  />
                  <label 
                    htmlFor="edit_can_manage_roles" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can manage roles
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_can_kick_members"
                    checked={editCanKickMembers}
                    onCheckedChange={(checked) => setEditCanKickMembers(checked === true)}
                  />
                  <label 
                    htmlFor="edit_can_kick_members" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can kick members
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit_can_make_announcement"
                    checked={editCanMakeAnnouncement}
                    onCheckedChange={(checked) => setEditCanMakeAnnouncement(checked === true)}
                  />
                  <label 
                    htmlFor="edit_can_make_announcement" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Can make announcement
                  </label>
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
      </main>
    </div>
  )
}
