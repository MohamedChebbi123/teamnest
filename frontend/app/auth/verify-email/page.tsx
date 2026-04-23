"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Loader2, Mail, MailCheck, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const fetchProfile = async () => {
      const token = localStorage.getItem("access_token")
      
      if (!token) {
        toast.error("Not authenticated", {
          description: "Please log in to verify your email"
        })
        router.push("/auth/login")
        return
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        })

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Session expired", {
              description: "Please log in again"
            })
            localStorage.removeItem("access_token")
            router.push("/auth/login")
            return
          }
          throw new Error("Failed to fetch profile")
        }

        const data = await response.json()
        setEmail(data.email)
        
        // If already verified, redirect to profile
        if (data.is_verified) {
          toast.success("Email already verified")
          router.push("/auth/profile")
          return
        }

        // Automatically send verification code when page loads
        await sendVerificationCode(data.email)
      } catch (error) {
        console.error("Error fetching profile:", error)
        toast.error("Error", {
          description: "Failed to load profile. Please try again."
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  // Helper function to send verification code
  const sendVerificationCode = async (emailAddress: string) => {
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("email", emailAddress)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/resend-verification`, {
        method: "POST",
        body: formDataToSend,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to send verification code")
      }
      
      toast.success("Verification code sent!", {
        description: `We've sent a code to ${emailAddress}`
      })
    } catch (err) {
      console.error("Send verification error:", err)
      toast.error("Failed to send code", {
        description: err instanceof Error ? err.message : "Please try again later"
      })
    }
  }

  const handleSendVerification = async () => {
    if (!email) return
    
    setIsSendingCode(true)
    try {
      await sendVerificationCode(email)
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    
    if (verificationCode.length !== 6) {
      toast.error("Invalid Code", {
        description: "Please enter a valid 6-digit verification code"
      })
      return
    }
    
    setIsVerifying(true)
    
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("email", email)
      formDataToSend.append("verification_code", verificationCode)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/verify-email`, {
        method: "POST",
        body: formDataToSend,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || "Verification failed")
      }
      
      toast.success("Email Verified!", {
        description: "Your email has been verified successfully. Redirecting to profile..."
      })
      
      // Redirect to profile after verification
      setTimeout(() => {
        router.push("/auth/profile")
      }, 1500)
      
    } catch (err) {
      console.error("Verification error:", err)
      toast.error("Verification failed", {
        description: err instanceof Error ? err.message : "Invalid or expired verification code"
      })
    } finally {
      setIsVerifying(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <MailCheck className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Verify Your Email</CardTitle>
          <CardDescription className="text-center">
            Enter the 6-digit verification code sent to <br />
            <span className="font-semibold text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleVerification} className="space-y-6">
            <div className="space-y-4">
              <div className="text-center text-sm font-medium">
                Verification Code
              </div>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isVerifying || verificationCode.length !== 6}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <MailCheck className="mr-2 h-4 w-4" />
                  Verify Email
                </>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Didn't receive code?
              </span>
            </div>
          </div>

          <Button
            onClick={handleSendVerification}
            variant="outline"
            className="w-full"
            disabled={isSendingCode}
          >
            {isSendingCode ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend Code
              </>
            )}
          </Button>

          <Button
            onClick={() => router.push("/auth/profile")}
            variant="ghost"
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
