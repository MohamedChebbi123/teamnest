"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import ImageCropDialog from "@/components/ImageCropDialog"

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

export default function EditProfile() {
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [updatingContact, setUpdatingContact] = useState(false)
    
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [showCropDialog, setShowCropDialog] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    
    const [email, setEmail] = useState("")
    const [country, setCountry] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")

    useEffect(() => {
        fetchProfile()
    }, [])

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem("access_token")
            if (!token) {
                toast.error("Please login first")
                return
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })

            if (!response.ok) {
                throw new Error("Failed to fetch profile")
            }

            const data = await response.json()
            setProfile(data)
            setFirstName(data.first_name)
            setLastName(data.last_name)
            setAvatarPreview(data.avatar_url)
            setEmail(data.email || "")
            setCountry(data.country || "")
            setPhoneNumber(data.phone_number || "")
        } catch (error) {
            toast.error("Failed to load profile")
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.type.startsWith("image/")) {
                toast.error("Please select a valid image file")
                return
            }

            const reader = new FileReader()
            reader.onload = () => {
                setSelectedImage(reader.result as string)
                setShowCropDialog(true)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleCroppedImage = (croppedFile: File) => {
        setAvatarFile(croppedFile)
        setAvatarPreview(URL.createObjectURL(croppedFile))
        setShowCropDialog(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdating(true)

        try {
            const token = localStorage.getItem("access_token")
            if (!token) {
                toast.error("Please login first")
                return
            }

            const formData = new FormData()
            
            // Only append fields that have changed
            if (firstName !== profile?.first_name) {
                formData.append("first_name", firstName)
            }
            
            if (lastName !== profile?.last_name) {
                formData.append("last_name", lastName)
            }
            
            if (avatarFile) {
                formData.append("avatar", avatarFile)
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/update-profile`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || "Failed to update profile")
            }

            const data = await response.json()
            toast.success("Profile updated successfully!")
            
            // Refresh profile data
            await fetchProfile()
            setAvatarFile(null)
            
        } catch (error: any) {
            toast.error(error.message || "Failed to update profile")
            console.error(error)
        } finally {
            setUpdating(false)
        }
    }

    const handleContactInfoSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setUpdatingContact(true)

        try {
            const token = localStorage.getItem("access_token")
            if (!token) {
                toast.error("Please login first")
                return
            }

            const formData = new FormData()
            
            // Only append fields that have changed
            if (email !== profile?.email) {
                formData.append("email", email)
            }
            
            if (country !== (profile?.country || "")) {
                formData.append("country", country)
            }
            
            if (phoneNumber !== (profile?.phone_number || "")) {
                formData.append("phone_number", phoneNumber)
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/update-contact-info`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || "Failed to update contact information")
            }

            const data = await response.json()
            toast.success("Contact information updated successfully!")
            
            // Refresh profile data
            await fetchProfile()
            
        } catch (error: any) {
            toast.error(error.message || "Failed to update contact information")
            console.error(error)
        } finally {
            setUpdatingContact(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading profile...</p>
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Failed to load profile</p>
            </div>
        )
    }

    return (
        <div className="container max-w-2xl mx-auto p-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Edit Profile</CardTitle>
                    <CardDescription>Update your name and avatar</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Avatar Section */}
                        <div className="flex flex-col items-center space-y-4">
                            <Avatar className="w-32 h-32">
                                <AvatarImage src={avatarPreview || undefined} />
                                <AvatarFallback className="text-2xl">
                                    {firstName.charAt(0)}{lastName.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                            
                            <div>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                    id="avatar-upload"
                                />
                                <Label htmlFor="avatar-upload">
                                    <Button type="button" variant="outline" onClick={() => document.getElementById("avatar-upload")?.click()}>
                                        Change Avatar
                                    </Button>
                                </Label>
                            </div>
                        </div>

                        {/* First Name */}
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder="Enter first name"
                            />
                        </div>

                        {/* Last Name */}
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder="Enter last name"
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <Button 
                                type="submit" 
                                disabled={updating}
                                className="flex-1"
                            >
                                {updating ? "Updating..." : "Update Profile"}
                            </Button>
                            
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => {
                                    setFirstName(profile.first_name)
                                    setLastName(profile.last_name)
                                    setAvatarPreview(profile.avatar_url)
                                    setAvatarFile(null)
                                }}
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Contact Information</CardTitle>
                    <CardDescription>Update your email, country, and phone number</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleContactInfoSubmit} className="space-y-6">
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter email address"
                            />
                        </div>

                        {/* Country */}
                        <div className="space-y-2">
                            <Label htmlFor="country">Country</Label>
                            <Input
                                id="country"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="Enter country"
                            />
                        </div>

                        {/* Phone Number */}
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input
                                id="phoneNumber"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="Enter phone number"
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <Button 
                                type="submit" 
                                disabled={updatingContact}
                                className="flex-1"
                            >
                                {updatingContact ? "Updating..." : "Update Contact Info"}
                            </Button>
                            
                            <Button 
                                type="button" 
                                variant="outline"
                                onClick={() => {
                                    setEmail(profile.email || "")
                                    setCountry(profile.country || "")
                                    setPhoneNumber(profile.phone_number || "")
                                }}
                            >
                                Reset
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Image Crop Dialog */}
            <ImageCropDialog
                open={showCropDialog}
                imageSrc={selectedImage || ""}
                onCropComplete={handleCroppedImage}
                onClose={() => setShowCropDialog(false)}
            />
        </div>
    )
}