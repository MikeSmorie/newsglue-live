import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="border-blue-600 h-8 w-8"
        >
          {theme === "dark" ? (
            <Moon className="h-[1.2rem] w-[1.2rem] text-white" />
          ) : (
            <Sun className="h-[1.2rem] w-[1.2rem] text-[#007BFF]" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-[#121212] border-blue-600">
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="text-white hover:bg-blue-900"
        >
          <Sun className="mr-2 h-4 w-4 text-[#007BFF]" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="text-white hover:bg-blue-900"
        >
          <Moon className="mr-2 h-4 w-4 text-white" />
          <span>Dark</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
