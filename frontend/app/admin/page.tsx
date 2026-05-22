"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users as UsersIcon, Building2, LogOut, Loader2 } from "lucide-react"
import { authFetch, hydrateAccessToken, getAccessToken, logout } from "@/lib/auth"
import { toast } from "sonner"

interface Overview {
  users_count: number
  organizations_count: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const token = getAccessToken() ?? (await hydrateAccessToken())
      if (!token) {
        router.replace("/auth/login")
        return
      }

      try {
        const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/overview`)
        if (res.status === 403) {
          toast.error("Access denied", { description: "You are not an administrator." })
          router.replace("/home")
          return
        }
        if (!res.ok) {
          throw new Error("Failed to load admin overview")
        }
        const json = (await res.json()) as Overview
        setData(json)
      } catch (err) {
        toast.error("Error", {
          description: err instanceof Error ? err.message : "Failed to load dashboard",
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await logout()
    router.replace("/auth/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Website Owner Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Platform-wide overview
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
              <UsersIcon className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{data?.users_count ?? 0}</div>
              <CardDescription className="mt-2">
                Registered users on the platform
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Organizations
              </CardTitle>
              <Building2 className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{data?.organizations_count ?? 0}</div>
              <CardDescription className="mt-2">
                Organizations created on the platform
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
