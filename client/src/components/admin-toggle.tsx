import { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AdminToggle() {
  const { user, isLoading } = useUser();
  const [godMode, setGodMode] = useState(false);

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => setGodMode(!godMode)}
            className="fixed bottom-4 right-4"
            variant="default"
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
