import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function HighContrastThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isDark, setIsDark] = React.useState(theme === "dark");
  
  // This ensures the component updates when theme changes from elsewhere
  React.useEffect(() => {
    setIsDark(theme === "dark");
  }, [theme]);
  
  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
    setIsDark(!isDark);
    
    // Log the theme change for debugging
    console.log("Theme toggled to:", newTheme);
    
    // Force a custom class on the root element for our custom styling
    document.documentElement.classList.toggle("custom-dark-mode", !isDark);
    document.documentElement.classList.toggle("custom-light-mode", isDark);
  };

  const getButtonStyle = () => {
    // Different styles for light and dark modes
    if (isDark) {
      return {
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
    } else {
      return {
        backgroundColor: '#2F2F2F',
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
    }
  };
  
  // Get the current button style based on the current theme
  const buttonStyle = getButtonStyle();

  return (
    <button
      onClick={toggleTheme}
      style={buttonStyle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <Sun color="#007BFF" size={20} />
      ) : (
        <Moon color="#FFFFFF" size={20} />
      )}
    </button>
  );
}