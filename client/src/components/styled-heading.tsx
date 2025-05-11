import React from "react";
import { textStyles } from "@/lib/layout-utils";

type HeadingLevel = 'h1' | 'h2' | 'h3';

interface StyledHeadingProps {
  children: React.ReactNode;
  level: HeadingLevel;
  customColor?: string;
}

export function StyledHeading({ children, level, customColor }: StyledHeadingProps) {
  const levelStyle = textStyles.heading[level];
  
  // Remove color from inline style to allow our theme toggle to work
  const headingStyle = {
    ...levelStyle,
    // No color here - will be handled by CSS
  };

  const HeadingTag = level as keyof JSX.IntrinsicElements;

  return (
    <HeadingTag style={headingStyle} className="styled-heading">
      {children}
    </HeadingTag>
  );
}