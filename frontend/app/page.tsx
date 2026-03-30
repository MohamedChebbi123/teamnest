"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      const token = localStorage.getItem("access_token")
      if (!token) {
        router.replace("/auth/login")
        return
      }

      try {
        // Check if user has any organizations
        const response = await fetch("http://localhost:8000/get_org_for_admin_org", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const orgs = await response.json()
          if (orgs && orgs.length > 0) {
            // User has orgs — go to their first organization
            router.replace(`/organization/${orgs[0].organization_id}`)
            return
          }
        }

        // No orgs or error — show welcome page
        router.replace("/welcome")
      } catch {
        // Network error — show welcome page as fallback
        router.replace("/welcome")
      }
    }

    checkUserAndRedirect()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-lg">TN</span>
        </div>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </div>
  )
}
