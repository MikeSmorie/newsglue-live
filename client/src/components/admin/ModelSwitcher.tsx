import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Brain, Zap, Sparkles } from "lucide-react";

interface ProviderStatus {
  name: string;
  isOnline: boolean;
  hasApiKey: boolean;
  models: string[];
}

interface ModelSwitcherProps {
  onProviderChange?: (provider: string) => void;
  selectedProvider?: string;
}

export function ModelSwitcher({ onProviderChange, selectedProvider = 'openai' }: ModelSwitcherProps) {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeProvider, setActiveProvider] = useState(selectedProvider);

  useEffect(() => {
    fetchProviderStatuses();
  }, []);

  const fetchProviderStatuses = async () => {
    try {
      const response = await fetch('/api/ai/providers/status');
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      } else {
        // Fallback to hardcoded statuses if API not available
        setProviders([
          {
            name: 'openai',
            isOnline: true,
            hasApiKey: true,
            models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo']
          },
          {
            name: 'claude',
            isOnline: false,
            hasApiKey: false,
            models: ['claude-3-5-sonnet', 'claude-3-haiku']
          },
          {
            name: 'mistral',
            isOnline: false,
            hasApiKey: false,
            models: ['mistral-large', 'mistral-medium']
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch provider statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderToggle = (providerName: string) => {
    setActiveProvider(providerName);
    onProviderChange?.(providerName);
  };

  const getProviderIcon = (providerName: string) => {
    switch (providerName) {
      case 'openai':
        return <Zap className="h-4 w-4" />;
      case 'claude':
        return <Brain className="h-4 w-4" />;
      case 'mistral':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Brain className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (provider: ProviderStatus) => {
    if (provider.isOnline && provider.hasApiKey) {
      return <Badge variant="default" className="bg-green-500">Online</Badge>;
    } else if (provider.hasApiKey && !provider.isOnline) {
      return <Badge variant="secondary">Configured</Badge>;
    } else if (!provider.hasApiKey) {
      return <Badge variant="outline" className="text-orange-500 border-orange-500">Offline</Badge>;
    }
    return <Badge variant="destructive">Error</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Model Switcher</CardTitle>
          <CardDescription>Loading provider statuses...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Model Switcher
        </CardTitle>
        <CardDescription>
          Select the AI provider for system operations. Offline providers show stubbed responses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {providers.map((provider, index) => (
          <div key={provider.name}>
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-3">
                {getProviderIcon(provider.name)}
                <div>
                  <Label htmlFor={`provider-${provider.name}`} className="text-sm font-medium">
                    {provider.name.charAt(0).toUpperCase() + provider.name.slice(1)}
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(provider)}
                    <span className="text-xs text-muted-foreground">
                      {provider.models.length} model{provider.models.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id={`provider-${provider.name}`}
                  checked={activeProvider === provider.name}
                  onCheckedChange={() => handleProviderToggle(provider.name)}
                />
              </div>
            </div>
            
            {activeProvider === provider.name && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Available Models:</p>
                <div className="flex flex-wrap gap-2">
                  {provider.models.map((model) => (
                    <Badge key={model} variant="outline" className="text-xs">
                      {model}
                    </Badge>
                  ))}
                </div>
                {!provider.isOnline && (
                  <p className="text-xs text-muted-foreground mt-2">
                    This provider is offline and will return stubbed responses for testing.
                  </p>
                )}
              </div>
            )}
            
            {index < providers.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Active Provider:</span>
            <Badge variant="default">
              {activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}