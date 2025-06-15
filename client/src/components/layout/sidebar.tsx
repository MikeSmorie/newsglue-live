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
  Crown,
  KeyRound,
  FileText,
  Gift
} from "lucide-react";

const moduleItems = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  name: `Module ${i + 1}`,
  href: `/module/${i + 1}`,
  icon: Grid3X3
}));

// Special Omega-10 Audit Module
const auditModule = {
  id: 10,
  name: "Omega-10 Audit",
  href: "/module/omega-10",
  icon: FileText,
  restricted: true
};

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
  },
  {
    name: "Refer & Earn",
    href: "/referrals",
    icon: Gift
  },
  {
    name: "Two-Factor Auth",
    href: "/2fa",
    icon: KeyRound
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
  },
  {
    name: "Subscriptions",
    href: "/admin/subscriptions",
    icon: CreditCard
  }
];

const supergodItems = [
  {
    name: "Supergod Panel",
    href: "/supergod",
    icon: Crown
  },
  {
    name: "Audit Logs",
    href: "/admin/audit",
    icon: Shield
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
    <div className="flex h-full w-64 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Omega-8</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">Clean Core</p>
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
                  "w-full justify-start text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800",
                  isActive(item.href) && "bg-gray-100 dark:bg-gray-800"
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
          <h3 className="px-2 py-1 text-sm font-medium text-gray-600 dark:text-gray-400">
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
                  "w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                  isActive(item.href) && "bg-gray-100 dark:bg-gray-800"
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
          
          {/* Omega-10 Audit Module - Admin/Supergod Only */}
          {(user?.role === "admin" || user?.role === "supergod") && (
            <Button
              variant={isActive(auditModule.href) ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20",
                isActive(auditModule.href) && "bg-red-50 dark:bg-red-950/20"
              )}
              asChild
            >
              <a href={auditModule.href}>
                <FileText className="mr-2 h-3 w-3" />
                {auditModule.name}
              </a>
            </Button>
          )}
        </div>

        {(user?.role === "admin" || user?.role === "supergod") && (
          <>
            <Separator className="my-4" />
            <div className="space-y-1">
              <h3 className="px-2 py-1 text-sm font-medium text-gray-600 dark:text-gray-400">
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
                      "w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                      isActive(item.href) && "bg-gray-100 dark:bg-gray-800"
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
              <h3 className="px-2 py-1 text-sm font-medium text-gray-600 dark:text-gray-400">
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
                      "w-full justify-start text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                      isActive(item.href) && "bg-gray-100 dark:bg-gray-800"
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
      
      {/* Version Footer */}
      <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Omega-8-Clean-Core v1.0.0
        </div>
      </div>
    </div>
  );
}