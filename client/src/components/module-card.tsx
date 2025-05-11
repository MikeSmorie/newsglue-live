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
      className="mb-2 rounded-lg border border-gray-600 bg-gray-800 hover:bg-gray-700 cursor-pointer transition-colors"
      onClick={() => setLocation(`/module/${id}`)}
    >
      <div className="p-4">
        <span className="text-lg font-medium text-white">{name}</span>
      </div>
    </div>
  );
}