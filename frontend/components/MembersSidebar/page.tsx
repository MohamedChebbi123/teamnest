"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Member {
  user_id: number
  first_name: string
  last_name: string
  email: string
  profile_picture?: string
  role_user: string
  joined_at?: string
}

interface MembersSidebarProps {
  organizationId: string | number
}

export default function MembersSidebar({ organizationId }: MembersSidebarProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        const response = await fetch(`http://localhost:8000/organization/${organizationId}/members`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setMembers(data)
        } else if (response.status === 401) {
          toast.error("Session expired", {
            description: "Please log in again"
          })
          router.push('/auth/login')
        } else {
          throw new Error("Failed to fetch members")
        }
      } catch (error) {
        console.error('Error fetching members:', error)
        toast.error("Error", {
          description: "Failed to load members"
        })
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      fetchMembers()
    }
  }, [organizationId, router])

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

  const getInitials = (firstName: string, lastName: string) => {
    const initials = (firstName?.[0] || '') + (lastName?.[0] || '')
    return initials.toUpperCase() || '??'
  }

  return (
    <>
      {/* Sidebar - Always visible but collapsible */}
      <div
        className={`fixed top-0 right-0 h-full bg-background border-l border-border shadow-lg transition-all duration-300 ease-in-out z-40 ${
          isOpen ? 'w-80' : 'w-0'
        }`}
      >
        {/* Toggle Arrow Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -left-8 top-1/2 -translate-y-1/2 bg-background border border-border rounded-l-lg p-2 hover:bg-muted transition-colors shadow-md z-50"
        >
          {isOpen ? (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Sidebar Content */}
        <div className={`h-full flex flex-col ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-lg">Members</h3>
              <Badge variant="secondary" className="ml-1">
                {members.length}
              </Badge>
            </div>
          </div>

          {/* Members List */}
          <div className="overflow-y-auto h-[calc(100vh-73px)] p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading members...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center p-4">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No members found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <Avatar className="h-10 w-10 border-2 border-background">
                    <AvatarImage src={member.profile_picture} alt={`${member.first_name} ${member.last_name}`} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(member.first_name, member.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {member.first_name} {member.last_name}
                      </p>
                      <Badge 
                        variant={getRoleBadgeVariant(member.role_user)}
                        className="text-xs h-5"
                      >
                        {member.role_user}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  )
}
