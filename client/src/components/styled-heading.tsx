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
  
  const headingStyle = {
    ...levelStyle,
    color: customColor || levelStyle.color,
  };

  const HeadingTag = level as keyof JSX.IntrinsicElements;

  return (
    <HeadingTag style={headingStyle}>
      {children}
    </HeadingTag>
  );
}