"use client"

import { useEffect, useState } from "react"
import { hydrateAccessToken } from "@/lib/auth"

export default function AuthHydrationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    hydrateAccessToken().finally(() => {
      if (!cancelled) setHydrated(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!hydrated) {
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

  return <>{children}</>
}
