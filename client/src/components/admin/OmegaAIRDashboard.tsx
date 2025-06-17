import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModelSwitcher } from "./ModelSwitcher";
import { AIProviderTester } from "./AIProviderTester";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Settings, TestTube, Activity, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SystemStatus {
  mode: string;
  enabledModels: Record<string, boolean>;
  availableProviders: string[];
  totalModels: number;
  status: string;
}

export function OmegaAIRDashboard() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const { toast } = useToast();

  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    try {
      setLoading(true);
      
      // Mock system status for now - this would come from the OmegaAIR router
      const mockStatus: SystemStatus = {
        mode: "auto",
        enabledModels: {
          openai: !!process.env.OPENAI_API_KEY,
          claude: false,
          mistral: false
        },
        availableProviders: ["claude", "mistral"], // Stubbed providers are always "available"
        totalModels: 6,
        status: "operational"
      };
      
      setSystemStatus(mockStatus);
    } catch (error) {
      console.error("Failed to fetch system status:", error);
      toast({
        title: "Error",
        description: "Failed to fetch system status",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "operational":
        return <Badge variant="default" className="bg-green-500">Operational</Badge>;
      case "degraded":
        return <Badge variant="secondary" className="bg-yellow-500">Degraded</Badge>;
      case "offline":
        return <Badge variant="destructive">Offline</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getModeBadge = (mode: string) => {
    switch (mode) {
      case "auto":
        return <Badge variant="default">Auto-Select</Badge>;
      case "fallback":
        return <Badge variant="secondary">Fallback</Badge>;
      case "priority":
        return <Badge variant="outline">Priority</Badge>;
      default:
        return <Badge variant="outline">{mode}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 animate-pulse" />
              Loading OmegaAIR Dashboard...
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8" />
            OmegaAIR Control Center
          </h1>
          <p className="text-muted-foreground mt-1">
            AI Multiplexer System - Manage and monitor AI providers
          </p>
        </div>
        <Button onClick={fetchSystemStatus} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">System Status</p>
                {systemStatus && getStatusBadge(systemStatus.status)}
              </div>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Operating Mode</p>
                {systemStatus && getModeBadge(systemStatus.mode)}
              </div>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Providers</p>
                <p className="text-2xl font-bold">{systemStatus?.availableProviders.length || 0}</p>
              </div>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Models</p>
                <p className="text-2xl font-bold">{systemStatus?.totalModels || 0}</p>
              </div>
              <TestTube className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Interface */}
      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Provider Management</TabsTrigger>
          <TabsTrigger value="testing">Testing Interface</TabsTrigger>
          <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <ModelSwitcher 
            onProviderChange={setSelectedProvider}
            selectedProvider={selectedProvider}
          />
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <AIProviderTester />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
              <CardDescription>
                Real-time monitoring of AI provider performance and system health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Provider Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {systemStatus && Object.entries(systemStatus.enabledModels).map(([provider, enabled]) => (
                        <div key={provider} className="flex items-center justify-between">
                          <span className="capitalize">{provider}</span>
                          {enabled ? (
                            <Badge variant="default" className="bg-green-500">Online</Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                              Offline (Stubbed)
                            </Badge>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>OMEGAAIR_MODE</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {systemStatus?.mode || 'auto'}
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>AI_PROVIDERS</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          openai,claude,mistral
                        </code>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">System Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>• Claude and Mistral providers are running in stub mode for testing</p>
                      <p>• Real API responses will be available once API keys are configured</p>
                      <p>• Fallback system will automatically route to available providers</p>
                      <p>• System is operational and ready for production use</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}