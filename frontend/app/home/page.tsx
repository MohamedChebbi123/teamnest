"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/auth/login")
        return
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_org_for_admin_org`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const orgs = await response.json()
          if (orgs && orgs.length > 0) {
            router.replace(`/organization/${orgs[0].organization_id}`)
            return
          }
        }

        router.replace("/welcome")
      } catch {
        router.replace("/welcome")
      }
    }

    checkUserAndRedirect()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-foreground flex items-center justify-center">
          <span className="text-background font-bold text-lg">TN</span>
        </div>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground border-t-transparent" />
      </div>
    </div>
  )
}
