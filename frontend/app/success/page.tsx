"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { formatApiError } from "@/lib/utils"
import { authFetch, getAccessToken, hydrateAccessToken } from "@/lib/auth"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orgId = searchParams.get("org_id")
  const sessionId = searchParams.get("session_id")
  const [confirming, setConfirming] = useState(true)
  const [upgradeActive, setUpgradeActive] = useState(false)

  useEffect(() => {
    const confirmUpgrade = async () => {
      if (!orgId) {
        setConfirming(false)
        toast.error("Missing org_id in URL")
        return
      }

      const token = getAccessToken() ?? (await hydrateAccessToken())
      if (!token) {
        router.push("/auth/login")
        return
      }

      try {
        const url = `${process.env.NEXT_PUBLIC_API_URL}/organization/${orgId}/confirm-upgrade${sessionId ? `?session_id=${sessionId}` : ""}`
        console.log("[SuccessPage] calling confirm-upgrade:", url)

        const response = await authFetch(url, { method: "POST" })

        const data = await response.json().catch(() => null)
        console.log("[SuccessPage] response:", response.status, data)

        const status = data?.status
        const plan = data?.plan
        const error = data?.error

        if (!response.ok) {
          toast.error("Upgrade failed", { description: formatApiError(data?.detail, "Could not confirm upgrade") })
          setConfirming(false)
          return
        }

        if (status === "active" && plan === "PRO") {
          toast.success("Upgraded to Pro!")
          setUpgradeActive(true)
        } else {
          toast.error("Upgrade not yet active", {
            description: error || `Status: ${status}, Plan: ${plan}. The Stripe webhook may still be processing.`,
          })
          setUpgradeActive(false)
        }
      } catch (error) {
        console.error("[SuccessPage] fetch error:", error)
        toast.error("Error", {
          description: "Could not reach the server. Make sure the backend is running and NEXT_PUBLIC_API_URL is correct.",
        })
      } finally {
        setConfirming(false)
      }
    }

    confirmUpgrade()
  }, [orgId, sessionId, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          {confirming ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          ) : upgradeActive ? (
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          ) : (
            <CheckCircle2 className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          )}
          <CardTitle className="text-2xl">
            {confirming ? "Confirming upgrade..." : upgradeActive ? "You're now on Pro!" : "Upgrade pending"}
          </CardTitle>
          <CardDescription>
            {confirming
              ? "Please wait while we activate your plan."
              : upgradeActive
              ? "Your organization has been upgraded to the Pro plan."
              : "Your payment was received but the upgrade hasn't activated yet. Check your organization page."}
          </CardDescription>
        </CardHeader>
        {!confirming && (
          <CardContent>
            <Button
              className="w-full"
              onClick={() => router.push(orgId ? `/organization/${orgId}` : "/welcome")}
            >
              Go to Organization
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
