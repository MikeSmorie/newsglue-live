import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function HighContrastThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const isDark = theme === "dark";

  const buttonStyle = {
    backgroundColor: '#F9FAFB',
    border: '2px solid #007BFF',
    borderRadius: '5px',
    padding: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    width: '40px',
    height: '40px'
  };

  return (
    <button
      onClick={toggleTheme}
      style={buttonStyle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun color="#007BFF" size={20} />
      ) : (
        <Moon color="#007BFF" size={20} />
      )}
    </button>
  );
}