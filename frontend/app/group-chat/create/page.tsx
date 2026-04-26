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
import { MessageCircle, FileText, Image as ImageIcon, Loader2, Upload, Check, UserPlus, Search, X } from "lucide-react"
import { cn, formatApiError } from "@/lib/utils"
import { toast } from "sonner"
import Image from "next/image"
import ImageCropDialog from "@/components/ImageCropDialog"
import Sidebar from "@/components/Sidebar/page"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface FriendItem {
  user_id: number
  first_name: string
  last_name: string
  user_tag: string
  avatar_url: string | null
}

export default function CreateGroupChat() {
  const [formData, setFormData] = useState({
    groupName: "",
    groupDescription: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [nameError, setNameError] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [tempImageSrc, setTempImageSrc] = useState<string>("")

  // Add members state
  const [step, setStep] = useState<"create" | "add_members">("create")
  const [createdGroupId, setCreatedGroupId] = useState<number | null>(null)
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [selectedFriends, setSelectedFriends] = useState<number[]>([])
  const [friendSearch, setFriendSearch] = useState("")
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [addingMembers, setAddingMembers] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))

    if (id === "groupName") {
      const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,29}$/
      if (value.length > 0 && !namePattern.test(value)) {
        setNameError("Name must be 3-30 characters, start with a letter or number, and contain only letters, numbers, spaces, hyphens, or underscores")
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

  const fetchFriendsForGroup = async (groupId: number) => {
    setLoadingFriends(true)
    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/group_chat/${groupId}/friends`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await response.json()
      if (response.ok) {
        setFriends(data)
      }
    } catch {
      toast.error("Failed to load friends list")
    } finally {
      setLoadingFriends(false)
    }
  }

  const toggleFriend = (userId: number) => {
    setSelectedFriends(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleAddMembers = async () => {
    if (selectedFriends.length === 0) {
      toast.error("Please select at least one friend to add")
      return
    }

    setAddingMembers(true)
    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/group_chat/${createdGroupId}/add_members`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(selectedFriends),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(formatApiError(data.detail, "Failed to add members"))
      }

      toast.success(`${data.count} member(s) added successfully!`)
      setTimeout(() => {
        window.location.href = "/direct-messages"
      }, 1500)
    } catch (err) {
      toast.error("Failed to add members", {
        description: err instanceof Error ? err.message : "Please try again.",
      })
    } finally {
      setAddingMembers(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const namePattern = /^[a-zA-Z0-9][a-zA-Z0-9\s_-]{2,29}$/
    if (!namePattern.test(formData.groupName)) {
      toast.error("Validation Error", {
        description: "Please enter a valid group name"
      })
      return
    }

    if (!imageFile) {
      toast.error("Validation Error", {
        description: "Please upload a group picture"
      })
      return
    }

    setIsLoading(true)

    try {
      const token = localStorage.getItem("access_token")

      if (!token) {
        toast.error("Authentication Error", {
          description: "Please log in to create a group chat"
        })
        setTimeout(() => {
          window.location.href = "/auth/login"
        }, 1500)
        return
      }

      const formDataToSend = new FormData()
      formDataToSend.append("group_name", formData.groupName)
      formDataToSend.append("group_description", formData.groupDescription)
      formDataToSend.append("image", imageFile)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/create_group_chat`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formDataToSend,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(formatApiError(data.detail, "Group chat creation failed"))
      }

      toast.success("Group chat created successfully!", {
        description: `${formData.groupName} has been created. Now add members!`
      })

      setCreatedGroupId(data.id)
      setStep("add_members")
      fetchFriendsForGroup(data.id)

    } catch (err) {
      console.error("Group chat creation error:", err)
      toast.error("Creation failed", {
        description: err instanceof Error ? err.message : "Failed to create group chat. Please try again.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredFriends = friends.filter(f =>
    `${f.first_name} ${f.last_name}`.toLowerCase().includes(friendSearch.toLowerCase())
  )

  return (
    <>
      <Sidebar />
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-0 items-stretch">
          {/* Image Side */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-full h-full rounded-l-2xl overflow-hidden shadow-2xl">
              <Image
                src="/registerimage.jpeg"
                fill
                alt="Group chat illustration"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-8">
                <div className="text-white space-y-2">
                  <h2 className="text-3xl font-bold">
                    {step === "create" ? "Create a Group Chat" : "Add Members"}
                  </h2>
                  <p className="text-lg text-white/90">
                    {step === "create" ? "Start a conversation with your team" : "Invite friends to your group"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          {step === "create" ? (
            <Card className="w-full shadow-2xl border-muted/40 backdrop-blur rounded-l-none">
              <CardHeader className="space-y-3 pb-6">
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    New Group Chat
                  </CardTitle>
                  <CardDescription className="text-base">
                    Set up a group chat to start messaging together
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Group Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="groupName" className="text-sm font-medium flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-primary" />
                      Group Name
                    </Label>
                    <div className="relative group">
                      <Input
                        id="groupName"
                        type="text"
                        placeholder="My Group Chat"
                        maxLength={30}
                        value={formData.groupName}
                        onChange={handleInputChange}
                        className={cn(
                          "transition-all duration-200 pl-3",
                          nameError && "border-red-500 focus-visible:ring-red-500",
                          formData.groupName && !nameError && formData.groupName.length >= 3 && "border-green-500 focus-visible:ring-green-500"
                        )}
                        required
                      />
                      {formData.groupName && !nameError && formData.groupName.length >= 3 && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                      )}
                    </div>
                    {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
                    <p className="text-xs text-muted-foreground">
                      {formData.groupName.length}/30 characters
                    </p>
                  </div>

                  {/* Group Description Field */}
                  <div className="space-y-2">
                    <Label htmlFor="groupDescription" className="text-sm font-medium flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Description
                    </Label>
                    <textarea
                      id="groupDescription"
                      placeholder="Describe your group chat..."
                      maxLength={500}
                      value={formData.groupDescription}
                      onChange={handleInputChange}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.groupDescription.length}/500 characters
                    </p>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      Group Picture
                    </Label>
                    <div className="flex flex-col items-center gap-4">
                      {imagePreview ? (
                        <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-primary">
                          <Image
                            src={imagePreview}
                            alt="Group preview"
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
                        id="groupImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                    disabled={isLoading || !!nameError || !formData.groupName || !imageFile}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating Group Chat...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Create Group Chat
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full shadow-2xl border-muted/40 backdrop-blur rounded-l-none">
              <CardHeader className="space-y-3 pb-4">
                <div className="space-y-2">
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Add Members
                  </CardTitle>
                  <CardDescription className="text-base">
                    Select friends to add to <span className="font-semibold">{formData.groupName}</span>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pb-6 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search friends..."
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Selected count */}
                {selectedFriends.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedFriends.map(id => {
                      const friend = friends.find(f => f.user_id === id)
                      if (!friend) return null
                      return (
                        <div
                          key={id}
                          className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1 text-sm"
                        >
                          <span>{friend.first_name}</span>
                          <button onClick={() => toggleFriend(id)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Friends list */}
                <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1">
                  {loadingFriends ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredFriends.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {friends.length === 0 ? "No friends available to add" : "No friends match your search"}
                    </div>
                  ) : (
                    filteredFriends.map(friend => (
                      <div
                        key={friend.user_id}
                        onClick={() => toggleFriend(friend.user_id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all",
                          selectedFriends.includes(friend.user_id)
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-accent/60 border border-transparent"
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {friend.first_name.charAt(0)}{friend.last_name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {friend.first_name} {friend.last_name}
                          </p>
                          {friend.user_tag && (
                            <p className="text-xs text-muted-foreground">#{friend.user_tag}</p>
                          )}
                        </div>
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all",
                          selectedFriends.includes(friend.user_id)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/30"
                        )}>
                          {selectedFriends.includes(friend.user_id) && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => {
                      window.location.href = "/direct-messages"
                    }}
                  >
                    Skip
                  </Button>
                  <Button
                    className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
                    disabled={addingMembers || selectedFriends.length === 0}
                    onClick={handleAddMembers}
                  >
                    {addingMembers ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-5 w-5" />
                        Add {selectedFriends.length > 0 ? `(${selectedFriends.length})` : "Members"}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
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
    </>
  )
}
