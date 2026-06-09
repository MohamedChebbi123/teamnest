"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { Check, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react"
import { cn, formatApiError } from "@/lib/utils"
import { setAccessToken } from "@/lib/auth"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  })
  const [emailError, setEmailError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
    
    if (id === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (value.length > 0 && !emailRegex.test(value)) {
        setEmailError("Please enter a valid email address")
      } else {
        setEmailError("")
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error("Validation Error", {
        description: "Please enter a valid email address"
      })
      return
    }
    
    setIsLoading(true)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      let data: any = null
      try {
        data = await response.json()
      } catch {
        data = null
      }
      console.log("Response status:", response.status)
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(formatApiError(data?.detail, data?.message || "Login failed"))
      }

      toast.success("Login successful!", {
        description: "Welcome back! Redirecting to your profile...",
      })

      const token = data.access_token || data.token
      if (token) {
        setAccessToken(token)
      } else {
        throw new Error("Login succeeded but no access token was returned")
      }

      const destination = data.role === "admin" ? "/admin" : "/home"
      setTimeout(() => {
        window.location.replace(destination)
      }, 1000)
      
      console.log("User logged in:", data)
    } catch (err) {
      console.error("Login error:", err)
      toast.error("Login failed", {
        description: err instanceof Error
          ? (err.name === "AbortError" ? "Request timed out. Check backend server and try again." : err.message)
          : "Invalid email or password. Please try again.",
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
                <h2 className="text-3xl font-bold">Welcome Back</h2>
                <p className="text-lg text-white/90">Sign in to continue your journey with us</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <Card className="w-full shadow-2xl border-muted/40 backdrop-blur rounded-l-none">
          <CardHeader className="space-y-3 pb-6">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Sign In
              </CardTitle>
              <CardDescription className="text-base">
                Enter your credentials to access your account
              </CardDescription>
            </div>
            <CardAction>
              <Link href="/auth/register">
                <Button variant="ghost" className="hover:bg-accent/50 transition-all">
                  Don't have an account? <span className="ml-1 font-semibold text-primary">Sign Up</span>
                </Button>
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-primary" />
                    Password
                  </Label>
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-xs text-primary hover:underline transition-all"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
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
              </div>

              {/* Submit Buttons */}
              <div className="space-y-3 pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02]" 
                  disabled={
                    isLoading || 
                    emailError !== "" || 
                    formData.email.length === 0 ||
                    formData.password.length === 0
                  }
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center pb-6">
            <p className="text-xs text-muted-foreground text-center">
              By signing in, you agree to our{" "}
              <a href="#" className="underline hover:text-primary transition-colors">Terms of Service</a>
              {" "}and{" "}
              <a href="#" className="underline hover:text-primary transition-colors">Privacy Policy</a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
