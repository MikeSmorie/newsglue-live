import React from "react";
import { textStyles } from "@/lib/layout-utils";

interface ExplanatoryTextProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export function ExplanatoryText({ children, isDark = false }: ExplanatoryTextProps) {
  // Add a special class for our theme toggle
  const className = "explanatory-text";
  
  const textStyle = {
    ...textStyles.explanatory,
    // No inline color styling to allow CSS to handle it
  };

  return (
    <p style={textStyle} className={className}>
      {children}
    </p>
  );
}