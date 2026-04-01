"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orgId = searchParams.get("org_id")
  const [confirming, setConfirming] = useState(true)

  useEffect(() => {
    const confirmUpgrade = async () => {
      if (!orgId) {
        setConfirming(false)
        toast.error("Missing org_id in URL")
        return
      }

      const token = localStorage.getItem("access_token")
      if (!token) {
        router.push("/auth/login")
        return
      }

      try {
        const response = await fetch(`http://localhost:8000/organization/${orgId}/confirm-upgrade`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          const data = await response.json()
          toast.error("Upgrade failed", { description: data.detail || "Could not confirm upgrade" })
        }
      } catch (error) {
        console.error("Error confirming upgrade:", error)
        toast.error("Error", { description: "Failed to confirm upgrade" })
      } finally {
        setConfirming(false)
      }
    }

    confirmUpgrade()
  }, [orgId, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="pb-4">
          {confirming ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          ) : (
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          )}
          <CardTitle className="text-2xl">
            {confirming ? "Confirming upgrade..." : "You're now on Pro!"}
          </CardTitle>
          <CardDescription>
            {confirming
              ? "Please wait while we activate your plan."
              : "Your organization has been upgraded to the Pro plan."}
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
