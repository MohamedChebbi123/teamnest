"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export default function ChannelPage() {
  const router = useRouter()
  const params = useParams()
  const channelId = params?.id as string

  const [channel, setChannel] = useState<ChannelDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        const response = await fetch(`http://localhost:8000/channel/${channelId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setChannel(data)
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    // TODO: Implement message sending functionality
    toast.info("Coming Soon", {
      description: "Message functionality will be implemented soon"
    })
    setMessage("")
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e as any)
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
                </div>

                {/* Placeholder for messages */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-8">
                    <div className="bg-muted/50 rounded-full px-4 py-2">
                      <p className="text-sm text-muted-foreground">
                        No messages yet. Start the conversation! 💬
                      </p>
                    </div>
                  </div>
                </div>
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
    </>
  )
}
