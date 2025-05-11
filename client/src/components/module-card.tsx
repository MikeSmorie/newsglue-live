import React from "react";
import { useLocation } from "wouter";

interface ModuleCardProps {
  id: number;
  name: string;
}

export function ModuleCard({ id, name }: ModuleCardProps) {
  const [, setLocation] = useLocation();
  
  return (
    <div 
      className="mb-2 rounded-lg border border-blue-500 bg-black hover:bg-gray-900 cursor-pointer transition-colors"
      onClick={() => setLocation(`/module/${id}`)}
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <div className="p-4 w-full" style={{ display: 'flex', alignItems: 'center' }}>
        <div 
          className="w-4 h-4 rounded-full mr-3" 
          style={{ backgroundColor: '#007BFF', flexShrink: 0 }}
        ></div>
        <span 
          className="text-lg font-bold" 
          style={{ 
            color: '#FFFFFF',
            textShadow: '0 0 2px rgba(0,0,0,0.8)'
          }}
        >
          {name}
        </span>
      </div>
    </div>
  );
}