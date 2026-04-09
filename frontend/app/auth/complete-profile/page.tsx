"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Phone, Globe, Upload, Check, User } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import countryList from "country-list"
import PhoneInput from "react-phone-input-2"
import "react-phone-input-2/lib/style.css"
import Image from "next/image"
import ImageCropDialog from "@/components/ImageCropDialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"

export default function CompleteProfilePage() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [selectedCountry, setSelectedCountry] = useState("")
  const [countryCode, setCountryCode] = useState("")
  const [open, setOpen] = useState(false)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [phoneError, setPhoneError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const countries = countryList.getData()

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      toast.error("Not authenticated", {
        description: "Please log in first"
      })
      router.push("/auth/login")
    }
  }, [router])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      const file = files[0]
      const reader = new FileReader()
      reader.onloadend = () => {
        setOriginalImage(reader.result as string)
        setShowCropDialog(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCropComplete = (croppedImage: File) => {
    setAvatar(croppedImage)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(croppedImage)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (phoneNumber.length < 10) {
      toast.error("Validation Error", {
        description: "Please enter a valid phone number (minimum 10 digits)"
      })
      return
    }

    if (!selectedCountry) {
      toast.error("Validation Error", {
        description: "Please select your country"
      })
      return
    }

    if (!avatar) {
      toast.error("Validation Error", {
        description: "Please upload a profile picture"
      })
      return
    }

    setIsLoading(true)

    try {
      const token = localStorage.getItem("access_token")
      if (!token) {
        throw new Error("Not authenticated")
      }

      const formDataToSend = new FormData()
      formDataToSend.append("phone_number", phoneNumber)
      formDataToSend.append("country", selectedCountry)
      formDataToSend.append("avatar", avatar)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/complete-profile`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("access_token")
          router.push("/auth/login")
          return
        }
        throw new Error(data.detail || "Profile completion failed")
      }

      toast.success("Profile completed!", {
        description: "Your profile has been updated successfully"
      })

      setTimeout(() => {
        router.push("/auth/profile")
      }, 1000)

    } catch (err) {
      console.error("Profile completion error:", err)
      toast.error("Failed to complete profile", {
        description: err instanceof Error ? err.message : "An error occurred. Please try again."
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-2xl shadow-2xl">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-10 h-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-center">Complete Your Profile</CardTitle>
            <CardDescription className="text-center text-base">
              Add your phone number, country, and profile picture to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Country Field */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Country
                </Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className={cn(
                        "w-full justify-between",
                        !selectedCountry && "text-muted-foreground",
                        selectedCountry && "border-green-500"
                      )}
                    >
                      {selectedCountry
                        ? countries.find((country) => country.name === selectedCountry)?.name
                        : "Select your country..."}
                      {selectedCountry && (
                        <Check className="ml-2 h-4 w-4 text-green-500" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search country..." />
                      <CommandList>
                        <CommandEmpty>No country found.</CommandEmpty>
                        <CommandGroup>
                          {countries.map((country) => (
                            <CommandItem
                              key={country.code}
                              value={country.name}
                              onSelect={(currentValue) => {
                                setSelectedCountry(currentValue === selectedCountry ? "" : currentValue)
                                setCountryCode(country.code)
                                setOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedCountry === country.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {country.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
                      <p className="text-xs text-muted-foreground mt-1">{avatar?.name}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAvatar(null)
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
                      onChange={handleImageChange}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer transition-all"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      You'll be able to crop and adjust your image after selection
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-semibold"
                  disabled={isLoading || phoneNumber.length < 10 || !selectedCountry || !avatar}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Completing Profile...
                    </>
                  ) : (
                    "Complete Profile"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Image Crop Dialog */}
      {showCropDialog && originalImage && (
        <ImageCropDialog
          open={showCropDialog}
          imageSrc={originalImage}
          onCropComplete={handleCropComplete}
          onClose={() => {
            setShowCropDialog(false)
            setOriginalImage(null)
          }}
        />
      )}
    </>
  )
}
