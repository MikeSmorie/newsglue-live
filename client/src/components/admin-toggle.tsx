import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdmin } from "@/contexts/admin-context";

export function AdminToggle() {
  const { user, isLoading } = useUser();
  const { godMode, setGodMode } = useAdmin();

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  if (user?.role !== "admin" && user?.role !== "supergod") {
    return null;
  }
  
  // Log current user role for debugging
  console.log("[DEBUG] Current user role:", user.role);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setGodMode(!godMode)}
            className="fixed bottom-4 right-4"
            variant={godMode ? "destructive" : "default"}
            size="lg"
          >
            {godMode ? "Exit God Mode" : "Enter God Mode"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle administrator privileges</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}