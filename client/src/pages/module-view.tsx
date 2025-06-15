import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Grid3X3, 
  Settings, 
  Edit3, 
  Save, 
  ArrowLeft,
  Package
} from "lucide-react";

interface ModuleViewProps {
  moduleId?: string;
}

export default function ModuleView({ moduleId }: ModuleViewProps) {
  const params = useParams();
  const [, navigate] = useLocation();
  const id = moduleId || params.id;
  const [isEditing, setIsEditing] = useState(false);
  const [moduleName, setModuleName] = useState(`Module ${id}`);
  const [moduleDescription, setModuleDescription] = useState(`This is Module ${id}. Configure and customize this module according to your specific requirements and business logic.`);

  const handleSave = () => {
    setIsEditing(false);
    // Here you would typically save to a backend or local storage
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center space-x-2">
            <Grid3X3 className="h-6 w-6 text-primary" />
            {isEditing ? (
              <Input
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="text-2xl font-bold border-none p-0 h-auto focus-visible:ring-0"
              />
            ) : (
              <h1 className="text-2xl font-bold">{moduleName}</h1>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">Active</Badge>
          {isEditing ? (
            <Button onClick={handleSave} size="sm">
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Module Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Module Information
          </CardTitle>
          <CardDescription>
            Configure the basic settings and description for this module
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="module-name">Module Name</Label>
            {isEditing ? (
              <Input
                id="module-name"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                placeholder="Enter module name"
              />
            ) : (
              <div className="p-2 bg-muted rounded-md">{moduleName}</div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="module-description">Description</Label>
            {isEditing ? (
              <Textarea
                id="module-description"
                value={moduleDescription}
                onChange={(e) => setModuleDescription(e.target.value)}
                placeholder="Describe what this module does"
                rows={3}
              />
            ) : (
              <div className="p-2 bg-muted rounded-md">{moduleDescription}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Module Content Area */}
      <Card>
        <CardHeader>
          <CardTitle>Module Content</CardTitle>
          <CardDescription>
            This is where your module functionality will be implemented
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center">
            <Grid3X3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Module Content Area</h3>
            <p className="text-muted-foreground mb-4">
              This module is ready for development. Add your components, logic, and functionality here.
            </p>
            <Button variant="outline">
              Start Building
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module Stats/Config */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Ready</div>
            <p className="text-xs text-muted-foreground">
              Module is configured and ready for development
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Version</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.0.0</div>
            <p className="text-xs text-muted-foreground">
              Current module version
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Type</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Standard</div>
            <p className="text-xs text-muted-foreground">
              Module configuration type
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}