import { useState } from "react";
import { useParams } from "wouter";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import "../styles/high-contrast-modules.css";

interface ModuleViewProps {
  moduleId?: string;
}

export default function ModuleView({ moduleId }: ModuleViewProps) {
  const params = useParams();
  const id = moduleId || params.id;
  const [moduleName, setModuleName] = useState(`Module ${id}`);

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Input
            value={moduleName}
            onChange={(e) => setModuleName(e.target.value)}
            className="max-w-xs"
            placeholder="Enter module name"
          />
        </div>

        <div className="high-contrast-module" style={{ cursor: 'default' }}>
          <div className="high-contrast-module__indicator"></div>
          <div className="high-contrast-module__text">
            Module {id} View - {moduleName} (Add functions here when forking)
          </div>
        </div>
      </div>
    </div>
  );
}