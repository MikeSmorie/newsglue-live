import React, { useState } from "react";
import { useLocation } from "wouter";
import { StyledIcon } from "./styled-icon";
import { Box, Layers, BookOpen, Code, Settings, BarChart, Users, Database, FileText, Zap } from "lucide-react";

interface HighContrastModuleProps {
  id: number;
  name: string;
}

export function HighContrastModule({ id, name }: HighContrastModuleProps) {
  const [, setLocation] = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  
  // Get an appropriate icon based on module ID
  const getModuleIcon = (moduleId: number) => {
    const iconMap: Record<number, any> = {
      1: Box,
      2: Layers,
      3: BookOpen,
      4: Code,
      5: Settings,
      6: BarChart,
      7: Users,
      8: Database,
      9: FileText,
      10: Zap
    };
    
    return iconMap[moduleId] || Box;
  };
  
  const Icon = getModuleIcon(id);
  
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
      maxWidth: '300px',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      boxShadow: isHovered ? '0 4px 8px rgba(0, 123, 255, 0.3)' : 'none'
    },
    text: {
      color: '#FFFFFF',
      fontSize: '16px',
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      letterSpacing: '0.5px',
      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
      marginLeft: '12px'
    }
  };

  return (
    <div 
      style={moduleStyles.container}
      onClick={() => setLocation(`/module/${id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <StyledIcon icon={Icon} size="1.5rem" customColor="#007BFF" />
      <span style={moduleStyles.text}>{name}</span>
    </div>
  );
}