"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  Hash, 
  Loader2, 
  Send,
  Info,
  Users,
  Building2,
  Smile,
  Paperclip,
  AtSign,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import Sidebar from "@/components/Sidebar/page"
import OrganizationNavBar from "@/components/OrganizationNavBar/page"
import MembersSidebar from "@/components/MembersSidebar/page"

interface ChannelDetails {
  channel_id: number
  channel_name: string
  type: string
  description?: string
  org_id: number
  created_at: string
  organization: {
    organization_id: number
    organization_name: string
    organaization_picture: string
    organaization_tag: string
  }
}

interface Message {
  message_id: number
  message_content: string
  sent_at: string
  edited_at: string
  sender: {
    user_id: number
    first_name: string
    last_name: string
    avatar_url: string | null
    user_tag: string
  }
}

export default function ChannelPage() {
  const router = useRouter()
  const params = useParams()
  const channelId = params?.id as string

  const [channel, setChannel] = useState<ChannelDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [showInfo, setShowInfo] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // Edit message states
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null)
  const [editMessageContent, setEditMessageContent] = useState("")
  const [isEditingMessage, setIsEditingMessage] = useState(false)

  // Delete message states
  const [deleteMessageDialogOpen, setDeleteMessageDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null)
  const [isDeletingMessage, setIsDeletingMessage] = useState(false)

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        // Get current user info
        const userResponse = await fetch("http://localhost:8000/profile", {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (userResponse.ok) {
          const userData = await userResponse.json()
          console.log('Setting current user ID:', userData.user_id)
          setCurrentUserId(userData.user_id)
        } else {
          console.error('Failed to fetch user data')
        }

        const response = await fetch(`http://localhost:8000/channel/${channelId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setChannel(data)
          // Fetch messages after channel is loaded
          await fetchMessages(data.org_id, token)
        } else {
          const errorData = await response.json()
          toast.error("Error", {
            description: errorData.detail || "Failed to load channel"
          })
          router.push('/welcome')
        }
      } catch (error) {
        console.error('Error fetching channel data:', error)
        toast.error("Error", {
          description: "Failed to load channel details"
        })
      } finally {
        setLoading(false)
      }
    }

    if (channelId) {
      fetchChannelData()
    }
  }, [channelId, router])

  const fetchMessages = async (orgId: number, token?: string) => {
    setLoadingMessages(true)
    try {
      const authToken = token || localStorage.getItem('access_token')
      if (!authToken) return

      const response = await fetch(
        `http://localhost:8000/organization/${orgId}/channel/${channelId}/messages`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      } else {
        const errorData = await response.json()
        toast.error("Error", {
          description: errorData.detail || "Failed to load messages"
        })
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error("Error", {
        description: "Failed to load messages"
      })
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !channel) return

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch('http://localhost:8000/channel/send_message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          channel_id: channel.channel_id,
          org_id: channel.org_id,
          message_content: message.trim()
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Message sent", {
          description: "Your message has been sent successfully"
        })
        setMessage("")
        // Refresh messages
        await fetchMessages(channel.org_id)
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to send message"
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error("Error", {
        description: "An error occurred while sending the message"
      })
    }
  }

  const handleEditMessage = (messageId: number, currentContent: string) => {
    setEditingMessageId(messageId)
    setEditMessageContent(currentContent)
  }

  const handleCancelEditMessage = () => {
    setEditingMessageId(null)
    setEditMessageContent("")
  }

  const handleUpdateMessage = async (messageId: number) => {
    if (!editMessageContent.trim()) {
      toast.error("Error", {
        description: "Message content cannot be empty"
      })
      return
    }

    setIsEditingMessage(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `http://localhost:8000/message/${messageId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message_content: editMessageContent.trim()
          })
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Message updated successfully"
        })
        // Update the message in the list
        setMessages(messages.map(msg => 
          msg.message_id === messageId 
            ? { ...msg, message_content: data.message_content, edited_at: data.edited_at }
            : msg
        ))
        setEditingMessageId(null)
        setEditMessageContent("")
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to update message"
        })
      }
    } catch (error) {
      console.error('Error updating message:', error)
      toast.error("Error", {
        description: "An error occurred while updating the message"
      })
    } finally {
      setIsEditingMessage(false)
    }
  }

  const handleDeleteMessageClick = (messageId: number) => {
    setMessageToDelete(messageId)
    setDeleteMessageDialogOpen(true)
  }

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return

    setIsDeletingMessage(true)
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await fetch(
        `http://localhost:8000/message/${messageToDelete}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (response.ok) {
        toast.success("Success", {
          description: "Message deleted successfully"
        })
        // Remove the message from the list
        setMessages(messages.filter(msg => msg.message_id !== messageToDelete))
        setDeleteMessageDialogOpen(false)
        setMessageToDelete(null)
      } else {
        toast.error("Error", {
          description: data.detail || "Failed to delete message"
        })
      }
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error("Error", {
        description: "An error occurred while deleting the message"
      })
    } finally {
      setIsDeletingMessage(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  if (loading) {
    return (
      <>
        <Sidebar />
        <main className="ml-[368px] mr-80 min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading channel...</p>
          </div>
        </main>
      </>
    )
  }

  if (!channel) {
    return null
  }

  return (
    <>
      <Sidebar />
      <OrganizationNavBar organizationId={channel.organization.organization_id} />
      <MembersSidebar organizationId={channel.organization.organization_id} />
      
      <main className={`ml-[368px] min-h-screen bg-muted/20 transition-all duration-300 ${showInfo ? 'mr-[640px]' : 'mr-80'}`}>
        {/* Channel Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 p-1.5 rounded-md">
                  <Hash className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold">{channel.channel_name}</h1>
                  {channel.description && (
                    <p className="text-xs text-muted-foreground">{channel.description}</p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="text-xs font-normal">
                {channel.type}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={showInfo ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setShowInfo(!showInfo)}
                className="h-9 w-9"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-88px)]">
          {/* Messages Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-5xl mx-auto">
                {/* Channel Welcome Message */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                      <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 shadow-lg border border-primary/10">
                        <Hash className="h-16 w-16 text-primary" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                      Welcome to #{channel.channel_name}
                    </h2>
                    <p className="text-muted-foreground mb-2 text-base">
                      This is the beginning of the <span className="font-semibold text-foreground">#{channel.channel_name}</span> channel.
                    </p>
                    {channel.description && (
                      <p className="text-sm text-muted-foreground max-w-md mt-2 bg-muted/50 rounded-lg px-4 py-2">
                        {channel.description}
                      </p>
                    )}
                    {!loadingMessages && (
                      <div className="mt-8">
                        <div className="bg-muted/50 rounded-full px-4 py-2">
                          <p className="text-sm text-muted-foreground">
                            No messages yet. Start the conversation! 
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Loading Messages */}
                {loadingMessages && messages.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}

                {/* Messages List */}
                {messages.length > 0 && (
                  <div className="space-y-6">
                    {messages.map((msg) => {
                      const isOwnMessage = currentUserId === msg.sender.user_id
                      console.log(`Message ${msg.message_id}: currentUserId=${currentUserId}, senderId=${msg.sender.user_id}, isOwn=${isOwnMessage}`)
                      return (
                      <div key={msg.message_id} className="flex gap-4 hover:bg-muted/30 -mx-4 px-4 py-2 rounded-lg transition-colors group">
                        <Avatar className="h-10 w-10 border-2 border-background shadow-sm">
                          <AvatarImage src={msg.sender.avatar_url || undefined} alt={msg.sender.first_name} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {msg.sender.first_name[0]}{msg.sender.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-semibold text-foreground">
                              {msg.sender.first_name} {msg.sender.last_name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {msg.sender.user_tag}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.sent_at).toLocaleString()}
                            </span>
                            {msg.edited_at !== msg.sent_at && (
                              <span className="text-xs text-muted-foreground italic">(edited)</span>
                            )}
                          </div>
                          
                          {/* Message Content or Edit Mode */}
                          {editingMessageId === msg.message_id ? (
                            <div className="mt-2">
                              <Input
                                value={editMessageContent}
                                onChange={(e) => setEditMessageContent(e.target.value)}
                                className="mb-2"
                                disabled={isEditingMessage}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleUpdateMessage(msg.message_id)
                                  } else if (e.key === 'Escape') {
                                    handleCancelEditMessage()
                                  }
                                }}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateMessage(msg.message_id)}
                                  disabled={isEditingMessage || !editMessageContent.trim()}
                                >
                                  {isEditingMessage ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    "Save"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleCancelEditMessage}
                                  disabled={isEditingMessage}
                                >
                                  Cancel
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Press Enter to save • Esc to cancel
                              </p>
                            </div>
                          ) : (
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                              {msg.message_content}
                            </p>
                          )}
                        </div>
                        
                        {/* Message Actions - Only show for message sender */}
                        {isOwnMessage && editingMessageId !== msg.message_id && (
                          <div className="transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleEditMessage(msg.message_id, msg.message_content)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Message
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteMessageClick(msg.message_id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Message
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    )})}
                  </div>
                )}
              </div>
            </div>

            {/* Message Input Area */}
            <div className="border-t bg-background/50 backdrop-blur px-4 py-4">
              <div className="max-w-5xl mx-auto">
                <form onSubmit={handleSendMessage} className="relative">
                  <div className="flex items-start gap-2">
                    {/* Main Input Container */}
                    <div className="flex-1 relative">
                      <div className="relative flex items-center bg-background rounded-lg border border-input shadow-sm hover:border-primary/50 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                        {/* Input Field */}
                        <Input
                          placeholder={`Message #${channel.channel_name}`}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          onKeyDown={handleKeyDown}
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 pr-24 h-[44px] bg-transparent"
                        />
                        
                        {/* Action Buttons */}
                        <div className="absolute right-2 flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Add emoji"
                          >
                            <Smile className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Attach file"
                          >
                            <Paperclip className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Helper Text */}
                      <div className="flex items-center gap-2 mt-2 px-3">
                        <p className="text-xs text-muted-foreground">
                          Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> to send
                        </p>
                      </div>
                    </div>
                    
                    {/* Send Button */}
                    <Button 
                      type="submit" 
                      size="lg"
                      disabled={!message.trim()}
                      className="h-[44px] px-6 shadow-sm flex-shrink-0"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Channel Info Sidebar - Fixed Position */}
      {showInfo && (
        <aside className="fixed top-0 right-80 h-screen w-80 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 overflow-y-auto z-30 shadow-xl">
          <div className="p-6 space-y-6">
            {/* Channel Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Info className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-base">Channel Info</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1.5">Channel Name</p>
                    <div className="flex items-center gap-2">
                      <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="font-medium">{channel.channel_name}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1.5">Type</p>
                    <Badge variant="secondary" className="text-xs">
                      {channel.type}
                    </Badge>
                  </div>
                  
                  {channel.description && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1.5">Description</p>
                      <p className="text-sm leading-relaxed">{channel.description}</p>
                    </div>
                  )}
                  
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider mb-1.5">Created</p>
                    <p className="text-sm">{new Date(channel.created_at).toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Organization Info */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-base">Organization</h3>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    <AvatarImage 
                      src={channel.organization.organaization_picture} 
                      alt={channel.organization.organization_name} 
                    />
                    <AvatarFallback className="bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {channel.organization.organization_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      #{channel.organization.organaization_tag}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Members Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold text-base">Members</h3>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground text-center py-2">
                  View all members in the right sidebar →
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Delete Message Dialog */}
      <Dialog open={deleteMessageDialogOpen} onOpenChange={setDeleteMessageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteMessageDialogOpen(false)}
              disabled={isDeletingMessage}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              onClick={handleDeleteMessage}
              disabled={isDeletingMessage}
            >
              {isDeletingMessage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Message"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
