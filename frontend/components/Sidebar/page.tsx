'use client';

import{ useState, useEffect } from 'react';
import { useOnlineStatus } from '@/context/OnlineStatusContext';
import { useFriendRequests } from '@/context/FriendRequestContext';
import { useDirectMessageNotifications } from '@/context/DirectMessageNotificationContext';
import { useMentionNotifications } from '@/context/MentionNotificationContext';
import { useTheme } from '@/context/ThemeContext';
import { getAccessToken, clearAccessToken } from '@/lib/auth';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Settings,
  Menu,
  X,
  Building2,
  User,
  LogOut,
  Bell,
  Mail,
  FileText,
  Users,
  MessageCircle,
  Plus,
  UserPlus,
  Sun,
  Moon,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { logout as logoutApi } from '@/lib/auth';
import { startTutorial } from '@/components/Tutorial/Tutorial';
import type { PresenceStatus } from '@/context/OnlineStatusContext';
import { toast } from 'sonner';
import { formatApiError } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface UserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
  is_verified?: boolean;
  profile_completed?: boolean;
}

interface OrganizationData {
  organization_id: number;
  organization_name: string;
  organaization_picture: string;
  organaization_tag?: string;
}

interface SidebarProps {
  className?: string;
  onUserFetched?: (user: UserData | null) => void;
  onOrganizationFetched?: (org: OrganizationData | null) => void;
}

export default function Sidebar({ className, onUserFetched, onOrganizationFetched }: SidebarProps) {
  const SIDEBAR_WIDTH = 80;
  const { theme, toggleTheme } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgTag, setOrgTag] = useState('');
  const [sendingJoin, setSendingJoin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { disconnect, myStatus, setMyStatus } = useOnlineStatus()
  const { unreadCount: friendRequestUnread } = useFriendRequests()
  const { unreadDmCount, markDmsRead } = useDirectMessageNotifications()
  const { unreadCount: mentionUnread } = useMentionNotifications()
  const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen);

  useEffect(() => {
    if (pathname === '/direct-messages' || pathname?.startsWith('/direct-messages')) {
      markDmsRead();
    }
  }, [pathname]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
          onUserFetched?.(data);
        } else {
          clearAccessToken();
          router.push('/auth/login');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        router.push('/auth/login');
      } finally {
        setLoading(false);
      }
    };

    const fetchOrganizations = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get_org_for_admin_org`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setOrganizations(data);
          // Notify parent of first organization
          if (data && data.length > 0) {
            onOrganizationFetched?.(data[0]);
          }
        } else if (response.status === 404) {
          // No organization found for this admin
          setOrganizations([]);
          onOrganizationFetched?.(null);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setOrganizations([]);
        onOrganizationFetched?.(null);
      }
    };

    fetchUserProfile();
    fetchOrganizations();
  }, [router]);

  const handleLogout = async () => {
    disconnect()
    await logoutApi()
    router.push('/auth/login');
  };

  const handleCreateOrganization = () => {
    if (!user?.is_verified) {
      toast.error("Email Verification Required", {
        description: "You need to verify your email before creating an organization.",
        action: {
          label: "Verify Email",
          onClick: () => router.push("/auth/verify-email"),
        },
      });
      return;
    }
    router.push("/organization/create_organizattion");
  };

  const handleSendJoinRequest = async () => {
    if (!user?.is_verified) {
      toast.error("Email Verification Required", {
        description: "You need to verify your email before joining an organization.",
        action: {
          label: "Verify Email",
          onClick: () => router.push("/auth/verify-email"),
        },
      });
      return;
    }

    const token = getAccessToken();
    if (!token) {
      toast.error("Authentication Required", { description: "Please login again." });
      router.push('/auth/login');
      return;
    }

    const trimmedName = orgSearch.trim();
    const parsedTag = Number(orgTag);

    if (!trimmedName) {
      toast.error("Organization name is required");
      return;
    }
    if (!orgTag || Number.isNaN(parsedTag) || parsedTag <= 0) {
      toast.error("Organization tag must be a valid number");
      return;
    }

    try {
      setSendingJoin(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/organization/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ org_name: trimmedName, org_tag: parsedTag }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error("Join Failed", { description: formatApiError(payload?.detail, "Failed to send join request") });
        return;
      }

      toast.success("Request Sent", { description: "Your join request has been sent successfully." });
      setOrgSearch('');
      setOrgTag('');
      setShowJoinDialog(false);
    } catch {
      toast.error("Network Error", { description: "Could not connect to server." });
    } finally {
      setSendingJoin(false);
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  const getFullName = () => {
    return `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  };

  const STATUS_OPTIONS: { value: PresenceStatus; label: string; dot: string }[] = [
    { value: 'online', label: 'Online', dot: 'bg-emerald-500' },
    { value: 'away', label: 'Away', dot: 'bg-amber-500' },
    { value: 'dnd', label: 'Do not disturb', dot: 'bg-rose-500' },
  ];

  const statusDotClass = (s: PresenceStatus) => {
    switch (s) {
      case 'online': return 'bg-emerald-500';
      case 'away': return 'bg-amber-500';
      case 'dnd': return 'bg-rose-500';
      default: return 'bg-muted-foreground/40';
    }
  };

  const statusLabel = (s: PresenceStatus) => {
    switch (s) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'dnd': return 'Do not disturb';
      default: return 'Offline';
    }
  };

  // Notifications
  const notifications = [
    {
      id: 1,
      title: "Verify your email",
      description: "Please verify your email address to access all features",
      action: () => router.push('/auth/verify-email'),
      show: user && !user.is_verified,
      icon: Mail
    },
    {
      id: 2,
      title: "Complete your profile",
      description: "Finalize your profile to get started",
      action: () => router.push('/auth/complete-profile'),
      show: user && !user.profile_completed,
      icon: FileText
    }
  ];

  const activeNotifications = notifications.filter(n => n.show);
  const unreadCount = activeNotifications.length + friendRequestUnread + mentionUnread;

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={toggleMobileSidebar}
        className="lg:hidden fixed top-4 left-4 z-50"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={toggleMobileSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{ width: `${SIDEBAR_WIDTH}px` }}
        className={cn(
          'fixed top-0 left-0 z-40 h-screen',
          'bg-muted/35 border-r flex flex-col backdrop-blur-[1px]',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-center p-4 border-b">
          <Link href="/home">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">TN</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {/* Home Button */}
          <Button
            asChild
            variant={pathname === '/welcome' || pathname === '/home' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full h-12 transition-all',
              'justify-center px-2',
              (pathname === '/welcome' || pathname === '/home') && 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            <Link href="/home" title="Home" data-tour="sidebar-home">
              <Home className="h-5 w-5 flex-shrink-0" />
            </Link>
          </Button>

          {/* Friends Button */}
          <Button
            asChild
            variant={pathname === '/friends' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full h-12 transition-all',
              'justify-center px-2',
              pathname === '/friends' && 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
            data-tour="sidebar-friends"
          >
            <Link href="/friends" title="Friends">
              <Users className="h-5 w-5 flex-shrink-0" />
            </Link>
          </Button>

          {/* Direct Messages Button */}
          <Button
            variant={pathname === '/direct-messages' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full h-12 relative transition-all',
              'justify-center px-2',
              pathname === '/direct-messages' && 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
            onClick={() => { markDmsRead(); router.push('/direct-messages'); }}
            title="Direct Messages"
            data-tour="sidebar-dm"
          >
            <MessageCircle className="h-5 w-5 flex-shrink-0" />
            {unreadDmCount > 0 && (
              <Badge
                variant="destructive"
                className={cn(
                  "h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs",
                  "absolute -top-1 -right-1"
                )}
              >
                {unreadDmCount > 99 ? '99+' : unreadDmCount}
              </Badge>
            )}
          </Button>

          {/* Create Group Chat Button */}
          <Button
            asChild
            variant={pathname === '/group-chat/create' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full h-12 transition-all',
              'justify-center px-2',
              pathname === '/group-chat/create' && 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            <Link href="/group-chat/create" title="Create Group Chat">
              <UserPlus className="h-5 w-5 flex-shrink-0" />
            </Link>
          </Button>

          {/* Notifications Button */}
          <Button
            variant={pathname === '/notifications' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full h-12 relative transition-all hover:bg-accent/60',
              'justify-center px-2',
              pathname === '/notifications' && 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
            title="Notifications"
            onClick={() => router.push('/notifications')}
          >
            <Bell className="h-5 w-5 flex-shrink-0" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className={cn(
                  "h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs",
                  "absolute -top-1 -right-1"
                )}
              >
                {unreadCount}
              </Badge>
            )}
          </Button>

          {/* Contact Admin Button */}
          <Button
            variant="ghost"
            className="w-full h-12 justify-center px-2 transition-all hover:bg-accent/60"
            title="Contact Admin"
            onClick={() => setShowAdminDialog(true)}
          >
            <Mail className="h-5 w-5 flex-shrink-0" />
          </Button>

          {/* Divider */}
          {organizations.length > 0 && (
            <div className="py-2">
              <div className="h-px bg-border" />
            </div>
          )}

          {/* Organizations Section - Only Images */}
          {organizations.length > 0 && (
            <div className="space-y-2">
              {organizations.map((org: OrganizationData) => (
                <Link
                  key={org.organization_id}
                  href={`/organization/${org.organization_id}`}
                  title={org.organization_name}
                >
                  <div
                    className={cn(
                      'flex items-center rounded-lg hover:bg-accent/60 transition-all cursor-pointer group overflow-hidden',
                      'justify-center p-1',
                      pathname === `/organization/${org.organization_id}` && 'bg-primary/10 ring-2 ring-primary/50'
                    )}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={org.organaization_picture} alt={org.organization_name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Create / Join Organization Button */}
          <TooltipProvider>
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full h-12 transition-all',
                        'justify-center px-2',
                        'border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/60'
                      )}
                      data-tour="sidebar-add-org"
                    >
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Add Organization</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start" side="right" className="w-56 ml-2">
                <DropdownMenuLabel>Organization</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCreateOrganization} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Organization
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowJoinDialog(true)} className="cursor-pointer">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Join Organization
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </nav>

        {/* Theme Toggle */}
        <div className="px-4 pb-2">
          <Button
            variant="ghost"
            className="w-full h-10 justify-center px-2"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        {/* User Section */}
        <div className="p-4 border-t">
          {loading || !user ? (
            <div className="flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                      'w-full h-12 transition-all overflow-hidden hover:bg-accent/60',
                    'justify-center px-2'
                  )}
                  title={`Status: ${statusLabel(myStatus)}`}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={user.avatar_url} alt={getFullName()} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(user.first_name || 'U', user.last_name || '')}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        'absolute bottom-0 right-0 h-3 w-3 rounded-full ring-2 ring-background',
                        statusDotClass(myStatus)
                      )}
                    />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getFullName()}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                  Status
                </DropdownMenuLabel>
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setMyStatus(option.value)}
                    className="cursor-pointer"
                  >
                    <span className={cn('mr-2 h-2.5 w-2.5 rounded-full', option.dot)} />
                    <span className="flex-1">{option.label}</span>
                    {myStatus === option.value && (
                      <span className="text-xs text-muted-foreground">Active</span>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/auth/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/edit_profile">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => startTutorial()} className="cursor-pointer">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Restart tutorial
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      {/* Spacer for content */}
      <div className="hidden lg:block" style={{ width: `${SIDEBAR_WIDTH}px` }} />

      {/* Contact Admin Dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Contact Admin</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Admin Email</p>
              <p className="text-sm text-muted-foreground break-all">mohamed.chebbi.official@gmail.com</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Join Organization Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join an Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization Name</label>
              <Input
                placeholder="Enter organization name"
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
                disabled={sendingJoin}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Organization Tag</label>
              <Input
                placeholder="e.g. 123456"
                type="number"
                value={orgTag}
                onChange={(e) => setOrgTag(e.target.value)}
                disabled={sendingJoin}
              />
            </div>
            <Button
              onClick={handleSendJoinRequest}
              className="w-full"
              disabled={sendingJoin}
            >
              {sendingJoin ? "Sending..." : "Send Join Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}