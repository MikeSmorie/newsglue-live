import { useState } from "react";
import { useParams } from "wouter";
import { Input } from "@/components/ui/input";
import { HighContrastModule } from "@/components/high-contrast-module";
import { HighContrastContent } from "@/components/high-contrast-content";

interface ModuleViewProps {
  moduleId?: string;
}

export default function ModuleView({ moduleId }: ModuleViewProps) {
  const params = useParams();
  const id = moduleId || params.id;
  const [moduleName, setModuleName] = useState(`Module ${id}`);

  // Custom styling for the input with high contrast
  const inputContainerStyle = {
    marginBottom: '20px'
  };

  const inputLabelStyle = {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: '8px'
  };

  return (
    <div className="container mx-auto py-6">
      <div style={inputContainerStyle}>
        <div style={inputLabelStyle}>Module Name:</div>
        <Input
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          className="max-w-xs"
          placeholder="Enter module name"
        />
      </div>

      <HighContrastContent>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ 
            width: '12px', 
            height: '12px', 
            borderRadius: '50%', 
            backgroundColor: '#007BFF', 
            marginRight: '12px' 
          }}></div>
          <span style={{ 
            color: '#FFFFFF', 
            fontSize: '18px', 
            fontWeight: 'bold' 
          }}>
            {moduleName}
          </span>
        </div>
        
        <p style={{ color: '#FFFFFF', marginTop: '16px' }}>
          This is Module {id}. Add your custom functionality here when forking this project.
        </p>
      </HighContrastContent>
    </div>
  );
}