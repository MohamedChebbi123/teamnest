"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Mail, Phone, Globe, Calendar, Tag, ShieldCheck, LogOut, AlertCircle, Edit, MailCheck } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("access_token")
      
      if (!token) {
        toast.error("Not authenticated", {
          description: "Please log in to view your profile"
        })
        router.push("/auth/login")
        return
      }

      try {
        const response = await fetch("http://localhost:8000/profile", {
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
        setProfile(data)
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

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    toast.success("Logged out successfully")
    router.push("/auth/login")
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const handleSendVerification = async () => {
    if (!profile) return
    
    setIsSendingCode(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("email", profile.email)
      
      const response = await fetch("http://localhost:8000/resend-verification", {
        method: "POST",
        body: formDataToSend,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || "Failed to send verification code")
      }
      
      toast.success("Verification code sent!", {
        description: `We've sent a code to ${profile.email}`
      })
      
      setShowVerificationDialog(true)
    } catch (err) {
      console.error("Send verification error:", err)
      toast.error("Failed to send code", {
        description: err instanceof Error ? err.message : "Please try again later"
      })
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    
    if (verificationCode.length !== 6) {
      toast.error("Invalid Code", {
        description: "Please enter a valid 6-digit verification code"
      })
      return
    }
    
    setIsVerifying(true)
    
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("email", profile.email)
      formDataToSend.append("verification_code", verificationCode)
      
      const response = await fetch("http://localhost:8000/verify-email", {
        method: "POST",
        body: formDataToSend,
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.detail || "Verification failed")
      }
      
      toast.success("Email Verified!", {
        description: "Your email has been verified successfully."
      })
      
      setShowVerificationDialog(false)
      setVerificationCode("")
      
      // Refresh profile
      setProfile(prev => prev ? {...prev, is_verified: true} : null)
      
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
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Unverified Email Banner */}
        {!profile.is_verified && (
          <div className="border-2 border-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MailCheck className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <h3 className="text-red-900 dark:text-red-100 font-semibold text-lg">
                  Verify Your Email
                </h3>
                <p className="text-red-800 dark:text-red-200 text-sm">
                  Your email address has not been verified. Please verify your email to access all features.
                </p>
                <Button 
                  onClick={handleSendVerification} 
                  className="bg-red-600 hover:bg-red-700 text-white mt-2"
                  size="sm"
                  disabled={isSendingCode}
                >
                  {isSendingCode ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <MailCheck className="w-4 h-4 mr-2" />
                      Verify Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Incomplete Profile Banner */}
        {!profile.profile_completed && (
          <div className="border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <div className="flex-1 space-y-2">
                <h3 className="text-yellow-900 dark:text-yellow-100 font-semibold text-lg">
                  Complete Your Profile
                </h3>
                <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                  Add your phone number, country, and profile picture to complete your profile and unlock all features.
                </p>
                <Button 
                  onClick={() => router.push("/auth/complete-profile")} 
                  className="bg-yellow-600 hover:bg-yellow-700 text-white mt-2"
                  size="sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Complete Profile
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Header with Logout */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

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

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <MailCheck className="w-8 h-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Verify Your Email</DialogTitle>
            <DialogDescription className="text-center">
              We've sent a 6-digit verification code to <br />
              <span className="font-semibold text-foreground">{profile.email}</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVerification} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verification_code" className="text-center block">
                Enter Verification Code
              </Label>
              <Input
                id="verification_code"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
                required
              />
            </div>
            <DialogFooter className="sm:justify-center gap-2">
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
                  "Verify Email"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
