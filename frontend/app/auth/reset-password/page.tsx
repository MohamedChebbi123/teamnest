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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { Lock, Loader2, Eye, EyeOff, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ResetPassword() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])

  useEffect(() => {
    // Get email and reset code from session storage
    const storedEmail = sessionStorage.getItem("reset_email")
    const storedCode = sessionStorage.getItem("reset_code")
    
    if (!storedEmail || !storedCode) {
      toast.error("Session expired", {
        description: "Please start the password reset process again"
      })
      router.push("/auth/forgot-password")
      return
    }
    
    setEmail(storedEmail)
    setResetCode(storedCode)
  }, [router])

  const validatePassword = (password: string) => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push("At least 8 characters long")
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Contains at least one lowercase letter")
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Contains at least one uppercase letter")
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Contains at least one number")
    }
    
    return errors
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
    
    if (id === "password") {
      const errors = validatePassword(value)
      setPasswordErrors(errors)
    }
  }

  const passwordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate password
    const errors = validatePassword(formData.password)
    if (errors.length > 0) {
      toast.error("Password requirements not met", {
        description: "Please check the password requirements"
      })
      return
    }
    
    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match", {
        description: "Please make sure both passwords are the same"
      })
      return
    }
    
    setIsLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("email", email)
      formDataToSend.append("reset_code", resetCode)
      formDataToSend.append("new_password", formData.password)

      const response = await fetch("http://localhost:8000/reset-password", {
        method: "POST",
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Failed to reset password")
      }

      toast.success("Password reset successful!", {
        description: "You can now login with your new password",
      })
      
      // Clear session storage
      sessionStorage.removeItem("reset_email")
      sessionStorage.removeItem("reset_code")
      
      // Redirect to login page
      setTimeout(() => {
        router.push("/auth/login")
      }, 2000)
      
    } catch (err) {
      console.error("Error:", err)
      toast.error("Failed to reset password", {
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
              alt="Reset password illustration"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-8">
              <div className="text-white space-y-2">
                <h2 className="text-3xl font-bold">Create New Password</h2>
                <p className="text-lg text-white/90">Enter your new password to regain access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <Card className="w-full shadow-2xl border-muted/40 backdrop-blur rounded-l-none">
          <CardHeader className="space-y-3 pb-6">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Reset Password
              </CardTitle>
              <CardDescription className="text-base">
                Create a strong password for your account
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  New Password
                </Label>
                <div className="relative group">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    className="transition-all duration-200 pr-10"
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Password Requirements */}
                {formData.password.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <p className="text-xs font-medium text-muted-foreground">Password must be:</p>
                    {[
                      { text: "At least 8 characters long", check: formData.password.length >= 8 },
                      { text: "Contains at least one lowercase letter", check: /[a-z]/.test(formData.password) },
                      { text: "Contains at least one uppercase letter", check: /[A-Z]/.test(formData.password) },
                      { text: "Contains at least one number", check: /[0-9]/.test(formData.password) }
                    ].map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {req.check ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className={cn(
                          "transition-colors",
                          req.check ? "text-green-600 dark:text-green-500" : "text-muted-foreground"
                        )}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  Confirm New Password
                </Label>
                <div className="relative group">
                  <Input 
                    id="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={handlePasswordChange}
                    className={cn(
                      "transition-all duration-200 pr-10",
                      formData.confirmPassword.length > 0 && (
                        passwordsMatch 
                          ? "border-green-500 focus-visible:ring-green-500" 
                          : "border-red-500 focus-visible:ring-red-500"
                      )
                    )}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-xs text-red-500 animate-in slide-in-from-top-1 flex items-center gap-1">
                    <span className="text-base">⚠</span> Passwords do not match
                  </p>
                )}
                {passwordsMatch && (
                  <p className="text-xs text-green-600 dark:text-green-500 animate-in slide-in-from-top-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Passwords match
                  </p>
                )}
              </div>
              
              {/* Submit Button */}
              <div className="space-y-3 pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]" 
                  disabled={
                    isLoading || 
                    passwordErrors.length > 0 || 
                    !passwordsMatch ||
                    formData.password.length === 0
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <p className="text-xs text-muted-foreground text-center">
              Remember your password?{" "}
              <Link href="/auth/login" className="underline hover:text-primary transition-colors">
                Sign in here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
