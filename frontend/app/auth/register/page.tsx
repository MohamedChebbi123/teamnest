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
import { Separator } from "@/components/ui/separator"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import countryList from "country-list"
import PhoneInput from "react-phone-input-2"
import { toast } from "sonner"
import "react-phone-input-2/lib/style.css"
import "flag-icons/css/flag-icons.min.css"

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
  
  const countries = countryList.getData()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, files } = e.target
    if (id === "profile_picture" && files) {
      setFormData(prev => ({ ...prev, avatar: files[0] }))
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [id === "first_name" ? "firstName" : id === "last_name" ? "lastName" : id]: value 
      }))
      
      // Validate first name length
      if (id === "first_name") {
        if (value.length > 0 && value.length < 5) {
          setNameErrors(prev => ({ ...prev, firstName: "First name must be at least 5 characters long" }))
        } else {
          setNameErrors(prev => ({ ...prev, firstName: "" }))
        }
      }
      
      // Validate last name length
      if (id === "last_name") {
        if (value.length > 0 && value.length < 5) {
          setNameErrors(prev => ({ ...prev, lastName: "Last name must be at least 5 characters long" }))
        } else {
          setNameErrors(prev => ({ ...prev, lastName: "" }))
        }
      }
      
      // Validate email format
      if (id === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (value.length > 0 && !emailRegex.test(value)) {
          setEmailError("Please enter a valid email address")
        } else {
          setEmailError("")
        }
      }
      
      // Check password strength
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate name lengths before submission
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
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error("Validation Error", {
        description: "Please enter a valid email address"
      })
      return
    }
    
    // Validate phone number length (minimum 10 digits)
    if (phoneNumber.length < 10) {
      toast.error("Validation Error", {
        description: "Please enter a valid phone number (minimum 10 digits)"
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

      toast.success("Account created successfully!", {
        description: `Welcome ${data.user?.first_name || formData.firstName}! Your account has been created.`,
        action: {
          label: "Login",
          onClick: () => console.log("Redirect to login"),
        },
      })
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

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your details below to create your account
        </CardDescription>
        <CardAction>
          <Button variant="link">Sign In</Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="flex gap-4 items-end">
              <div className="grid gap-2 flex-1">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="John"
                  maxLength={20}
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={nameErrors.firstName ? "border-red-500" : ""}
                  required
                />
                {nameErrors.firstName && (
                  <p className="text-xs text-red-500">{nameErrors.firstName}</p>
                )}
              </div>
              <Separator orientation="vertical" className="h-9" />
              <div className="grid gap-2 flex-1">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Doe"
                  maxLength={20}
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={nameErrors.lastName ? "border-red-500" : ""}
                  required
                />
                {nameErrors.lastName && (
                  <p className="text-xs text-red-500">{nameErrors.lastName}</p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                maxLength={50}
                value={formData.email}
                onChange={handleInputChange}
                className={emailError ? "border-red-500" : ""}
                required
              />
              {emailError && (
                <p className="text-xs text-red-500">{emailError}</p>
              )}
            </div>
            
            <Separator />
            
            <div className="grid gap-2">
              <Label htmlFor="phone_number">Phone Number</Label>
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
                  className: `flex h-9 w-full rounded-md border ${phoneError ? 'border-red-500' : 'border-input'} bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 !pl-12`
                }}
                containerClass="w-full"
                buttonClass="!border-input !bg-transparent hover:!bg-accent"
              />
              {phoneError && (
                <p className="text-xs text-red-500">{phoneError}</p>
              )}
            </div>
            
            

            <Separator />
            
            <div className="grid gap-2">
              <Label htmlFor="profile_picture">Profile Picture</Label>
              <Input
                id="profile_picture"
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                required
              />
              {formData.password && (
                <div className="text-xs space-y-1 mt-2">
                  <div className={`flex items-center gap-2 ${passwordStrength.hasMinLength ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <span>{passwordStrength.hasMinLength ? '✓' : '○'}</span>
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.hasLowerCase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <span>{passwordStrength.hasLowerCase ? '✓' : '○'}</span>
                    <span>Contains lowercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.hasUpperCase ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <span>{passwordStrength.hasUpperCase ? '✓' : '○'}</span>
                    <span>Contains uppercase letter</span>
                  </div>
                  <div className={`flex items-center gap-2 ${passwordStrength.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <span>{passwordStrength.hasNumber ? '✓' : '○'}</span>
                    <span>Contains number</span>
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={formData.password}
                onChange={handleInputChange}
                required 
              />
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <Button 
                type="submit" 
                className="w-full" 
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
                {isLoading ? "Registering..." : "Register"}
              </Button>
              <Button variant="outline" className="w-full" type="button">
                Register with Google
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
      </CardFooter>
    </Card>
  )
}
