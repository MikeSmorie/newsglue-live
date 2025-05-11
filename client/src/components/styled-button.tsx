import React, { useState } from "react";
import { iconStyles } from "@/lib/layout-utils";
import { StyledIcon } from "./styled-icon";
import { LucideIcon } from "lucide-react";

interface StyledButtonProps {
  icon?: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "outline";
  size?: "small" | "medium" | "large";
  customColor?: string;
}

export function StyledButton({
  icon,
  label,
  onClick,
  variant = "primary",
  size = "medium",
  customColor
}: StyledButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Size mapping
  const sizeMap = {
    small: { padding: "0.5rem 1rem", fontSize: "0.875rem" },
    medium: { padding: "0.75rem 1.5rem", fontSize: "1rem" },
    large: { padding: "1rem 2rem", fontSize: "1.125rem" }
  };
  
  // Variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: customColor || "#007BFF",
          color: "#FFFFFF",
          border: `2px solid ${customColor || "#007BFF"}`,
          hover: {
            backgroundColor: isHovered ? "#0056b3" : customColor || "#007BFF",
          }
        };
      case "secondary":
        return {
          backgroundColor: "#FFFFFF",
          color: customColor || "#007BFF",
          border: `2px solid ${customColor || "#007BFF"}`,
          hover: {
            backgroundColor: isHovered ? "#F0F0F0" : "#FFFFFF",
          }
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          color: customColor || "#007BFF",
          border: `2px solid ${customColor || "#007BFF"}`,
          hover: {
            backgroundColor: isHovered ? "rgba(0, 123, 255, 0.1)" : "transparent",
          }
        };
      default:
        return {
          backgroundColor: customColor || "#007BFF",
          color: "#FFFFFF",
          border: `2px solid ${customColor || "#007BFF"}`,
          hover: {
            backgroundColor: isHovered ? "#0056b3" : customColor || "#007BFF",
          }
        };
    }
  };
  
  const variantStyles = getVariantStyles();
  const sizeStyles = sizeMap[size];
  
  const buttonStyles = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: variantStyles.backgroundColor,
    color: variantStyles.color,
    border: variantStyles.border,
    borderRadius: "5px",
    padding: sizeStyles.padding,
    fontSize: sizeStyles.fontSize,
    fontFamily: "Inter, sans-serif",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: isHovered ? "0 4px 6px rgba(0, 0, 0, 0.1)" : "none",
    transform: isHovered ? "translateY(-1px)" : "translateY(0)"
  };
  
  return (
    <button
      style={buttonStyles}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon && <StyledIcon icon={icon} size={sizeStyles.fontSize} customColor={variantStyles.color} />}
      <span style={{ marginLeft: icon ? "0.5rem" : "0" }}>{label}</span>
    </button>
  );
}