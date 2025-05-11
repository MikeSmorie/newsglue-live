import React from "react";
import { useLocation } from "wouter";

interface HighContrastModuleProps {
  id: number;
  name: string;
}

export function HighContrastModule({ id, name }: HighContrastModuleProps) {
  const [, setLocation] = useLocation();
  
  const moduleStyles = {
    container: {
      display: 'flex',
      alignItems: 'center',
      backgroundColor: '#000000',
      border: '2px solid #007BFF',
      borderRadius: '6px',
      padding: '12px 16px',
      marginBottom: '10px',
      cursor: 'pointer',
      width: '100%',
      maxWidth: '300px'
    },
    indicator: {
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      backgroundColor: '#007BFF',
      marginRight: '12px',
      flexShrink: 0
    },
    text: {
      color: '#FFFFFF',
      fontSize: '16px',
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      letterSpacing: '0.5px',
      textShadow: '0 1px 2px rgba(0,0,0,0.8)'
    }
  };

  return (
    <div 
      style={moduleStyles.container}
      onClick={() => setLocation(`/module/${id}`)}
    >
      <div style={moduleStyles.indicator}></div>
      <span style={moduleStyles.text}>{name}</span>
    </div>
  );
}