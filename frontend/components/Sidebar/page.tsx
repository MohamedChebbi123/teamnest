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
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

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
          'bg-background border-r flex flex-col w-20',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          className
        )}
      >
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
              'w-full justify-center px-2 h-12',
              pathname === '/welcome' && 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            <Link href="/welcome" title="Home">
              <Home className="h-5 w-5" />
            </Link>
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
                      'flex items-center justify-center p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer group relative',
                      pathname === `/organization/${org.organization_id}` && 'bg-primary/10 ring-2 ring-primary/50'
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={org.organaization_picture} alt={org.organization_name} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg border">
                      {org.organization_name}
                    </div>
                  </div>
                </Link>
              ))}
              
              {/* Add Organization Button */}
              <Button
                asChild
                variant="ghost"
                className="w-full justify-center px-2 h-12 border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
              >
                <Link href="/organization/create_organizattion" title="Create Organization">
                  <Plus className="h-5 w-5" />
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
                  className="w-full justify-center px-2 h-12 relative group"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url} alt={getFullName()} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(user.first_name || 'U', user.last_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-lg border">
                    {getFullName()}
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
      <div className="hidden lg:block w-20" />
    </>
  );
}
