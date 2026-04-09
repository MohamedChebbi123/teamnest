"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { Check, User, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"

export default function Register() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState({
    hasLowerCase: false,
    hasUpperCase: false,
    hasNumber: false,
    hasMinLength: false
  })
  const [nameErrors, setNameErrors] = useState({
    firstName: "",
    lastName: ""
  })
  const [emailError, setEmailError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const passwordStrengthScore = Object.values(passwordStrength).filter(Boolean).length
  const passwordStrengthPercent = (passwordStrengthScore / 4) * 100

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [id === "first_name" ? "firstName" : id === "last_name" ? "lastName" : id]: value 
    }))
    
    if (id === "first_name") {
      if (value.length > 0 && value.length < 5) {
        setNameErrors(prev => ({ ...prev, firstName: "First name must be at least 5 characters long" }))
      } else {
        setNameErrors(prev => ({ ...prev, firstName: "" }))
      }
    }
    
    if (id === "last_name") {
      if (value.length > 0 && value.length < 5) {
        setNameErrors(prev => ({ ...prev, lastName: "Last name must be at least 5 characters long" }))
      } else {
        setNameErrors(prev => ({ ...prev, lastName: "" }))
      }
    }
    
    if (id === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (value.length > 0 && !emailRegex.test(value)) {
        setEmailError("Please enter a valid email address")
      } else {
        setEmailError("")
      }
    }
    
    if (id === "password") {
      setPasswordStrength({
        hasLowerCase: /[a-z]/.test(value),
        hasUpperCase: /[A-Z]/.test(value),
        hasNumber: /[0-9]/.test(value),
        hasMinLength: value.length >= 8
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.firstName.length < 5) {
      toast.error("Validation Error", {
        description: "First name must be at least 5 characters long"
      })
      return
    }
    
    if (formData.lastName.length < 5) {
      toast.error("Validation Error", {
        description: "Last name must be at least 5 characters long"
      })
      return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error("Validation Error", {
        description: "Please enter a valid email address"
      })
      return
    }
    
    setIsLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("first_name", formData.firstName)
      formDataToSend.append("last_name", formData.lastName)
      formDataToSend.append("email", formData.email)
      formDataToSend.append("password", formData.password)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
        method: "POST",
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed")
      }

      toast.success("Account created successfully!", {
        description: "Please login to continue. Don't forget to verify your email!",
      })
      
      setTimeout(() => {
        window.location.href = "/auth/login"
      }, 1500)
      
    } catch (err) {
      console.error("Registration error:", err)
      toast.error("Registration failed", {
        description: err instanceof Error ? err.message : "An error occurred during registration. Please try again.",
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
              alt="Team collaboration illustration"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-8">
              <div className="text-white space-y-2">
                <h2 className="text-3xl font-bold">Join Our Team</h2>
                <p className="text-lg text-white/90">Collaborate, create, and succeed together</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <Card className="w-full shadow-2xl border-muted/40 backdrop-blur rounded-l-none">
            <CardHeader className="space-y-3 pb-6">
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Create an account
                </CardTitle>
                <CardDescription className="text-base">
                  Join us today! Complete your profile after verification
                </CardDescription>
              </div>
              <CardAction>
                <Link href="/auth/login">
                  <Button variant="ghost" className="hover:bg-accent/50 transition-all">
                    Already have an account? <span className="ml-1 font-semibold text-primary">Sign In</span>
                  </Button>
                </Link>
              </CardAction>
            </CardHeader>
            <CardContent className="pb-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      First Name
                    </Label>
                    <div className="relative group">
                      <Input
                        id="first_name"
                        type="text"
                        placeholder="John"
                        maxLength={20}
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={cn(
                          "transition-all duration-200 pl-3",
                          nameErrors.firstName && "border-red-500 focus-visible:ring-red-500",
                          formData.firstName.length >= 5 && "border-green-500 focus-visible:ring-green-500"
                        )}
                        required
                      />
                      {formData.firstName.length >= 5 && !nameErrors.firstName && (
                        <Check className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    {nameErrors.firstName && (
                      <p className="text-xs text-red-500 animate-in slide-in-from-top-1 flex items-center gap-1">
                        <span className="text-base">⚠</span> {nameErrors.firstName}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="last_name" className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      Last Name
                    </Label>
                    <div className="relative group">
                      <Input
                        id="last_name"
                        type="text"
                        placeholder="Doe"
                        maxLength={20}
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={cn(
                          "transition-all duration-200 pl-3",
                          nameErrors.lastName && "border-red-500 focus-visible:ring-red-500",
                          formData.lastName.length >= 5 && "border-green-500 focus-visible:ring-green-500"
                        )}
                        required
                      />
                      {formData.lastName.length >= 5 && !nameErrors.lastName && (
                        <Check className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    {nameErrors.lastName && (
                      <p className="text-xs text-red-500 animate-in slide-in-from-top-1 flex items-center gap-1">
                        <span className="text-base">⚠</span> {nameErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    Email Address
                  </Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@example.com"
                      maxLength={50}
                      value={formData.email}
                      onChange={handleInputChange}
                      className={cn(
                        "transition-all duration-200 pl-3",
                        emailError && "border-red-500 focus-visible:ring-red-500",
                        formData.email && !emailError && formData.email.length > 0 && "border-green-500 focus-visible:ring-green-500"
                      )}
                      required
                    />
                    {formData.email && !emailError && formData.email.length > 0 && (
                      <Check className="w-4 h-4 text-green-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500 animate-in slide-in-from-top-1 flex items-center gap-1">
                      <span className="text-base">⚠</span> {emailError}
                    </p>
                  )}
                </div>
                
                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    Password
                  </Label>
                  <div className="relative group">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter a strong password"
                      value={formData.password}
                      onChange={handleInputChange}
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
                  
                  {formData.password && (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-muted animate-in slide-in-from-top-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium">Password Strength</span>
                        <span className={cn(
                          "font-semibold",
                          passwordStrengthScore === 4 && "text-green-600",
                          passwordStrengthScore === 3 && "text-yellow-600",
                          passwordStrengthScore < 3 && "text-red-600"
                        )}>
                          {passwordStrengthScore === 4 ? "Strong" : passwordStrengthScore === 3 ? "Good" : passwordStrengthScore === 2 ? "Fair" : "Weak"}
                        </span>
                      </div>
                      
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500 rounded-full",
                            passwordStrengthScore === 4 && "bg-green-500",
                            passwordStrengthScore === 3 && "bg-yellow-500",
                            passwordStrengthScore < 3 && "bg-red-500"
                          )}
                          style={{ width: `${passwordStrengthPercent}%` }}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className={cn(
                          "flex items-center gap-1.5 transition-colors",
                          passwordStrength.hasMinLength ? 'text-green-600 font-medium' : 'text-muted-foreground'
                        )}>
                          <span className="text-sm">{passwordStrength.hasMinLength ? '✓' : '○'}</span>
                          <span>8+ characters</span>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 transition-colors",
                          passwordStrength.hasLowerCase ? 'text-green-600 font-medium' : 'text-muted-foreground'
                        )}>
                          <span className="text-sm">{passwordStrength.hasLowerCase ? '✓' : '○'}</span>
                          <span>Lowercase</span>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 transition-colors",
                          passwordStrength.hasUpperCase ? 'text-green-600 font-medium' : 'text-muted-foreground'
                        )}>
                          <span className="text-sm">{passwordStrength.hasUpperCase ? '✓' : '○'}</span>
                          <span>Uppercase</span>
                        </div>
                        <div className={cn(
                          "flex items-center gap-1.5 transition-colors",
                          passwordStrength.hasNumber ? 'text-green-600 font-medium' : 'text-muted-foreground'
                        )}>
                          <span className="text-sm">{passwordStrength.hasNumber ? '✓' : '○'}</span>
                          <span>Number</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]" 
                  disabled={
                    isLoading || 
                    formData.firstName.length < 5 || 
                    formData.lastName.length < 5 || 
                    emailError !== "" || 
                    formData.email.length === 0 ||
                    passwordStrengthScore < 4
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
  
  )
}
