import React from "react";
import { textStyles } from "@/lib/layout-utils";

interface HighContrastContentProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export function HighContrastContent({ children, isDark = true }: HighContrastContentProps) {
  const contentStyles = {
    container: {
      backgroundColor: isDark ? '#000000' : '#FFFFFF',
      border: '2px solid #007BFF',
      borderRadius: '6px',
      padding: '20px',
      width: '100%'
    },
    content: {
      color: isDark ? '#FFFFFF' : textStyles.explanatory.color,
      fontSize: textStyles.explanatory.fontSize,
      fontWeight: textStyles.explanatory.fontWeight as any,
      fontFamily: textStyles.explanatory.fontFamily,
      lineHeight: textStyles.explanatory.lineHeight,
      letterSpacing: '0.5px'
    }
  };

  return (
    <div style={contentStyles.container}>
      <div style={contentStyles.content}>
        {children}
      </div>
    </div>
  );
}