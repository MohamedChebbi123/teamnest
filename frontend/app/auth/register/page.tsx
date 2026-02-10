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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { Check, User, Mail, Phone, Lock, Upload, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import countryList from "country-list"
import PhoneInput from "react-phone-input-2"
import { toast } from "sonner"
import "react-phone-input-2/lib/style.css"
import "flag-icons/css/flag-icons.min.css"
import Image from "next/image"
import Link from "next/link"
import ImageCropDialog from "@/components/ImageCropDialog"

export default function Register() {
  const [open, setOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [countryCode, setCountryCode] = useState("")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    avatar: null as File | null
  })
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
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
  const [phoneError, setPhoneError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState("")
  const [showVerificationDialog, setShowVerificationDialog] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  
  const countries = countryList.getData()

  const passwordStrengthScore = Object.values(passwordStrength).filter(Boolean).length
  const passwordStrengthPercent = (passwordStrengthScore / 4) * 100

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, files } = e.target
    if (id === "profile_picture" && files && files[0]) {
      const file = files[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setOriginalImage(reader.result as string)
        setShowCropDialog(true)
      }
      reader.readAsDataURL(file)
    } else {
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

  const handleCropComplete = (croppedImage: File) => {
    setFormData(prev => ({ ...prev, avatar: croppedImage }))
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(croppedImage)
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
    
    if (phoneNumber.length < 10) {
      toast.error("Validation Error", {
        description: "Please enter a valid phone number (minimum 10 digits)"
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
      formDataToSend.append("first_name", formData.firstName)
      formDataToSend.append("last_name", formData.lastName)
      formDataToSend.append("email", formData.email)
      formDataToSend.append("phone_number", phoneNumber)
      formDataToSend.append("country", selectedCountry)
      formDataToSend.append("password", formData.password)
      formDataToSend.append("captcha_token", recaptchaToken)
      if (formData.avatar) {
        formDataToSend.append("avatar", formData.avatar)
      }

      const response = await fetch("http://localhost:8000/register", {
        method: "POST",
        body: formDataToSend,
      })

      const data = await response.json()
      console.log("Response status:", response.status)
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed")
      }

      setUserEmail(formData.email)
      
      toast.success("Account created successfully!", {
        description: `We've sent a verification code to ${formData.email}`,
      })
      
      setShowVerificationDialog(true)
      
      console.log("User registered:", data)
    } catch (err) {
      console.error("Registration error:", err)
      toast.error("Registration failed", {
        description: err instanceof Error ? err.message : "An error occurred during registration. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (verificationCode.length !== 6) {
      toast.error("Invalid Code", {
        description: "Please enter a valid 6-digit verification code"
      })
      return
    }
    
    setIsVerifying(true)
    
    try {
      const formDataToSend = new FormData()
      formDataToSend.append("email", userEmail)
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
        description: "Your account has been verified successfully. You can now login.",
        action: {
          label: "Login",
          onClick: () => window.location.href = "/auth/login",
        },
      })
      
      setShowVerificationDialog(false)
      setVerificationCode("")
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = "/auth/login"
      }, 2000)
      
    } catch (err) {
      console.error("Verification error:", err)
      toast.error("Verification failed", {
        description: err instanceof Error ? err.message : "Invalid or expired verification code"
      })
    } finally {
      setIsVerifying(false)
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
              Join us today! Fill in your details below to get started
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
            
            {/* Phone Number Field */}
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-sm font-medium flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Phone Number
              </Label>
              <PhoneInput
                country={countryCode.toLowerCase() || 'us'}
                value={phoneNumber}
                onChange={(phone) => {
                  setPhoneNumber(phone)
                  if (phone.length > 0 && phone.length < 10) {
                    setPhoneError("Phone number must be at least 10 digits")
                  } else {
                    setPhoneError("")
                  }
                }}
                inputProps={{
                  name: 'phone_number',
                  required: true,
                  className: `flex h-10 w-full rounded-md border ${phoneError ? 'border-red-500' : phoneNumber.length >= 10 ? 'border-green-500' : 'border-input'} bg-transparent px-3 py-1 text-sm shadow-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 !pl-12`
                }}
                containerClass="w-full"
                buttonClass="!border-input !bg-transparent hover:!bg-accent !transition-all"
              />
              {phoneError && (
                <p className="text-xs text-red-500 animate-in slide-in-from-top-1 flex items-center gap-1">
                  <span className="text-base">⚠</span> {phoneError}
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
            
            {/* Profile Picture Field */}
            <div className="space-y-2">
              <Label htmlFor="profile_picture" className="text-sm font-medium flex items-center gap-2">
                <Upload className="w-4 h-4 text-primary" />
                Profile Picture
              </Label>
              
              {imagePreview ? (
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                  <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-primary">
                    <Image
                      src={imagePreview}
                      alt="Profile preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium flex items-center gap-1 text-green-600">
                      <Check className="w-4 h-4" />
                      Image cropped and ready
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{formData.avatar?.name}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, avatar: null }))
                      setImagePreview(null)
                      setOriginalImage(null)
                      const input = document.getElementById('profile_picture') as HTMLInputElement
                      if (input) input.value = ''
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    id="profile_picture"
                    type="file"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer transition-all"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll be able to crop and adjust your image after selection
                  </p>
                </div>
              )}
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
                  formData.firstName.length < 5 || 
                  formData.lastName.length < 5 || 
                  emailError !== "" || 
                  phoneError !== "" || 
                  phoneNumber.length < 10 || 
                  formData.email.length === 0
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
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
            By creating an account, you agree to our{" "}
            <a href="#" className="underline hover:text-primary transition-colors">Terms of Service</a>
            {" "}and{" "}
            <a href="#" className="underline hover:text-primary transition-colors">Privacy Policy</a>
          </p>
        </CardFooter>
      </Card>
      </div>
      
      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-3">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">Verify Your Email</DialogTitle>
            <DialogDescription className="text-center">
              We've sent a 6-digit verification code to <br />
              <span className="font-semibold text-foreground">{userEmail}</span>
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
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setVerificationCode(value)
                }}
                className="text-center text-2xl font-bold tracking-widest"
                required
              />
              <p className="text-xs text-muted-foreground text-center">
                Code expires in 10 minutes
              </p>
            </div>
            
            <DialogFooter className="flex-col gap-2 sm:flex-col">
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
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  toast.info("Resend Feature", {
                    description: "Resend functionality will be available soon"
                  })
                }}
              >
                Resend Code
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Image Crop Dialog */}
      {originalImage && (
        <ImageCropDialog
          open={showCropDialog}
          onClose={() => {
            setShowCropDialog(false)
            setOriginalImage(null)
            const input = document.getElementById('profile_picture') as HTMLInputElement
            if (input) input.value = ''
          }}
          imageSrc={originalImage}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
        />
      )}
    </div>
  )
}
