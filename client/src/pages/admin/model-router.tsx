import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { GripVertical, TestTube, Save, RefreshCw, Brain, Settings2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  status: 'online' | 'offline' | 'stub';
  priority: number;
  fallbackEnabled: boolean;
  hasApiKey: boolean;
  models: string[];
}

interface RoutingConfig {
  models: ModelConfig[];
  globalFallback: boolean;
  lastUpdated: string;
}

export default function ModelRouterPage() {
  const { user, isLoading: userLoading } = useUser();
  const [, setLocation] = useLocation();
  const [config, setConfig] = useState<RoutingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const { toast } = useToast();

  // Redirect if not supergod
  if (!userLoading && (!user || user.role !== "supergod")) {
    setLocation("/dashboard");
    return null;
  }

  useEffect(() => {
    if (user?.role === "supergod") {
      loadRoutingConfig();
    }
  }, [user]);

  const loadRoutingConfig = async () => {
    try {
      setLoading(true);
      
      // Load provider statuses
      const statusResponse = await fetch('/api/ai/providers/status');
      const providers = await statusResponse.json();
      
      // Load saved routing config (fallback to default if not exists)
      let savedConfig: any = null;
      try {
        const configResponse = await fetch('/api/admin/ai-routing/config');
        if (configResponse.ok) {
          savedConfig = await configResponse.json();
        }
      } catch (error) {
        console.log('No saved config found, using defaults');
      }
      
      // Create model configs from providers
      const defaultPriority = ['claude', 'openai', 'mistral'];
      const models: ModelConfig[] = providers.map((provider: any, index: number) => {
        const savedModel = savedConfig?.models?.find((m: any) => m.provider === provider.name);
        const priorityIndex = defaultPriority.indexOf(provider.name);
        
        return {
          id: provider.name,
          name: provider.name.charAt(0).toUpperCase() + provider.name.slice(1),
          provider: provider.name,
          status: provider.hasApiKey ? 'online' : 'stub',
          priority: savedModel?.priority ?? (priorityIndex >= 0 ? priorityIndex + 1 : index + 1),
          fallbackEnabled: savedModel?.fallbackEnabled ?? true,
          hasApiKey: provider.hasApiKey,
          models: provider.models
        };
      }).sort((a: ModelConfig, b: ModelConfig) => a.priority - b.priority);
      
      setConfig({
        models,
        globalFallback: savedConfig?.globalFallback ?? true,
        lastUpdated: savedConfig?.lastUpdated ?? new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to load routing config:', error);
      toast({
        title: "Error",
        description: "Failed to load routing configuration",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination || !config) return;

    const newModels = Array.from(config.models);
    const [reorderedItem] = newModels.splice(result.source.index, 1);
    newModels.splice(result.destination.index, 0, reorderedItem);

    // Update priorities
    const updatedModels = newModels.map((model, index) => ({
      ...model,
      priority: index + 1
    }));

    setConfig({
      ...config,
      models: updatedModels
    });
  };

  const toggleFallback = (modelId: string) => {
    if (!config) return;

    const updatedModels = config.models.map(model =>
      model.id === modelId
        ? { ...model, fallbackEnabled: !model.fallbackEnabled }
        : model
    );

    setConfig({
      ...config,
      models: updatedModels
    });
  };

  const testProvider = async (provider: string) => {
    setTesting(provider);
    try {
      const response = await fetch(`/api/ai/providers/test/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Test connection' })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Test Successful",
          description: `${provider} responded successfully (${result.tokensUsed} tokens)`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.error || `${provider} test failed`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Test Error",
        description: `Failed to test ${provider}`,
        variant: "destructive"
      });
    } finally {
      setTesting(null);
    }
  };

  const saveConfig = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const response = await fetch('/api/admin/ai-routing/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config,
          lastUpdated: new Date().toISOString()
        })
      });

      if (response.ok) {
        toast({
          title: "Configuration Saved",
          description: "AI routing preferences have been updated"
        });
        setConfig(prev => prev ? { ...prev, lastUpdated: new Date().toISOString() } : null);
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save routing configuration",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return <Badge variant="default" className="bg-green-500">Online</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      case 'stub':
        return <Badge variant="outline" className="text-orange-500 border-orange-500">Stub</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (userLoading || loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 animate-pulse" />
          <div>
            <h1 className="text-3xl font-bold">AI Model Routing</h1>
            <p className="text-muted-foreground">Loading configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-muted-foreground">Failed to load routing configuration</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">AI Model Routing</h1>
            <p className="text-muted-foreground">
              Configure provider priority and fallback settings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={loadRoutingConfig} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={saveConfig} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Provider Priority & Fallback Configuration
          </CardTitle>
          <CardDescription>
            Drag to reorder priority. Higher priority providers are tried first.
            Last updated: {new Date(config.lastUpdated).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="models">
              {(provided: any) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Model Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead>Fallback</TableHead>
                        <TableHead>Models</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config.models.map((model, index) => (
                        <Draggable key={model.id} draggableId={model.id} index={index}>
                          {(provided: any, snapshot: any) => (
                            <TableRow
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={snapshot.isDragging ? "bg-muted" : ""}
                            >
                              <TableCell {...provided.dragHandleProps} className="cursor-grab">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{model.priority}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{model.name}</TableCell>
                              <TableCell>{getStatusBadge(model.status)}</TableCell>
                              <TableCell>
                                {model.hasApiKey ? (
                                  <Badge variant="default" className="bg-green-500">Yes</Badge>
                                ) : (
                                  <Badge variant="outline">No</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    checked={model.fallbackEnabled}
                                    onCheckedChange={() => toggleFallback(model.id)}
                                  />
                                  <Label className="text-sm">
                                    {model.fallbackEnabled ? 'Enabled' : 'Disabled'}
                                  </Label>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {model.models.slice(0, 2).map((modelName) => (
                                    <Badge key={modelName} variant="outline" className="text-xs">
                                      {modelName}
                                    </Badge>
                                  ))}
                                  {model.models.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{model.models.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => testProvider(model.provider)}
                                  disabled={testing === model.provider}
                                >
                                  <TestTube className="h-3 w-3 mr-1" />
                                  {testing === model.provider ? 'Testing...' : 'Test'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
          <CardDescription>
            System-wide fallback and routing configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="global-fallback" className="text-sm font-medium">
                Global Fallback Mode
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, requests will automatically fall back to the next available provider if the primary fails
              </p>
            </div>
            <Switch
              id="global-fallback"
              checked={config.globalFallback}
              onCheckedChange={(checked) => 
                setConfig(prev => prev ? { ...prev, globalFallback: checked } : null)
              }
            />
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Routing Logic</Label>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Providers are tried in priority order (1 = highest priority)</p>
              <p>• If fallback is disabled for a provider, failures will not cascade</p>
              <p>• Stub providers return test responses when API keys are not configured</p>
              <p>• Configuration changes take effect immediately for new requests</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}