'use client';

import{ useState, useEffect } from 'react';
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
  Plus,
  Bell,
  Mail,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [isResizing, setIsResizing] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const minWidth = 80;
  const maxWidth = 400;

  const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch("http://localhost:8000/profile", {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
          onUserFetched?.(data);
        } else {
          localStorage.removeItem('access_token');
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
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch("http://localhost:8000/get_org_for_admin_org", {
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

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    router.push('/auth/login');
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return (first + last).toUpperCase();
  };

  const getFullName = () => {
    return `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
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
  const unreadCount = activeNotifications.length;

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
        style={{ width: `${sidebarWidth}px` }}
        className={cn(
          'fixed top-0 left-0 z-40 h-screen',
          'bg-background border-r flex flex-col',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          isResizing ? 'select-none' : '',
          className
        )}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={startResizing}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-50"
        />
        {/* Sidebar Header */}
        <div className="flex items-center justify-center p-4 border-b">
          <Link href="/welcome">
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
            variant={pathname === '/welcome' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full h-12 transition-all',
              sidebarWidth > 150 ? 'justify-start gap-3 px-4' : 'justify-center px-2',
              pathname === '/welcome' && 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            <Link href="/welcome" title="Home">
              <Home className="h-5 w-5 flex-shrink-0" />
              {sidebarWidth > 150 && <span className="text-sm">Home</span>}
            </Link>
          </Button>

          {/* Notifications Button */}
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full h-12 relative transition-all',
                  sidebarWidth > 150 ? 'justify-start gap-3 px-4' : 'justify-center px-2'
                )}
                title="Notifications"
              >
                <Bell className="h-5 w-5 flex-shrink-0" />
                {sidebarWidth > 150 && <span className="text-sm">Notifications</span>}
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className={cn(
                      "h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs",
                      sidebarWidth > 150 ? "ml-auto" : "absolute -top-1 -right-1"
                    )}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-80 ml-2">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {activeNotifications.length > 0 ? (
                activeNotifications.map((notification) => {
                  const Icon = notification.icon;
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
                  );
                })
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
                      'flex items-center rounded-lg hover:bg-muted transition-all cursor-pointer group overflow-hidden',
                      sidebarWidth > 150 ? 'gap-3 p-2' : 'justify-center p-1',
                      pathname === `/organization/${org.organization_id}` && 'bg-primary/10 ring-2 ring-primary/50'
                    )}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={org.organaization_picture} alt={org.organization_name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    
                    {sidebarWidth > 150 && (
                      <span className="text-sm font-medium truncate">
                        {org.organization_name}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
              
              {/* Add Organization Button */}
              <Button
                asChild
                variant="ghost"
                className={cn(
                  'w-full h-12 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 transition-all',
                  sidebarWidth > 150 ? 'justify-start gap-3 px-4' : 'justify-center px-2'
                )}
              >
                <Link href="/organization/create_organizattion" title="Create Organization">
                  <Plus className="h-5 w-5 flex-shrink-0" />
                  {sidebarWidth > 150 && <span className="text-sm">Create Organization</span>}
                </Link>
              </Button>
            </div>
          )}
        </nav>

        {/* User Section */}
        <div className="mt-auto p-4 border-t">
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
                    'w-full h-12 transition-all overflow-hidden',
                    sidebarWidth > 150 ? 'justify-start gap-3 px-3' : 'justify-center px-2'
                  )}
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarImage src={user.avatar_url} alt={getFullName()} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.first_name || 'U', user.last_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  
                  {sidebarWidth > 150 && (
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <p className="text-sm font-medium truncate w-full">
                        {getFullName()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate w-full">
                        {user.email}
                      </p>
                    </div>
                  )}
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
      <div className="hidden lg:block" style={{ width: `${sidebarWidth}px` }} />
    </>
  );
}
