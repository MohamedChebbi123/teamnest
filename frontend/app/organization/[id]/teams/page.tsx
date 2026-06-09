"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import Sidebar from "@/components/Sidebar/page"
import OrganizationNavBar from "@/components/OrganizationNavBar/page"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Users, ArrowRight, Calendar } from "lucide-react"
import { toast } from "sonner"
import { formatApiError } from "@/lib/utils"
import { getAccessToken } from "@/lib/auth"

interface Team {
  team_id: number
  team_name: string
  description?: string | null
  org_id: number
  created_at: string
}

export default function OrganizationTeamsPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = params.id as string

  const [teams, setTeams] = useState<Team[]>([])
  const [myTeamIds, setMyTeamIds] = useState<Set<number>>(new Set())
  const [isOrgOwner, setIsOrgOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      if (!organizationId) return
      setLoading(true)
      try {
        const token = getAccessToken()
        if (!token) {
          router.push("/auth/login")
          return
        }
        const [teamsRes, myTeamsRes, profileRes, membersRes] = await Promise.all([
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/teams`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/user/teams`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/profile`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/organization/${organizationId}/members`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
        ])
        if (teamsRes.ok) {
          setTeams(await teamsRes.json())
        } else if (teamsRes.status === 401) {
          router.push("/auth/login")
          return
        } else {
          const data = await teamsRes.json().catch(() => null)
          toast.error("Failed to load teams", {
            description: formatApiError(data?.detail, "Could not fetch teams"),
          })
        }
        if (myTeamsRes.ok) {
          const myTeams: Team[] = await myTeamsRes.json()
          setMyTeamIds(new Set(myTeams.map((t) => t.team_id)))
        }
        if (profileRes.ok && membersRes.ok) {
          const userData = await profileRes.json()
          const membersData = await membersRes.json()
          const me = membersData.find((m: any) => m.user_id === userData.user_id)
          setIsOrgOwner(me?.role_user === "OWNER")
        }
      } catch (error) {
        console.error("Error fetching teams:", error)
        toast.error("Network error", { description: "Could not reach server" })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [organizationId, router])

  const handleTeamClick = (e: React.MouseEvent, teamId: number) => {
    if (isOrgOwner || myTeamIds.has(teamId)) {
      router.push(`/organization/${organizationId}/${teamId}`)
    } else {
      e.preventDefault()
      toast.error("You are not a member of this channel", {
        description: "Join the team to access its content",
      })
    }
  }

  const filteredTeams = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teams
    return teams.filter(
      (t) =>
        t.team_name.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
    )
  }, [teams, search])

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return ""
    }
  }

  const initials = (name: string) =>
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <OrganizationNavBar />
        <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                Teams
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? "Loading…" : `${teams.length} team${teams.length === 1 ? "" : "s"} in this organization`}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams…"
                className="pl-9"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTeams.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search ? "No teams match your search." : "No teams in this organization yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTeams.map((team) => (
                <div
                  key={team.team_id}
                  onClick={(e) => handleTeamClick(e, team.team_id)}
                  role="button"
                  tabIndex={0}
                  className="group cursor-pointer"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      handleTeamClick(e as unknown as React.MouseEvent, team.team_id)
                    }
                  }}
                >
                  <Card className="h-full transition hover:border-primary hover:shadow-md">
                    <CardHeader className="flex flex-row items-start gap-3 space-y-0">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {initials(team.team_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{team.team_name}</CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(team.created_at)}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                        {team.description?.trim() || "No description provided."}
                      </p>
                      <div className="flex items-center justify-between mt-4">
                        <Badge variant="secondary" className="text-xs">Team</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1 group-hover:text-primary"
                        >
                          Open
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
