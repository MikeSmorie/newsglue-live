import React from "react";
import { textStyles } from "@/lib/layout-utils";

interface ExplanatoryTextProps {
  children: React.ReactNode;
  isDark?: boolean;
}

export function ExplanatoryText({ children, isDark = false }: ExplanatoryTextProps) {
  const textStyle = {
    ...textStyles.explanatory,
    color: isDark ? '#FFFFFF' : textStyles.explanatory.color,
  };

  return (
    <p style={textStyle}>
      {children}
    </p>
  );
}