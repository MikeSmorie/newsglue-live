import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  LogOut, 
  User, 
  Settings,
  ChevronDown,
  Crown,
  Shield
} from "lucide-react";

function getBreadcrumbs(location: string) {
  const segments = location.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Dashboard', href: '/' }];

  if (segments.length === 0) return breadcrumbs;

  if (segments[0] === 'module' && segments[1]) {
    breadcrumbs.push({
      name: `Module ${segments[1]}`,
      href: `/module/${segments[1]}`
    });
  } else if (segments[0] === 'admin') {
    breadcrumbs.push({ name: 'Admin', href: '/admin' });
    if (segments[1] === 'logs') {
      breadcrumbs.push({ name: 'Logs', href: '/admin/logs' });
    }
  } else if (segments[0] === 'supergod') {
    breadcrumbs.push({ name: 'Supergod', href: '/supergod' });
  } else if (segments[0] === 'subscription') {
    breadcrumbs.push({ name: 'Subscription', href: '/subscription' });
  } else if (segments[0] === 'profile') {
    breadcrumbs.push({ name: 'Profile', href: '/profile' });
  }

  return breadcrumbs;
}

function getRoleIcon(role: string) {
  switch (role) {
    case 'supergod':
      return <Crown className="h-3 w-3" />;
    case 'admin':
      return <Shield className="h-3 w-3" />;
    default:
      return <User className="h-3 w-3" />;
  }
}

function getRoleVariant(role: string) {
  switch (role) {
    case 'supergod':
      return 'destructive' as const;
    case 'admin':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

export function Header() {
  const [location, navigate] = useLocation();
  const { user, logout } = useUser();
  const { toast } = useToast();
  const breadcrumbs = getBreadcrumbs(location);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (!result.ok) {
        throw new Error(result.message);
      }
      toast({
        title: "Logged out successfully",
        description: "See you next time!",
      });
      navigate("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center space-x-4">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>
                      {crumb.name}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="flex items-center space-x-4">
        {user && (
          <>
            <div className="flex items-center space-x-2">
              <Badge variant={getRoleVariant(user.role)} className="flex items-center gap-1">
                {getRoleIcon(user.role)}
                {user.role}
              </Badge>
            </div>

            <Separator orientation="vertical" className="h-6" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{user.username}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/subscription')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Subscription</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
    </header>
  );
}