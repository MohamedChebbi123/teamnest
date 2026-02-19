'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Settings,
  Menu,
  X,
  Building2,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isOrgsExpanded, setIsOrgsExpanded] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleMobileSidebar = () => setIsMobileOpen(!isMobileOpen);

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
  }, [router, onUserFetched, onOrganizationFetched]);

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
        className={cn(
          'fixed top-0 left-0 z-40 h-screen transition-all duration-300 ease-in-out',
          'bg-background border-r flex flex-col',
          isOpen ? 'w-64' : 'w-20',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {isOpen && (
            <h2 className="text-xl font-bold tracking-tight">TeamNest</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="hidden lg:flex"
          >
            {isOpen ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {/* Home Button */}
          <Button
            asChild
            variant={pathname === '/welcome' ? 'secondary' : 'ghost'}
            className={cn(
              'w-full justify-start',
              !isOpen && 'justify-center px-2',
              pathname === '/welcome' && 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            <Link href="/welcome" title={!isOpen ? 'Home' : ''}>
              <Home className="h-5 w-5" />
              {isOpen && <span className="ml-3">Home</span>}
            </Link>
          </Button>

          {/* Organizations Section */}
          {organizations.length > 0 && (
            <div className="pt-4">
              <Button
                variant="ghost"
                onClick={() => setIsOrgsExpanded(!isOrgsExpanded)}
                className={cn(
                  'w-full justify-between px-2 mb-2 hover:bg-muted',
                  !isOpen && 'justify-center'
                )}
              >
                {isOpen && (
                  <>
                    <span className="text-xs font-semibold text-muted-foreground">
                      ORGANIZATIONS
                    </span>
                    {isOrgsExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </>
                )}
                {!isOpen && <Building2 className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          )}
          
          {/* Organization List */}
          {isOrgsExpanded && organizations.length > 0 ? (
            organizations.map((org: OrganizationData) => (
              <Button
                key={org.organization_id}
                asChild
                variant={pathname === `/organization/${org.organization_id}` ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  !isOpen && 'justify-center px-2',
                  pathname === `/organization/${org.organization_id}` && 'bg-primary/10 text-primary hover:bg-primary/20'
                )}
              >
                <Link href={`/organization/${org.organization_id}`} title={!isOpen ? org.organization_name : ''}>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={org.organaization_picture} alt={org.organization_name} />
                    <AvatarFallback className="bg-muted">
                      <Building2 className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  {isOpen && (
                    <div className="flex flex-col items-start ml-3 flex-1 min-w-0">
                      <span className="text-sm truncate">{org.organization_name}</span>
                      {org.organaization_tag && (
                        <span className="text-xs text-muted-foreground">#{org.organaization_tag}</span>
                      )}
                    </div>
                  )}
                </Link>
              </Button>
            ))
          ) : null}

          
        </nav>

        {/* User Section */}
        <div className="mt-auto p-4 border-t">
          {loading || !user ? (
            <div className={cn(
              'w-full flex items-center',
              isOpen ? 'justify-start' : 'justify-center'
            )}>
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              {isOpen && (
                <div className="flex flex-col ml-3 flex-1 space-y-2">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-2 w-32 bg-muted rounded animate-pulse" />
                </div>
              )}
            </div>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full',
                    isOpen ? 'justify-start' : 'justify-center px-2'
                  )}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} alt={getFullName()} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.first_name || 'U', user.last_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  {isOpen && (
                    <div className="flex flex-col items-start ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{getFullName()}</p>
                      <p className="text-xs text-muted-foreground truncate">
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
      <div
        className={cn(
          'hidden lg:block transition-all duration-300',
          isOpen ? 'w-64' : 'w-20'
        )}
      />
    </>
  );
}
