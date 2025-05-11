import React, { useState } from "react";
import { iconStyles } from "@/lib/layout-utils";
import { LucideIcon } from "lucide-react";

interface StyledIconProps {
  icon: LucideIcon;
  onClick?: () => void;
  label?: string;
  isButton?: boolean;
  size?: string;
  customColor?: string;
}

export function StyledIcon({ 
  icon: Icon, 
  onClick, 
  label,
  isButton = false,
  size,
  customColor
}: StyledIconProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const iconStyle = {
    color: customColor || iconStyles.icon.color,
    fontSize: size || iconStyles.icon.size,
    marginRight: label ? iconStyles.icon.marginRight : '0',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  
  const buttonStyle = isButton ? {
    backgroundColor: isHovered ? iconStyles.iconButton.hover.backgroundColor : iconStyles.iconButton.backgroundColor,
    padding: iconStyles.iconButton.padding,
    borderRadius: iconStyles.iconButton.borderRadius,
    border: iconStyles.iconButton.border,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease'
  } : {};

  const containerStyle = {
    ...iconStyle,
    ...buttonStyle,
  };

  return (
    <div 
      style={containerStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Icon size={size || "2rem"} />
      {label && <span style={{ marginLeft: '0.5rem' }}>{label}</span>}
    </div>
  );
}