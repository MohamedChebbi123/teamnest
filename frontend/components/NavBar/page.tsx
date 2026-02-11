"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, User, Settings, LogOut, Mail, FileText } from 'lucide-react'

interface NavBarProps {
  user?: {
    name?: string
    email?: string
    image?: string
    emailVerified?: boolean
    portfolioCompleted?: boolean
  }
}

export default function NavBar({ user }: NavBarProps) {
  const router = useRouter()
  const [showNotifications, setShowNotifications] = useState(false)

  if (!user) {
    return null
  }

  const notifications = [
    {
      id: 1,
      title: "Verify your email",
      description: "Please verify your email address to access all features",
      action: () => router.push('/auth/verify-email'),
      show: !user.emailVerified,
      icon: Mail
    },
    {
      id: 2,
      title: "Finalize your portfolio",
      description: "Complete your portfolio to get started",
      action: () => router.push('/auth/complete-profile'),
      show: !user.portfolioCompleted,
      icon: FileText
    }
  ]

  const activeNotifications = notifications.filter(n => n.show)
  const unreadCount = activeNotifications.length

  const handleLogout = () => {
    localStorage.removeItem("access_token")
    router.push('/auth/login')
  }

  const handleProfileClick = () => {
    router.push('/auth/profile')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="TeamNest Logo" className="h-10 w-10 rounded-lg object-cover" />
            <Link href="/" className="text-2xl font-bold text-primary">
              TeamNest
            </Link>
          </div>

          {/* Right side - Notifications & User Menu */}
          <div className="flex items-center gap-4">
            {/* Notifications Dropdown */}
            <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activeNotifications.length > 0 ? (
                  activeNotifications.map((notification) => {
                    const Icon = notification.icon
                    return (
                      <DropdownMenuItem 
                        key={notification.id}
                        onClick={notification.action}
                        className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{notification.title}</span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-6">
                          {notification.description}
                        </span>
                      </DropdownMenuItem>
                    )
                  })
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No new notifications
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarImage src={user.image} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.name || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}
