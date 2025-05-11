import React from "react";
import { useLocation } from "wouter";
import { StyledIcon } from "./styled-icon";
import { ArrowLeft, ArrowRight, Home } from "lucide-react";
import { useUser } from "@/hooks/use-user";
import { iconStyles } from "@/lib/layout-utils";

export function StyledNavigation() {
  const [, navigate] = useLocation();
  const { user } = useUser();

  // Use a darker border for contrast in light mode
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: '#000000',
    borderRadius: '5px',
    border: '1px solid #007BFF',
  };
  
  // High-contrast style for each navigation button
  const navButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px',
    borderRadius: '4px',
    backgroundColor: '#F9FAFB',
    border: '1px solid #007BFF',
    cursor: 'pointer',
    marginRight: '5px',
  };

  return (
    <div style={containerStyle}>
      <div 
        style={navButtonStyle}
        onClick={() => window.history.back()}
        title="Go back"
      >
        <StyledIcon icon={ArrowLeft} size="1.25rem" />
      </div>
      
      <div 
        style={navButtonStyle}
        onClick={() => navigate("/")}
        title="Home"
      >
        <StyledIcon icon={Home} size="1.25rem" />
      </div>
      
      <div 
        style={navButtonStyle}
        onClick={() => window.history.forward()}
        title="Go forward"
      >
        <StyledIcon icon={ArrowRight} size="1.25rem" />
      </div>
      
      {user && (
        <div style={{ 
          marginLeft: '10px', 
          color: '#FFFFFF', 
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          padding: '5px 10px',
          backgroundColor: '#007BFF',
          borderRadius: '4px'
        }}>
          {user.username}
        </div>
      )}
    </div>
  );
}