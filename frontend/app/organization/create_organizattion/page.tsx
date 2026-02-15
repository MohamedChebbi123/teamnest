"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { Building2, FileText, CreditCard, Image as ImageIcon, Loader2, Upload, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"
import ImageCropDialog from "@/components/ImageCropDialog"

export default function CreateOrganization() {
  const [formData, setFormData] = useState({
    organizationName: "",
    organizationDescription: "",
    organizationPlan: "free"
  })
  const [isLoading, setIsLoading] = useState(false)
  const [nameError, setNameError] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [tempImageSrc, setTempImageSrc] = useState<string>("")

  const plans = [
    { value: "free", label: "Free", description: "Perfect for small teams" },
    { value: "pro", label: "Pro", description: "Advanced features for growing teams" }
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
    
    if (id === "organizationName") {
      const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,19}$/
      if (value.length > 0 && !namePattern.test(value)) {
        setNameError("Name must be 3-20 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores")
      } else {
        setNameError("")
      }
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large", {
          description: "Please select an image smaller than 5MB"
        })
        return
      }
      
      if (!file.type.startsWith('image/')) {
        toast.error("Invalid file type", {
          description: "Please select an image file"
        })
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        setTempImageSrc(reader.result as string)
        setCropDialogOpen(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCropComplete = (croppedImage: File) => {
    setImageFile(croppedImage)
    const reader = new FileReader()
    reader.onload = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(croppedImage)
    setCropDialogOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,19}$/
    if (!namePattern.test(formData.organizationName)) {
      toast.error("Validation Error", {
        description: "Please enter a valid organization name"
      })
      return
    }

    if (!imageFile) {
      toast.error("Validation Error", {
        description: "Please upload an organization picture"
      })
      return
    }
    
    setIsLoading(true)

    try {
      const token = localStorage.getItem("access_token")
      
      if (!token) {
        toast.error("Authentication Error", {
          description: "Please log in to create an organization"
        })
        setTimeout(() => {
          window.location.href = "/auth/login"
        }, 1500)
        return
      }

      const formDataToSend = new FormData()
      formDataToSend.append("organization_name", formData.organizationName)
      formDataToSend.append("organization_description", formData.organizationDescription)
      formDataToSend.append("organization_plan", formData.organizationPlan)
      formDataToSend.append("image", imageFile)

      const response = await fetch("http://localhost:8000/create_organization", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formDataToSend,
      })

      const data = await response.json()
      console.log("Response status:", response.status)
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.detail || "Organization creation failed")
      }

      toast.success("Organization created successfully!", {
        description: `${formData.organizationName} has been created with tag #${data.organaization_tag}`,
      })
      
      setTimeout(() => {
        window.location.href = "/welcome"
      }, 1500)
      
    } catch (err) {
      console.error("Organization creation error:", err)
      toast.error("Creation failed", {
        description: err instanceof Error ? err.message : "Failed to create organization. Please try again.",
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
              alt="Organization illustration"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-8">
              <div className="text-white space-y-2">
                <h2 className="text-3xl font-bold">Create Your Organization</h2>
                <p className="text-lg text-white/90">Build and manage your team efficiently</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Side */}
        <Card className="w-full shadow-2xl border-muted/40 backdrop-blur rounded-l-none">
          <CardHeader className="space-y-3 pb-6">
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                New Organization
              </CardTitle>
              <CardDescription className="text-base">
                Set up your organization to start collaborating
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Name Field */}
              <div className="space-y-2">
                <Label htmlFor="organizationName" className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Organization Name
                </Label>
                <div className="relative group">
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="My Awesome Team"
                    maxLength={20}
                    value={formData.organizationName}
                    onChange={handleInputChange}
                    className={cn(
                      "transition-all duration-200 pl-3",
                      nameError && "border-red-500 focus-visible:ring-red-500",
                      formData.organizationName && !nameError && formData.organizationName.length >= 3 && "border-green-500 focus-visible:ring-green-500"
                    )}
                    required
                  />
                  {formData.organizationName && !nameError && formData.organizationName.length >= 3 && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                  )}
                </div>
                {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
                <p className="text-xs text-muted-foreground">
                  {formData.organizationName.length}/20 characters
                </p>
              </div>

              {/* Organization Description Field */}
              <div className="space-y-2">
                <Label htmlFor="organizationDescription" className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Description (Optional)
                </Label>
                <textarea
                  id="organizationDescription"
                  placeholder="Describe your organization..."
                  maxLength={500}
                  value={formData.organizationDescription}
                  onChange={handleInputChange}
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.organizationDescription.length}/500 characters
                </p>
              </div>

              {/* Organization Plan Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Select Plan
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.value}
                      onClick={() => setFormData(prev => ({ ...prev, organizationPlan: plan.value }))}
                      className={cn(
                        "relative flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-all hover:bg-accent/50",
                        formData.organizationPlan === plan.value
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-muted"
                      )}
                    >
                      <div className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                        formData.organizationPlan === plan.value
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )}>
                        {formData.organizationPlan === plan.value && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{plan.label}</p>
                        <p className="text-sm text-muted-foreground">{plan.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Organization Picture
                </Label>
                <div className="flex flex-col items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-primary">
                      <Image
                        src={imagePreview}
                        alt="Organization preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <Input
                    id="orgImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                disabled={isLoading || !!nameError || !formData.organizationName || !imageFile}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Organization...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-5 w-5" />
                    Create Organization
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Image Crop Dialog */}
      {cropDialogOpen && (
        <ImageCropDialog
          open={cropDialogOpen}
          onClose={() => setCropDialogOpen(false)}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
        />
      )}
    </div>
  )
}