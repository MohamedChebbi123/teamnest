"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Phone, Globe, Calendar, Tag, ShieldCheck, AlertCircle, Edit } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import Sidebar from "@/components/Sidebar/page"

interface UserProfile {
  user_id: number
  first_name: string
  last_name: string
  email: string
  phone_number: string | null
  country: string | null
  avatar_url: string | null
  user_tag: string
  joined_at: string | null
  last_login_at: string | null
  is_verified: boolean
  profile_completed: boolean
}

interface OrganizationData {
  organization_id: number
  organization_name: string
  organaization_picture: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [organization, setOrganization] = useState<OrganizationData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("access_token")
      
      if (!token) {
        setIsLoading(false)
        toast.error("Not authenticated", {
          description: "Please log in to view your profile"
        })
        router.replace("/auth/login")
        return
      }

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Session expired", {
              description: "Please log in again"
            })
            localStorage.removeItem("access_token")
            router.replace("/auth/login")
            return
          }
          throw new Error("Failed to fetch profile")
        }

        const data = await response.json()
        setProfile(data)
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error("Error", {
          description: error instanceof Error && error.name === "AbortError"
            ? "Profile request timed out. Please try again."
            : "Failed to load profile. Please try again."
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile not found</CardTitle>
            <CardDescription>Unable to load profile data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/auth/login")} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
    <Sidebar 
      onOrganizationFetched={(org) => setOrganization(org)}
    />
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-primary/20">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={`${profile.first_name} ${profile.last_name}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">
                    {profile.first_name[0]}{profile.last_name[0]}
                  </div>
                )}
              </div>
              <div className="flex-1 text-center md:text-left space-y-2">
                <CardTitle className="text-3xl">
                  {profile.first_name} {profile.last_name}
                </CardTitle>
                <div className="flex items-center justify-center md:justify-start gap-2 text-muted-foreground">
                  <Tag className="w-4 h-4" />
                  <span>#{profile.user_tag}</span>
                </div>
                {profile.is_verified && (
                  <div className="flex items-center justify-center md:justify-start gap-2 text-green-600">
                    <ShieldCheck className="w-5 h-5" />
                    <span className="font-medium">Verified Account</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Email */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="font-medium">Email</span>
                </div>
                <p className="text-lg ml-6">{profile.email}</p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="font-medium">Phone Number</span>
                </div>
                <p className="text-lg ml-6">{profile.phone_number || "Not provided"}</p>
              </div>

              {/* Country */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span className="font-medium">Country</span>
                </div>
                <p className="text-lg ml-6">{profile.country || "Not provided"}</p>
              </div>

              {/* Joined Date */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Joined</span>
                </div>
                <p className="text-lg ml-6">{formatDate(profile.joined_at)}</p>
              </div>
            </div>

            {/* Account Stats */}
            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">Account Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{profile.user_id}</p>
                  <p className="text-sm text-muted-foreground">User ID</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {profile.is_verified ? "Yes" : "No"}
                  </p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg col-span-2 md:col-span-1">
                  <p className="text-2xl font-bold text-primary">
                    {profile.last_login_at ? formatDate(profile.last_login_at) : "Never"}
                  </p>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  )
}
