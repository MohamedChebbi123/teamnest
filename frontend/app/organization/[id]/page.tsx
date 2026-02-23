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
import { Building2, Loader2, Users, Settings, Calendar, UserPlus, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"
import MembersSidebar from "@/components/MembersSidebar/page"
import OrganizationNavBar from "@/components/OrganizationNavBar/page"

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
  
  // Edit organization states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPlan, setEditPlan] = useState("")
  const [editImage, setEditImage] = useState<File | null>(null)
  const [updating, setUpdating] = useState(false)
  
  // Delete organization states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
        const userResponse = await fetch("http://localhost:8000/profile", {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setCurrentUserId(userData.user_id)
        }

        const response = await fetch("http://localhost:8000/get_org_for_admin_org", {
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
            setEditPlan(foundOrg.organization_plan || "free")
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

      const response = await fetch(`http://localhost:8000/organization/${organizationId}/add_member`, {
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
        toast.error("Permission denied", {
          description: data.detail || "You don't have permission to add members"
        })
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
      formData.append('organization_plan', editPlan)
      if (editImage) {
        formData.append('image', editImage)
      }

      const response = await fetch(`http://localhost:8000/organization/${organizationId}`, {
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

      const response = await fetch(`http://localhost:8000/organization/${organizationId}`, {
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

  const isOwner = organization?.owner_id === currentUserId

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="min-h-screen w-full flex items-center justify-center">
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
        <div className="min-h-screen w-full flex items-center justify-center">
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
    
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8" style={{ marginLeft: '368px', marginRight: '320px' }}>
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Organization Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-6">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={organization.organaization_picture} alt={organization.organization_name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    <Building2 className="h-12 w-12" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-3xl">{organization.organization_name}</CardTitle>
                      <Badge variant="secondary" className="text-sm">
                        #{organization.organaization_tag}
                      </Badge>
                      {organization.organization_plan && (
                        <Badge variant={organization.organization_plan === "pro" ? "default" : "outline"}>
                          {organization.organization_plan.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    {organization.organization_description && (
                      <CardDescription className="mt-2 text-base">
                        {organization.organization_description}
                      </CardDescription>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <Dialog open={addMemberDialogOpen} onOpenChange={setAddMemberDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="default">
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
                            onClick={() => {
                              setAddMemberDialogOpen(false)
                              setUserTag("")
                              setRoleUser("MEMBER")
                            }}
                            disabled={addingMember}
                          >
                            Cancel
                          </Button>
                          <Button onClick={handleAddMember} disabled={addingMember}>
                            {addingMember ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              "Add Member"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      View Members
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Organization Settings</DropdownMenuLabel>
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
                    
                    {/* Edit Dialog */}
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                      <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Organization</DialogTitle>
                              <DialogDescription>
                                Update your organization details
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label htmlFor="editName">Organization Name</Label>
                                <Input
                                  id="editName"
                                  placeholder="Enter organization name"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="editDescription">Description</Label>
                                <Input
                                  id="editDescription"
                                  placeholder="Enter organization description"
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="editPlan">Plan</Label>
                                <select
                                  id="editPlan"
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                  value={editPlan}
                                  onChange={(e) => setEditPlan(e.target.value)}
                                >
                                  <option value="free">Free</option>
                                  <option value="pro">Pro</option>
                                  <option value="enterprise">Enterprise</option>
                                </select>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="editImage">Organization Image</Label>
                                <Input
                                  id="editImage"
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => setEditImage(e.target.files?.[0] || null)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setEditDialogOpen(false)
                                  setEditName(organization.organization_name)
                                  setEditDescription(organization.organization_description || "")
                                  setEditPlan(organization.organization_plan || "free")
                                  setEditImage(null)
                                }}
                                disabled={updating}
                              >
                                Cancel
                              </Button>
                              <Button onClick={handleEditOrganization} disabled={updating}>
                                {updating ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  "Save Changes"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                    
                    {/* Delete Dialog */}
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                      <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Organization</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete {organization.organization_name}? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setDeleteDialogOpen(false)}
                                disabled={deleting}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={handleDeleteOrganization}
                                disabled={deleting}
                              >
                                {deleting ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                  </>
                                ) : (
                                  "Delete Organization"
                                )}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Organization Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No members yet</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">No teams yet</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Plan</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {organization.organization_plan || "Free"}
                </div>
                <p className="text-xs text-muted-foreground">Current subscription</p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Content Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates in your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No recent activity
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setAddMemberDialogOpen(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Team Members
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Create a Team
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  Organization Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <MembersSidebar organizationId={organizationId as string} />
    </>
  )
}
