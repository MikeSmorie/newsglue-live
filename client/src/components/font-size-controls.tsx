import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function FontSizeControls() {
  const [fontSize, setFontSize] = useState(16);

  const adjustFontSize = (change: number) => {
    const newSize = fontSize + change;
    if (newSize >= 12 && newSize <= 24) {
      setFontSize(newSize);
      document.documentElement.style.fontSize = `${newSize}px`;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustFontSize(-1)}
              className="h-8 w-8 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Minus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Decrease font size</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => adjustFontSize(1)}
              className="h-8 w-8 text-foreground hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Increase font size</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
