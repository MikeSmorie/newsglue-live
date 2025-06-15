import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FontSizeControls } from "@/components/font-size-controls";
import { CustomThemeToggle } from "@/components/custom-theme-toggle";
import { 
  ArrowLeft, 
  ArrowRight, 
  Home, 
  LogOut,
  Crown,
  Shield,
  User
} from "lucide-react";

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
  const [, navigate] = useLocation();
  const { user, logout } = useUser();
  const { toast } = useToast();

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
    <nav className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="container flex h-16 items-center px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="h-8 w-8 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-8 w-8 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Home className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.forward()}
            className="h-8 w-8 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-4 ml-auto">
          {user && (
            <>
              <span className="font-bold text-gray-900 dark:text-white">
                {user.username || "User1#*User1$"}
              </span>
              
              <Badge variant={getRoleVariant(user.role)} className="flex items-center gap-1">
                {getRoleIcon(user.role)}
                {user.role}
              </Badge>
              
              {user.role === "supergod" && (
                <span className="text-sm font-bold text-red-500 dark:text-red-400">
                  👑 Super-God Mode Active
                </span>
              )}
            </>
          )}
          
          <FontSizeControls />
          <CustomThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="h-8 w-8 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}