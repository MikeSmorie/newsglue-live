import React from "react";
import { useLocation } from "wouter";
import "../styles/high-contrast-modules.css";

interface ModuleCardProps {
  id: number;
  name: string;
}

export function ModuleCard({ id, name }: ModuleCardProps) {
  const [, setLocation] = useLocation();
  
  return (
    <div 
      className="high-contrast-module"
      onClick={() => setLocation(`/module/${id}`)}
    >
      <div className="high-contrast-module__indicator"></div>
      <span className="high-contrast-module__text">{name}</span>
    </div>
  );
}