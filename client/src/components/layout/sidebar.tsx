import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useAdmin } from "@/contexts/admin-context";
import { useCampaign } from "@/contexts/campaign-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
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
  Gift,
  BarChart3,
  Brain,
  ChevronDown,
  ChevronRight
} from "lucide-react";

const moduleItems = [
  { id: 1, name: "1 Campaign Builder", href: "/module/1", icon: Grid3X3, featured: true, description: "Campaign Setup" },
  { id: 2, name: "2 Social Channels", href: "/module/2", icon: Grid3X3, description: "Three-Tab Social Configuration" },
  { id: 3, name: "3 User Inputted News", href: "/module/3", icon: Grid3X3, description: "Manual News Entry" },
  { id: 4, name: "4 News Search", href: "/module/4", icon: Grid3X3, description: "Automated News Discovery" },
  { id: 5, name: "5 Google Keyword", href: "/module/5", icon: Grid3X3, description: "Keyword Research" },
  { id: 6, name: "6 Execution Module", href: "/module/6", icon: Grid3X3, description: "Content Generation" },
  { id: 7, name: "7 Proposal Builder", href: "/module/7", icon: Grid3X3, description: "Client Proposals" },
  { id: 8, name: "8 Metrics Tracker", href: "/module/8", icon: Grid3X3, description: "Performance Analytics" },
  { id: 9, name: "9 AI Discoverability", href: "/module/9", icon: Grid3X3, description: "SEO Tracking" }
];

// Special Omega-10 Audit Module
const auditModule = {
  id: 10,
  name: "10 AI Intelligence",
  href: "/module/omega-10",
  icon: FileText,
  restricted: true
};

const userMenuItems = [
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
    name: "User Management",
    href: "/admin/users",
    icon: User
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
  },
  {
    name: "AI Analytics",
    href: "/admin/analytics",
    icon: BarChart3
  }
];

const systemControlItems = [
  {
    name: "AI Model Routing",
    href: "/admin/model-router",
    icon: Brain
  }
];

export function Sidebar() {
  const [location] = useLocation();
  const { user } = useUser();
  const { isSupergod } = useAdmin();
  const { selectedCampaign } = useCampaign();
  const [adminOpen, setAdminOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/assets/newsglue-logo.png" 
              alt="NewsGlue Logo" 
              className="h-12 w-auto"
            />
          </div>
          {isSupergod && (
            <Badge variant="destructive" className="text-xs px-2 py-1">
              <Crown className="h-3 w-3 mr-1" />
              SuperGod
            </Badge>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1 px-3">
        <Collapsible open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-2 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                <span className="text-sm font-medium">Admin</span>
              </div>
              {userMenuOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {userMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-start ml-4 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800",
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

            {(user?.role === "admin" || user?.role === "supergod") && (
              <>
                <div className="ml-4 mt-2 mb-1">
                  <h4 className="px-2 py-1 text-xs font-medium text-foreground">
                    Administration
                  </h4>
                </div>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.href}
                      variant={isActive(item.href) ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "w-full justify-start ml-4 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800",
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

                {user?.role === "supergod" && (
                  <>
                    <div className="ml-4 mt-2 mb-1">
                      <h4 className="px-2 py-1 text-xs font-medium text-foreground">
                        Supergod
                      </h4>
                    </div>
                    {supergodItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.href}
                          variant={isActive(item.href) ? "secondary" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start ml-4 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800",
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

                    <div className="ml-4 mt-2 mb-1">
                      <h4 className="px-2 py-1 text-xs font-medium text-foreground">
                        System Controls
                      </h4>
                    </div>
                    {systemControlItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Button
                          key={item.href}
                          variant={isActive(item.href) ? "secondary" : "ghost"}
                          size="sm"
                          className={cn(
                            "w-full justify-start ml-4 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20",
                            isActive(item.href) && "bg-blue-50 dark:bg-blue-950/20"
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
                  </>
                )}
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Separator className="my-4" />

        {/* Only show modules when a campaign is selected */}
        {selectedCampaign && (
          <div className="space-y-1">
            <h3 className="px-2 py-1 text-sm font-medium text-foreground">
              Modules
            </h3>
            <div className="px-2 py-1 mb-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Campaign: {selectedCampaign.campaignName}
              </p>
            </div>
            {moduleItems.map((item) => {
              const Icon = item.icon;
              const isFeatured = item.featured;
              return (
                <Button
                  key={item.href}
                  variant={isActive(item.href) ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "w-full justify-start text-foreground hover:bg-gray-100 dark:hover:bg-gray-800",
                    isActive(item.href) && "bg-gray-100 dark:bg-gray-800",
                    isFeatured && "border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/30"
                  )}
                  asChild
                >
                  <a href={item.href}>
                    <Icon className="mr-2 h-3 w-3" />
                    <div className="flex flex-col items-start">
                      <span className={cn("text-sm", isFeatured && "font-semibold")}>{item.name}</span>
                      {isFeatured && (item as any).description && (
                        <span className="text-xs opacity-80">{(item as any).description}</span>
                      )}
                    </div>
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
        )}
      </ScrollArea>
      
      {/* Version Footer */}
      <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="text-xs text-foreground text-center">
          Omega-8-Clean-Core v1.0.0
        </div>
      </div>
    </div>
  );
}