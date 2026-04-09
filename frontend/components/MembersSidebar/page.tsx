"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, ChevronLeft, ChevronRight, Loader2, Mail, Phone, Globe, X, UserPlus, Check } from "lucide-react"
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
  teamId?: string | number
  isOpen?: boolean
  onToggle?: (open: boolean) => void
}

interface TeamSummary {
  team_id: number
  team_name: string
}

interface MemberDetailsResponse {
  user: {
    user_id: number
    first_name: string
    last_name: string
    email: string
    avatar_url?: string | null
    user_tag?: string | null
    phone_number?: string | null
    country?: string | null
  }
  organization_id?: number
  team?: {
    team_id: number
    team_name: string
    role: string
    permissions: {
      can_create_channels: boolean
      can_send_messages: boolean
      can_delete_messages: boolean
      can_manage_roles: boolean
      can_kick_members: boolean
      can_make_announcement: boolean
    }
  }
}

type TeamInfo = NonNullable<MemberDetailsResponse["team"]>
type PermissionKey = keyof TeamInfo["permissions"]

export default function MembersSidebar({ organizationId, teamId, isOpen: isOpenProp, onToggle }: MembersSidebarProps) {
  const router = useRouter()
  const [isOpenInternal, setIsOpenInternal] = useState(true)
  const isControlled = isOpenProp !== undefined
  const isOpen = isControlled ? isOpenProp : isOpenInternal
  const setIsOpen = (val: boolean) => {
    if (isControlled) {
      onToggle?.(val)
    } else {
      setIsOpenInternal(val)
    }
  }
  const [sidebarWidth, setSidebarWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null)
  const [memberDetails, setMemberDetails] = useState<MemberDetailsResponse | null>(null)
  const [memberTeamDetails, setMemberTeamDetails] = useState<NonNullable<MemberDetailsResponse["team"]>[]>([])
  const [loadingMemberDetails, setLoadingMemberDetails] = useState(false)
  const [revokingPermissionKey, setRevokingPermissionKey] = useState<string | null>(null)
  const [directMessageDraft, setDirectMessageDraft] = useState("")
  const [sendingFriendRequest, setSendingFriendRequest] = useState(false)
  const [friendRequestSent, setFriendRequestSent] = useState(false)

  const minWidth = 250;
  const maxWidth = 500;

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      // Close sidebar on mobile by default
      if (mobile && isOpenInternal) {
        setIsOpenInternal(false);
      }
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
      
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
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

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/members`, {
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

  const fetchMemberDetails = async (memberUserId: number) => {
    setSelectedMemberId(memberUserId)
    setMemberTeamDetails([])

    const selectedMember = members.find((member) => member.user_id === memberUserId)

    if (!teamId) {
      if (!selectedMember) return

      const token = localStorage.getItem("access_token")
      if (!token) {
        router.push("/auth/login")
        return
      }

      setMemberDetails({
        user: {
          user_id: selectedMember.user_id,
          first_name: selectedMember.first_name,
          last_name: selectedMember.last_name,
          email: selectedMember.email,
          avatar_url: selectedMember.profile_picture || null,
          user_tag: null,
          phone_number: null,
          country: null,
        },
      })

      try {
        setLoadingMemberDetails(true)

        const teamsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/teams`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!teamsResponse.ok) {
          if (teamsResponse.status === 401) {
            toast.error("Session expired", {
              description: "Please log in again"
            })
            router.push("/auth/login")
            return
          }
          throw new Error("Failed to fetch organization teams")
        }

        const teams: TeamSummary[] = await teamsResponse.json()

        const teamDetails = await Promise.all(
          teams.map(async (team) => {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${team.team_id}/member/${memberUserId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            )

            if (response.ok) {
              const data: MemberDetailsResponse = await response.json()
              return data.team || null
            }

            if (response.status === 404) {
              return null
            }

            if (response.status === 401) {
              throw new Error("UNAUTHORIZED")
            }

            return null
          })
        )

        const availableTeamDetails = teamDetails.filter(
          (team): team is NonNullable<MemberDetailsResponse["team"]> => team !== null
        )

        setMemberTeamDetails(availableTeamDetails)
      } catch (error) {
        console.error("Error fetching team permissions:", error)

        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          toast.error("Session expired", {
            description: "Please log in again"
          })
          router.push("/auth/login")
        } else {
          toast.error("Error", {
            description: "Failed to load team permissions"
          })
        }
      } finally {
        setLoadingMemberDetails(false)
      }

      return
    }

    try {
      setLoadingMemberDetails(true)

      const token = localStorage.getItem("access_token")
      if (!token) {
        router.push("/auth/login")
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/team/${teamId}/member/${memberUserId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setMemberDetails(data)
        setMemberTeamDetails(data.team ? [data.team] : [])
      } else if (response.status === 401) {
        toast.error("Session expired", {
          description: "Please log in again"
        })
        router.push("/auth/login")
      } else if (response.status === 404) {
        toast.error("Member not found", {
          description: "This user is not in this team"
        })
      } else {
        throw new Error("Failed to fetch member details")
      }
    } catch (error) {
      console.error("Error fetching member details:", error)
      toast.error("Error", {
        description: "Failed to load member details"
      })
    } finally {
      setLoadingMemberDetails(false)
    }
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

  const getInitials = (firstName: string, lastName: string) => {
    const initials = (firstName?.[0] || '') + (lastName?.[0] || '')
    return initials.toUpperCase() || '??'
  }

  const permissionLabelMap: Record<string, string> = {
    can_create_channels: "Create channels",
    can_send_messages: "Send messages",
    can_delete_messages: "Delete messages",
    can_manage_roles: "Manage roles",
    can_kick_members: "Kick members",
    can_make_announcement: "Make announcements",
  }

  const selectedMember = selectedMemberId !== null
    ? members.find((member) => member.user_id === selectedMemberId)
    : null

  const closeProfileCard = () => {
    setSelectedMemberId(null)
    setMemberDetails(null)
    setMemberTeamDetails([])
    setRevokingPermissionKey(null)
    setDirectMessageDraft("")
    setSendingFriendRequest(false)
    setFriendRequestSent(false)
  }

  const sendFriendRequest = async () => {
    if (!memberDetails?.user.user_id) return

    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/auth/login")
      return
    }

    setSendingFriendRequest(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/request`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiver_id: memberDetails.user.user_id }),
      })

      if (response.ok) {
        setFriendRequestSent(true)
        toast.success("Friend request sent!")
      } else {
        const data = await response.json().catch(() => null)
        toast.error("Failed to send request", {
          description: data?.detail || "Something went wrong"
        })
      }
    } catch (error) {
      console.error("Error sending friend request:", error)
      toast.error("Error", {
        description: "Failed to send friend request"
      })
    } finally {
      setSendingFriendRequest(false)
    }
  }

  const startDirectChat = () => {
    if (!memberDetails) return

    const trimmedMessage = directMessageDraft.trim()
    if (!trimmedMessage) {
      toast.error("Message required", {
        description: "Write a message before opening chat"
      })
      return
    }

    const receiverId = memberDetails.user.user_id
    const receiverName = `${memberDetails.user.first_name} ${memberDetails.user.last_name}`

    router.push(
      `/direct-messages?dm_user_id=${receiverId}&dm_name=${encodeURIComponent(receiverName)}&initial_message=${encodeURIComponent(trimmedMessage)}`
    )
    setDirectMessageDraft("")
  }

  const revokePermission = async (team: TeamInfo, permissionKey: PermissionKey) => {
    if (selectedMemberId === null) return

    const token = localStorage.getItem("access_token")
    if (!token) {
      router.push("/auth/login")
      return
    }

    const requestKey = `${team.team_id}-${permissionKey}`
    setRevokingPermissionKey(requestKey)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/team/${team.team_id}/member/${selectedMemberId}/revoke-permissions?permission_name=${permissionKey}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setMemberTeamDetails((previous) =>
          previous.map((item) =>
            item.team_id === team.team_id
              ? {
                  ...item,
                  role: data.role || item.role,
                  permissions: data.permissions || item.permissions,
                }
              : item
          )
        )
        toast.success("Permission removed")
        return
      }

      if (response.status === 401) {
        toast.error("Session expired", {
          description: "Please log in again"
        })
        router.push("/auth/login")
        return
      }

      if (response.status === 403) {
        toast.error("Not allowed", {
          description: "Only owner or members with manage roles can do this"
        })
        return
      }

      const errorBody = await response.json().catch(() => null)
      throw new Error(errorBody?.detail || "Failed to revoke permission")
    } catch (error) {
      console.error("Error revoking permission:", error)
      toast.error("Error", {
        description: error instanceof Error ? error.message : "Failed to revoke permission"
      })
    } finally {
      setRevokingPermissionKey(null)
    }
  }

  return (
    <>
      {/* Sidebar - Always visible but collapsible */}
      <div
        style={{ width: isOpen ? (isMobile ? '280px' : `${sidebarWidth}px`) : '0px' }}
        className={`fixed top-0 right-0 h-full bg-muted/40 border-l border-border shadow-lg backdrop-blur-[1px] transition-all duration-300 ease-in-out z-40 ${
          isResizing ? 'select-none' : ''
        }`}
      >
        {/* Resize Handle - Hidden on mobile */}
        {isOpen && !isMobile && (
          <div
            onMouseDown={startResizing}
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-50"
          />
        )}
        {/* Toggle Arrow Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -left-8 top-1/2 -translate-y-1/2 bg-muted/60 border border-border rounded-l-lg p-2 hover:bg-accent transition-colors shadow-md z-50"
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
            {loadingMemberDetails && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
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
                  <button
                    key={member.user_id}
                    onClick={() => fetchMemberDetails(member.user_id)}
                    className={`flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent/40 cursor-pointer ${
                      selectedMemberId === member.user_id ? "ring-2 ring-primary/30" : ""
                    }`}
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
                  </button>
                ))}
              </div>
            )}
            </div>
        </div>
      </div>

      {isOpen && selectedMemberId !== null && memberDetails && (
        <div
          className={`fixed z-50 ${isMobile ? "left-4 right-4 top-20" : "w-[340px]"}`}
          style={
            isMobile
              ? undefined
              : {
                  top: "84px",
                  right: `${sidebarWidth + 16}px`,
                }
          }
        >
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="h-24 bg-gradient-to-r from-muted via-muted/80 to-muted/60" />

            <div className="relative px-4 pb-4">
              <button
                onClick={closeProfileCard}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground hover:bg-background"
                aria-label="Close profile panel"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="-mt-10 flex items-end gap-3">
                <Avatar className="h-20 w-20 border-4 border-card">
                  <AvatarImage
                    src={memberDetails.user.avatar_url || undefined}
                    alt={`${memberDetails.user.first_name} ${memberDetails.user.last_name}`}
                  />
                  <AvatarFallback className="bg-primary/20 text-primary text-lg">
                    {getInitials(memberDetails.user.first_name, memberDetails.user.last_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="pb-2 min-w-0">
                  <p className="text-xl font-bold text-foreground truncate">
                    {memberDetails.user.first_name} {memberDetails.user.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {memberDetails.user.user_tag || selectedMember?.email || "Member"}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{memberDetails.user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{memberDetails.user.phone_number || "No phone number"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{memberDetails.user.country || "No country"}</span>
                </div>
                {selectedMember?.role_user && (
                  <Badge variant={getRoleBadgeVariant(selectedMember.role_user)} className="text-[10px]">
                    {selectedMember.role_user}
                  </Badge>
                )}
              </div>

              {/* Send Friend Request */}
              <div className="mt-4">
                <Button
                  onClick={sendFriendRequest}
                  disabled={sendingFriendRequest || friendRequestSent}
                  variant={friendRequestSent ? "secondary" : "outline"}
                  className="w-full"
                  size="sm"
                >
                  {sendingFriendRequest ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : friendRequestSent ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  {friendRequestSent ? "Request Sent" : "Send Friend Request"}
                </Button>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Direct Message</p>
                <Input
                  value={directMessageDraft}
                  onChange={(event) => setDirectMessageDraft(event.target.value)}
                  placeholder="Write a message..."
                  className="h-9"
                />
                <Button onClick={startDirectChat} className="w-full" size="sm">
                  Send And Open Chat
                </Button>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Team Access</p>
                {loadingMemberDetails ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading permissions...
                  </div>
                ) : memberTeamDetails.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-auto pr-1">
                    {memberTeamDetails.map((team) => (
                      <div key={team.team_id} className="rounded-lg border border-border bg-card p-2">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-foreground truncate">{team.team_name}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {team.role}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(team.permissions)
                            .filter(([, value]) => value)
                            .map(([key]) => (
                              <button
                                key={`${team.team_id}-${key}`}
                                onClick={() => revokePermission(team, key as PermissionKey)}
                                disabled={revokingPermissionKey === `${team.team_id}-${key}`}
                                className="disabled:opacity-60"
                                title="Remove permission"
                              >
                                <Badge className="text-[10px] gap-1 pr-1.5">
                                  {permissionLabelMap[key]}
                                  {revokingPermissionKey === `${team.team_id}-${key}` ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3" />
                                  )}
                                </Badge>
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No team permissions found for this member in this organization.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
