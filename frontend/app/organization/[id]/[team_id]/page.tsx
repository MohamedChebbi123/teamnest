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
import { 
  Users, 
  Settings,
  Loader2,
  ArrowLeft,
  Edit,
  UserPlus,
  Check,
  X,
  UserX,
  Shield,
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
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
  profile_picture: string | null
  role_user: string
}

interface TeamMember {
  user_id: number
  first_name: string
  last_name: string
  email: string
  profile_picture: string | null
  role: string
  permissions: {
    can_create_channels: boolean
    can_send_messages: boolean
    can_delete_messages: boolean
    can_manage_roles: boolean
    can_kick_members: boolean
  }
  joined_at: string | null
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
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Member details dialog
  const [memberDetailsDialogOpen, setMemberDetailsDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  // Edit member role dialog
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false)
  const [editRole, setEditRole] = useState<string>("MEMBER")
  const [editCanCreateChannels, setEditCanCreateChannels] = useState(false)
  const [editCanSendMessages, setEditCanSendMessages] = useState(true)
  const [editCanDeleteMessages, setEditCanDeleteMessages] = useState(false)
  const [editCanManageRoles, setEditCanManageRoles] = useState(false)
  const [editCanKickMembers, setEditCanKickMembers] = useState(false)
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)
  const [currentUserPermissions, setCurrentUserPermissions] = useState<TeamMember['permissions'] | null>(null)

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
        const membersData = await response.json()
        setTeamMembers(membersData)
        
        // Set current user's permissions
        if (currentUserId) {
          const currentUser = membersData.find((m: TeamMember) => m.user_id === currentUserId)
          if (currentUser) {
            setCurrentUserPermissions(currentUser.permissions)
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
            can_kick_members: canKickMembers
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
        // Refresh team members list
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

  const handleKickMember = async (memberUserId: number) => {
    if (!confirm(`Are you sure you want to remove this member from the team?`)) {
      return
    }

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `http://localhost:8000/team/${teamId}/member/${memberUserId}`,
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
          description: "Member removed from team successfully"
        })
        setMemberDetailsDialogOpen(false)
        await fetchTeamMembers()
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to remove member"
        })
      }
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error("Error", {
        description: "An error occurred while removing member"
      })
    }
  }

  const handleOpenEditRole = (member: TeamMember) => {
    setEditRole(member.role)
    setEditCanCreateChannels(member.permissions.can_create_channels)
    setEditCanSendMessages(member.permissions.can_send_messages)
    setEditCanDeleteMessages(member.permissions.can_delete_messages)
    setEditCanManageRoles(member.permissions.can_manage_roles)
    setEditCanKickMembers(member.permissions.can_kick_members)
    setEditRoleDialogOpen(true)
  }

  const handleUpdateRole = async () => {
    if (!selectedMember) return

    setIsUpdatingRole(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `http://localhost:8000/team/${teamId}/member/${selectedMember.user_id}/role`,
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
            can_kick_members: editCanKickMembers
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Member role updated successfully"
        })
        setEditRoleDialogOpen(false)
        setMemberDetailsDialogOpen(false)
        await fetchTeamMembers()
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to update member role"
        })
      }
    } catch (error) {
      console.error('Error updating member role:', error)
      toast.error("Error", {
        description: "An error occurred while updating member role"
      })
    } finally {
      setIsUpdatingRole(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex">
        <OrganizationNavBar organizationId={organizationId} />
        <MembersSidebar organizationId={organizationId} />
        <main className="flex-1 ml-[680px] p-8">
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
        <main className="flex-1 ml-[680px] p-8">
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
      
      <main className="flex-1 ml-[680px] p-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(`/organization/${organizationId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organization
          </Button>

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold">{team.team_name}</h1>
              {team.description && (
                <p className="text-muted-foreground">{team.description}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">
                  <Users className="h-3 w-3 mr-1" />
                  Max: {team.team_size} members
                </Badge>
                <Badge variant="outline">
                  Team ID: {team.team_id}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              {(userRole === "OWNER" || userRole === "ADMIN") && (
                <>
                  <Button
                    variant="default"
                    onClick={() => setAddMemberDialogOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(true)}
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
                View and manage members in this team
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
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.user_id}
                      onClick={() => {
                        setSelectedMember(member)
                        setMemberDetailsDialogOpen(true)
                      }}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.profile_picture || undefined} alt={`${member.first_name} ${member.last_name}`} />
                        <AvatarFallback>
                          {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{member.first_name} {member.last_name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <Badge variant="secondary">{member.role}</Badge>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={member.profile_picture || undefined} alt={`${member.first_name} ${member.last_name}`} />
                            <AvatarFallback className="text-xs">
                              {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{member.first_name} {member.last_name} ({member.email}) - {member.role_user}</span>
                        </div>
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
        <Dialog open={memberDetailsDialogOpen} onOpenChange={setMemberDetailsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Team Member Details</DialogTitle>
              <DialogDescription>
                View member information and permissions
              </DialogDescription>
            </DialogHeader>
            {selectedMember && (
              <div className="space-y-6">
                {/* Member Info */}
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedMember.profile_picture || undefined} alt={`${selectedMember.first_name} ${selectedMember.last_name}`} />
                    <AvatarFallback className="text-lg">
                      {selectedMember.first_name.charAt(0)}{selectedMember.last_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{selectedMember.first_name} {selectedMember.last_name}</h3>
                    <p className="text-muted-foreground">{selectedMember.email}</p>
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-sm">{selectedMember.role}</Badge>
                    </div>
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <h4 className="font-semibold mb-3">Permissions</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">Can create channels</span>
                      {selectedMember.permissions.can_create_channels ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">Can send messages</span>
                      {selectedMember.permissions.can_send_messages ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">Can delete messages</span>
                      {selectedMember.permissions.can_delete_messages ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">Can manage roles</span>
                      {selectedMember.permissions.can_manage_roles ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <span className="text-sm">Can kick members</span>
                      {selectedMember.permissions.can_kick_members ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <X className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {selectedMember.joined_at && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Joined: {new Date(selectedMember.joined_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <div className="flex justify-between w-full">
                <div className="flex gap-2">
                  {/* Show kick button if user has can_kick_members permission or is OWNER/ADMIN */}
                  {selectedMember && selectedMember.user_id !== currentUserId && 
                   (userRole === "OWNER" || userRole === "ADMIN" || currentUserPermissions?.can_kick_members) && (
                    <Button
                      variant="destructive"
                      onClick={() => handleKickMember(selectedMember.user_id)}
                    >
                      <UserX className="h-4 w-4 mr-2" />
                      Remove Member
                    </Button>
                  )}
                  {/* Show edit role button if user has can_manage_roles permission or is OWNER/ADMIN */}
                  {selectedMember && 
                   (userRole === "OWNER" || userRole === "ADMIN" || currentUserPermissions?.can_manage_roles) && (
                    <Button
                      variant="default"
                      onClick={() => {
                        handleOpenEditRole(selectedMember)
                      }}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Manage Role
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setMemberDetailsDialogOpen(false)}
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Member Role Dialog */}
        <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Member Role & Permissions</DialogTitle>
              <DialogDescription>
                Update the role and permissions for {selectedMember?.first_name} {selectedMember?.last_name}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Role Input */}
              <div className="grid gap-2">
                <Label htmlFor="edit_member_role">Role *</Label>
                <Input
                  id="edit_member_role"
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
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditRoleDialogOpen(false)}
                disabled={isUpdatingRole}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={isUpdatingRole}
              >
                {isUpdatingRole ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Update Role
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
