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

// Module names mapping
const moduleNames = {
  "1": "1 Campaign Builder",
  "2": "2 Social Channels", 
  "3": "3 User Inputted News",
  "4": "4 News Search",
  "5": "5 Google Keyword",
  "6": "6 Execution Module",
  "7": "7 Proposal Builder",
  "8": "8 Metrics Tracker",
  "9": "9 AI Discoverability",
  "10": "10 AI Intelligence",
  "omega-10": "10 AI Intelligence"
};

interface ModuleViewProps {
  moduleId?: string;
}

export default function ModuleView({ moduleId }: ModuleViewProps) {
  const params = useParams();
  const [, navigate] = useLocation();
  const id = moduleId || params.id;
  const moduleNumber = parseInt(id || '0');
  
  const displayName = moduleNames[id as keyof typeof moduleNames] || `Module ${id}`;
  
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
                {displayName}
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
              {displayName}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-gray-500">
            Coming Soon
          </Badge>
        </div>
      </div>

      {/* Module Placeholder Content */}
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Package className="h-8 w-8 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <CardTitle className="text-gray-900 dark:text-white">
            {displayName}
          </CardTitle>
          <CardDescription>
            This module is currently under development and will be available soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Module features and functionality are being built to enhance your workflow experience.
            </div>
            <Button variant="outline" disabled>
              <Lock className="h-4 w-4 mr-2" />
              Module Locked
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}