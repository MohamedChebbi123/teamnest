"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { 
  Building2, 
  UserPlus, 
  Search, 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  Settings,
  Loader2,
  X,
  MoreVertical,
  Edit,
  Trash2
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

export default function OrganizationNavBar({ organizationId, onClose }: OrganizationNavBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [organization, setOrganization] = useState<OrganizationDetails | null>(null)
  const [userRole, setUserRole] = useState<string>("MEMBER")
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)

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
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          setCurrentUserId(userData.user_id)
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
          const currentUserMember = membersData.find((member: Member) => member.user_id === currentUserId)
          if (currentUserMember) {
            setUserRole(currentUserMember.role_user)
          }
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
  }, [organizationId, router, currentUserId])

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

  const handleAddMember = () => {
    const event = new CustomEvent('openAddMemberDialog')
    window.dispatchEvent(event)
  }

  const getInitials = (firstName: string, lastName: string) => {
    const initials = (firstName?.[0] || '') + (lastName?.[0] || '')
    return initials.toUpperCase() || '??'
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "OWNER":
        return "default"
      case "ADMIN":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <aside className="fixed left-20 top-0 h-screen w-72 bg-background border-r flex items-center justify-center z-30">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </aside>
    )
  }

  if (!organization) {
    return null
  }

  return (
    <aside className="fixed left-20 top-0 h-screen w-72 bg-background border-r flex flex-col z-30 shadow-sm">
      {/* Organization Header */}
      <div className="p-4 border-b space-y-3">
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
      </div>

      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
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
                  className={cn(
                    "w-full justify-start gap-3 h-9",
                    active && "bg-primary/10 text-primary hover:bg-primary/15"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm">{tab.name}</span>
                </Button>
              )
            })}
        </div>

        <Separator className="my-3" />

        {/* Quick Actions */}
        {(userRole === "OWNER" || userRole === "ADMIN") && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground px-3 py-2">QUICK ACTIONS</p>
            <Button
              variant="ghost"
              onClick={handleAddMember}
              className="w-full justify-start gap-3 h-9"
            >
              <UserPlus className="h-4 w-4" />
              <span className="text-sm">Add Member</span>
            </Button>
          </div>
        )}

        <Separator className="my-3" />

        {/* Members List */}
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-xs font-semibold text-muted-foreground">MEMBERS</p>
            <Badge variant="secondary" className="text-xs">
              {members.length}
            </Badge>
          </div>
          <div className="space-y-0.5 max-h-64 overflow-y-auto">
            {members.slice(0, 10).map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src={member.profile_picture} alt={`${member.first_name} ${member.last_name}`} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(member.first_name, member.last_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {member.first_name} {member.last_name}
                  </p>
                  <Badge 
                    variant={getRoleBadgeVariant(member.role_user)} 
                    className="text-[10px] h-4 px-1"
                  >
                    {member.role_user}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          {members.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/organization/${organizationId}/members`)}
              className="w-full text-xs text-muted-foreground"
            >
              View all {members.length} members
            </Button>
          )}
        </div>
      </nav>
    </aside>
  )
}
