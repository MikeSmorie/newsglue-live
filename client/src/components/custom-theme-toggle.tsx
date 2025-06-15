import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function CustomThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <Button 
      variant="outline" 
      size="icon" 
      onClick={toggleTheme} 
      className="h-8 w-8 nav-button"
    >
      {isDark ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}