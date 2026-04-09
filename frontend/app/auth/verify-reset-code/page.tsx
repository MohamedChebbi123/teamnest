"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { Loader2, ArrowLeft, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

export default function VerifyResetCode() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Get email from session storage
    const storedEmail = sessionStorage.getItem("reset_email")
    if (!storedEmail) {
      toast.error("No email found", {
        description: "Please start from the forgot password page"
      })
      router.push("/auth/forgot-password")
      return
    }
    setEmail(storedEmail)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (code.length !== 6) {
      toast.error("Invalid Code", {
        description: "Please enter the complete 6-digit code"
      })
      return
    }
    
    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("email", email)
      formData.append("reset_code", code)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/verify-reset-code`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Invalid reset code")
      }

      toast.success("Code verified!", {
        description: "Redirecting to reset password page...",
      })
      
      // Store code in session storage for next step
      sessionStorage.setItem("reset_code", code)
      
      // Redirect to reset password page
      setTimeout(() => {
        router.push("/auth/reset-password")
      }, 1500)
      
    } catch (err) {
      console.error("Error:", err)
      toast.error("Verification failed", {
        description: err instanceof Error ? err.message : "Please check your code and try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("email", email)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/forgot-password`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Failed to resend code")
      }

      toast.success("Code resent!", {
        description: "Please check your email for the new code.",
      })
      setCode("")
      
    } catch (err) {
      console.error("Error:", err)
      toast.error("Failed to resend code", {
        description: err instanceof Error ? err.message : "Please try again later.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-0 items-stretch">
        {/* Image Side */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="relative w-full h-full rounded-l-2xl overflow-hidden shadow-2xl">
            <Image
              src="/registerimage.jpeg"
              fill
              alt="Verification illustration"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-8">
              <div className="text-white space-y-2">
                <h2 className="text-3xl font-bold">Verify Reset Code</h2>
                <p className="text-lg text-white/90">Enter the 6-digit code sent to your email</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <Card className="w-full shadow-2xl border-muted/40 backdrop-blur rounded-l-none">
          <CardHeader className="space-y-3 pb-6">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Verify Code
              </CardTitle>
              <CardDescription className="text-base">
                We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* OTP Input */}
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Verification Code
                </Label>
                <div className="flex justify-center py-4">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => setCode(value)}
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
                <p className="text-xs text-muted-foreground text-center">
                  Code expires in 10 minutes
                </p>
              </div>
              
              {/* Submit Button */}
              <div className="space-y-3 pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]" 
                  disabled={isLoading || code.length !== 6}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={handleResendCode}
                  disabled={isLoading}
                  className="w-full h-11 font-medium hover:bg-accent/50 transition-all"
                >
                  Resend Code
                </Button>

                <Link href="/auth/forgot-password">
                  <Button 
                    variant="ghost" 
                    type="button"
                    className="w-full h-11 font-medium hover:bg-accent/50 transition-all"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <p className="text-xs text-muted-foreground text-center">
              Didn&apos;t receive a code? Check your spam folder or click resend
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
