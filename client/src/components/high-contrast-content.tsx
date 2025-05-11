import React from "react";
import { textStyles } from "@/lib/layout-utils";

interface HighContrastContentProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export function HighContrastContent({ children, isDark = true }: HighContrastContentProps) {
  // We'll use a className instead of inline styles for theme support
  const contentStyles = {
    container: {
      border: '2px solid #007BFF',
      borderRadius: '6px',
      padding: '20px',
      width: '100%'
    },
    content: {
      fontSize: textStyles.explanatory.fontSize,
      fontWeight: textStyles.explanatory.fontWeight as any,
      fontFamily: textStyles.explanatory.fontFamily,
      lineHeight: textStyles.explanatory.lineHeight,
      letterSpacing: '0.5px'
    }
  };

  return (
    <div style={contentStyles.container} className="high-contrast-container">
      <div style={contentStyles.content} className="high-contrast-content">
        {children}
      </div>
    </div>
  );
}