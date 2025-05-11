import React from "react";

interface HighContrastContentProps {
  children: React.ReactNode;
}

export function HighContrastContent({ children }: HighContrastContentProps) {
  const contentStyles = {
    container: {
      backgroundColor: '#000000',
      border: '2px solid #007BFF',
      borderRadius: '6px',
      padding: '20px',
      width: '100%'
    },
    content: {
      color: '#FFFFFF',
      fontSize: '16px',
      fontWeight: 'normal',
      fontFamily: 'Inter, sans-serif',
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