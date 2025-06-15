import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Home, 
  Settings, 
  Grid3X3, 
  User, 
  CreditCard,
  Shield,
  Crown
} from "lucide-react";

const moduleItems = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `Module ${i + 1}`,
  href: `/module/${i + 1}`,
  icon: Grid3X3
}));

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home
  },
  {
    name: "Profile",
    href: "/profile",
    icon: User
  },
  {
    name: "Subscription",
    href: "/subscription",
    icon: CreditCard
  }
];

const adminItems = [
  {
    name: "Admin Panel",
    href: "/admin",
    icon: Shield
  },
  {
    name: "Logs",
    href: "/admin/logs",
    icon: Settings
  }
];

const supergodItems = [
  {
    name: "Supergod Panel",
    href: "/supergod",
    icon: Crown
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="p-6">
        <h2 className="text-lg font-semibold">Omega-8</h2>
        <p className="text-sm text-muted-foreground">Clean Core</p>
      </div>
      
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive(item.href) && "bg-secondary"
                )}
                asChild
              >
                <a href={item.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.name}
                </a>
              </Button>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <h3 className="px-2 py-1 text-sm font-medium text-muted-foreground">
            Modules
          </h3>
          {moduleItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                variant={isActive(item.href) ? "secondary" : "ghost"}
                size="sm"
                className={cn(
                  "w-full justify-start",
                  isActive(item.href) && "bg-secondary"
                )}
                asChild
              >
                <a href={item.href}>
                  <Icon className="mr-2 h-3 w-3" />
                  {item.name}
                </a>
              </Button>
            );
          })}
        </div>

        {(user?.role === "admin" || user?.role === "supergod") && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              <h3 className="px-2 py-1 text-sm font-medium text-muted-foreground">
                Administration
              </h3>
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start",
                      isActive(item.href) && "bg-secondary"
                    )}
                    asChild
                  >
                    <a href={item.href}>
                      <Icon className="mr-2 h-3 w-3" />
                      {item.name}
                    </a>
                  </Button>
                );
              })}
            </div>
          </>
        )}

        {user?.role === "supergod" && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              <h3 className="px-2 py-1 text-sm font-medium text-muted-foreground">
                Supergod
              </h3>
              {supergodItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.href}
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "w-full justify-start",
                      isActive(item.href) && "bg-secondary"
                    )}
                    asChild
                  >
                    <a href={item.href}>
                      <Icon className="mr-2 h-3 w-3" />
                      {item.name}
                    </a>
                  </Button>
                );
              })}
            </div>
          </>
        )}
      </ScrollArea>
    </div>
  );
}