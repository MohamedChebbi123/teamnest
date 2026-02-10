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
import { useState, useEffect } from "react"
import { Check, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
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
  const [recaptchaToken, setRecaptchaToken] = useState("")
  const [rememberMe, setRememberMe] = useState(false)

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

  useEffect(() => {
    (window as any).onRecaptchaSuccess = (token: string) => {
      setRecaptchaToken(token)
    }

    const renderRecaptcha = () => {
      if ((window as any).grecaptcha && (window as any).grecaptcha.render) {
        try {
          const container = document.querySelector('.g-recaptcha')
          if (container && !container.hasChildNodes()) {
            (window as any).grecaptcha.render(container, {
              sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
              callback: 'onRecaptchaSuccess'
            })
          }
        } catch (error) {
          console.error('reCAPTCHA render error:', error)
        }
      }
    }

    const checkRecaptcha = setInterval(() => {
      if ((window as any).grecaptcha) {
        clearInterval(checkRecaptcha)
        renderRecaptcha()
      }
    }, 100)

    return () => {
      clearInterval(checkRecaptcha)
      delete (window as any).onRecaptchaSuccess
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error("Validation Error", {
        description: "Please enter a valid email address"
      })
      return
    }
    
    if (!recaptchaToken) {
      toast.error("Validation Error", {
        description: "Please complete the reCAPTCHA verification"
      })
      return
    }
    
    setIsLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append("email", formData.email)
      formDataToSend.append("password", formData.password)
      formDataToSend.append("captcha_token", recaptchaToken)

      const response = await fetch("http://localhost:8000/login", {
        method: "POST",
        body: formDataToSend,
      })

      const data = await response.json()
      console.log("Response status:", response.status)
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.detail || "Login failed")
      }

      toast.success("Login successful!", {
        description: "Welcome back! Redirecting to dashboard...",
      })
      
      if (rememberMe && data.access_token) {
        localStorage.setItem("access_token", data.access_token)
      }
      
      setTimeout(() => {
        window.location.href = "/dashboard"
      }, 1000)
      
      console.log("User logged in:", data)
    } catch (err) {
      console.error("Login error:", err)
      toast.error("Login failed", {
        description: err instanceof Error ? err.message : "Invalid email or password. Please try again.",
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

              {/* Remember Me Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-input text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm font-normal cursor-pointer select-none"
                >
                  Remember me for 30 days
                </Label>
              </div>
              
              {/* reCAPTCHA v2 Widget */}
              <div className="flex justify-center pt-2">
                <div 
                  className="g-recaptcha" 
                  data-sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                  data-callback="onRecaptchaSuccess"
                ></div>
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
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full h-11 font-medium hover:bg-accent/50 transition-all duration-200 hover:scale-[1.02]" 
                  type="button"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
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
