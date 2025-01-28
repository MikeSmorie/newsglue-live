import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Home, Settings, Users } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-user";
import { useAdmin } from "@/contexts/admin-context";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export function NavigationControls() {
  const [, navigate] = useLocation();
  const { user } = useUser();
  const { godMode } = useAdmin();

  // Check if user is admin with god mode
  const isGodModeAdmin = user?.role === "admin" && godMode;

  return (
    <div className="flex items-center gap-4">
      {/* Basic Navigation Controls */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.back()}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go back</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="h-8 w-8"
              >
                <Home className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Home</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.history.forward()}
                className="h-8 w-8"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Go forward</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Admin Navigation Menu */}
      {isGodModeAdmin && (
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Admin Tools</NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="grid gap-3 p-4 w-[400px]">
                  <li className="row-span-3">
                    <NavigationMenuLink asChild>
                      <a
                        className={cn(
                          "flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md",
                          navigationMenuTriggerStyle()
                        )}
                        onClick={() => navigate("/admin")}
                      >
                        <Settings className="h-6 w-6 mb-2" />
                        <div className="mb-2 text-lg font-medium">
                          Admin Dashboard
                        </div>
                        <p className="text-sm leading-tight text-muted-foreground">
                          Access system monitoring and administration tools
                        </p>
                      </a>
                    </NavigationMenuLink>
                  </li>
                  <li>
                    <NavigationMenuLink asChild>
                      <a
                        className={cn(
                          "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                          navigationMenuTriggerStyle()
                        )}
                        onClick={() => navigate("/admin/subscription-manager")}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <div className="text-sm font-medium leading-none">Subscription Manager</div>
                        </div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Manage subscription plans and feature access
                        </p>
                      </a>
                    </NavigationMenuLink>
                  </li>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      )}
    </div>
  );
}