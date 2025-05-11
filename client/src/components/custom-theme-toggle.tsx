import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function CustomThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize theme on mount
  useEffect(() => {
    // Default to dark mode
    document.body.classList.add('dark-mode');
  }, []);

  const toggleTheme = () => {
    const body = document.body;
    if (body.classList.contains('dark-mode')) {
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
      setIsDarkMode(false);
    } else {
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
      setIsDarkMode(true);
    }
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme} className="border-blue-600 nav-button theme-toggle">
      {isDarkMode ? (
        <Moon className="h-[1.2rem] w-[1.2rem] text-white" />
      ) : (
        <Sun className="h-[1.2rem] w-[1.2rem] text-blue-600" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}