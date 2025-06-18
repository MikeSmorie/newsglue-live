import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Grid3X3, 
  ArrowLeft,
  Package,
  Lock
} from "lucide-react";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Dynamic module imports
const modules = {
  1: lazy(() => import("../../../modules/module1")),
  2: lazy(() => import("../../../modules/module2")),
  3: lazy(() => import("../../../modules/module3")),
  4: lazy(() => import("../../../modules/module4")),
  5: lazy(() => import("../../../modules/module5")),
  6: lazy(() => import("../../../modules/module6")),
  7: lazy(() => import("../../../modules/module7")),
  8: lazy(() => import("../../../modules/module8")),
  9: lazy(() => import("../../../modules/module9")),
  10: lazy(() => import("../../../modules/module10")),
};

interface ModuleViewProps {
  moduleId?: string;
}

export default function ModuleView({ moduleId }: ModuleViewProps) {
  const params = useParams();
  const [, navigate] = useLocation();
  const id = moduleId || params.id;
  const moduleNumber = parseInt(id || '0');
  
  // Check if module exists and load it
  const ModuleComponent = modules[moduleNumber as keyof typeof modules];
  
  if (ModuleComponent) {
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
              <Grid3X3 className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Module #{id}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="default" className="bg-green-600 hover:bg-green-700">
              Active
            </Badge>
          </div>
        </div>

        {/* Module Content */}
        <Suspense fallback={
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-border" />
          </div>
        }>
          <ModuleComponent />
        </Suspense>
      </div>
    );
  }

  // Fallback for non-existent modules
  const moduleName = `Module ${id}`;
  const displayName = moduleName || "Unnamed Module";

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
            <Grid3X3 className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Module #{id}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600">
            Inactive
          </Badge>
        </div>
      </div>

      {/* Subheading */}
      <div>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          This module is currently inactive.
        </p>
      </div>

      {/* Body Text */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Package className="h-5 w-5" />
            Module Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 text-gray-700 dark:text-gray-300 italic">
            "Modules are sealed functional containers assigned by the system developer. This space is reserved for application logic, tools, or features to be added in future phases. Users cannot build or modify modules directly."
          </blockquote>
        </CardContent>
      </Card>

      {/* Module Content Area (Reserved) */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Lock className="h-5 w-5" />
            Module Content Area (Reserved)
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            This space is reserved for system developer assignment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center bg-gray-50 dark:bg-gray-900">
            <Grid3X3 className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              {displayName}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This module container is awaiting developer assignment.<br />
              Functional components will be activated by the system administrator.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Lock className="h-4 w-4" />
              <span>Read-Only Access</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}