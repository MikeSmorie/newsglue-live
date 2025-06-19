import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, Settings, Eye, EyeOff, Lock, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Campaign {
  id: string;
  campaignName: string;
  channels: Array<{ platform: string; enabled: boolean }>;
  socialSettings: {
    channelConfig?: Record<string, ChannelConfig>;
    thumbnailOrder?: Record<string, 'default' | 'reverse'>;
    apiEnabled?: boolean;
    apiCredentials?: Record<string, ApiCredentials>;
  };
}

interface ChannelConfig {
  tone: string;
  wordCount: number;
  contentRatio: string;
  enabled: boolean;
}

interface ApiCredentials {
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  tokenSecret?: string;
}

interface User {
  id: number;
  role: string;
}

const DEFAULT_PLATFORMS = [
  { id: 'twitter', name: 'Twitter/X', icon: '🐦' },
  { id: 'facebook', name: 'Facebook', icon: '📘' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'instagram', name: 'Instagram', icon: '📷' },
  { id: 'youtube', name: 'YouTube', icon: '🎥' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
  { id: 'blog', name: 'Blog', icon: '📝' }
];

const DEFAULT_CHANNEL_CONFIG: ChannelConfig = {
  tone: 'Professional',
  wordCount: 280,
  contentRatio: '70/30 (70% news, 30% campaign)',
  enabled: true
};

const TONE_OPTIONS = ['Professional', 'Casual', 'Authoritative', 'Friendly', 'Engaging', 'Educational'];
const CONTENT_RATIO_OPTIONS = [
  '70/30 (70% news, 30% campaign)',
  '60/40 (60% news, 40% campaign)',
  '80/20 (80% news, 20% campaign)',
  '50/50 (50% news, 50% campaign)'
];

export default function Module2() {
  const [activeTab, setActiveTab] = useState('channels');
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [channelConfigs, setChannelConfigs] = useState<Record<string, ChannelConfig>>({});
  const [thumbnailSettings, setThumbnailSettings] = useState<Record<string, 'default' | 'reverse'>>({});
  const [apiEnabled, setApiEnabled] = useState(false);
  const [apiCredentials, setApiCredentials] = useState<Record<string, ApiCredentials>>({});
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: user } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/user', { credentials: 'include' });
      if (!res.ok) throw new Error('Not authenticated');
      return res.json();
    }
  });

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    }
  });

  // Initialize with first campaign
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaign) {
      const campaign = campaigns[0];
      setSelectedCampaign(campaign);
      
      // Load existing settings
      const socialSettings = campaign.socialSettings || {};
      setChannelConfigs(socialSettings.channelConfig || {});
      setThumbnailSettings(socialSettings.thumbnailOrder || {});
      setApiEnabled(socialSettings.apiEnabled || false);
      setApiCredentials(socialSettings.apiCredentials || {});
      
      // Initialize default configs for active channels
      if (campaign.channels) {
        const newConfigs = { ...socialSettings.channelConfig || {} };
        campaign.channels.forEach(ch => {
          if (!newConfigs[ch.platform]) {
            const defaultConfig = { ...DEFAULT_CHANNEL_CONFIG };
            // Set appropriate default for Twitter character count
            if (ch.platform === 'twitter') {
              defaultConfig.wordCount = 280;
            }
            newConfigs[ch.platform] = defaultConfig;
          }
        });
        setChannelConfigs(newConfigs);
      }
    }
  }, [campaigns, selectedCampaign]);

  // Save social settings mutation
  const saveMutation = useMutation({
    mutationFn: async (settings: any) => {
      if (!selectedCampaign) throw new Error('No campaign selected');
      
      const res = await fetch(`/api/campaigns/${selectedCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: selectedCampaign.campaignName,
          social_settings: settings
        })
      });
      
      if (!res.ok) throw new Error('Failed to save settings');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Settings Saved',
        description: 'Social channel settings have been updated successfully.'
      });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
    onError: (error) => {
      toast({
        title: 'Save Failed',
        description: 'Failed to save social channel settings. Please try again.',
        variant: 'destructive'
      });
    }
  });

  const handleSaveChannelSettings = () => {
    const settings = {
      ...selectedCampaign?.socialSettings,
      channelConfig: channelConfigs
    };
    saveMutation.mutate(settings);
  };

  const handleSaveThumbnailSettings = () => {
    const settings = {
      ...selectedCampaign?.socialSettings,
      thumbnailOrder: thumbnailSettings
    };
    saveMutation.mutate(settings);
  };

  const handleSaveApiSettings = () => {
    const settings = {
      ...selectedCampaign?.socialSettings,
      apiEnabled,
      apiCredentials
    };
    saveMutation.mutate(settings);
  };

  const handleAddDefaultChannels = () => {
    const newConfigs = { ...channelConfigs };
    DEFAULT_PLATFORMS.forEach(platform => {
      if (!newConfigs[platform.id]) {
        const defaultConfig = { ...DEFAULT_CHANNEL_CONFIG };
        // Set appropriate default for Twitter character count
        if (platform.id === 'twitter') {
          defaultConfig.wordCount = 280;
        }
        newConfigs[platform.id] = defaultConfig;
      }
    });
    setChannelConfigs(newConfigs);
  };

  const handleRemoveChannel = (platformId: string) => {
    const newConfigs = { ...channelConfigs };
    delete newConfigs[platformId];
    setChannelConfigs(newConfigs);
  };

  const handleChannelConfigChange = (platformId: string, field: keyof ChannelConfig, value: any) => {
    setChannelConfigs(prev => ({
      ...prev,
      [platformId]: {
        ...prev[platformId],
        [field]: value
      }
    }));
  };

  const getActivePlatforms = () => {
    return Object.keys(channelConfigs).filter(platformId => channelConfigs[platformId]?.enabled);
  };

  const getPlatformInfo = (platformId: string) => {
    return DEFAULT_PLATFORMS.find(p => p.id === platformId) || { id: platformId, name: platformId, icon: '📱' };
  };

  const isAdmin = user?.role === 'god_mode';

  if (!selectedCampaign) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>2 Social Channels</CardTitle>
            <CardDescription>No campaigns available. Create a campaign first.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">2 Social Channels</h1>
          <p className="text-muted-foreground">Configure social media posting for {selectedCampaign.campaignName}</p>
        </div>
        
        {campaigns.length > 1 && (
          <Select
            value={selectedCampaign.id}
            onValueChange={(campaignId) => {
              const campaign = campaigns.find(c => c.id === campaignId);
              if (campaign) {
                setSelectedCampaign(campaign);
                const socialSettings = campaign.socialSettings || {};
                setChannelConfigs(socialSettings.channelConfig || {});
                setThumbnailSettings(socialSettings.thumbnailOrder || {});
                setApiEnabled(socialSettings.apiEnabled || false);
                setApiCredentials(socialSettings.apiCredentials || {});
              }
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map(campaign => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.campaignName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels">Newsjack Channels</TabsTrigger>
          <TabsTrigger value="thumbnails">Thumbnail Settings</TabsTrigger>
          <TabsTrigger value="api" disabled={!isAdmin}>
            Social Media API
            {!isAdmin && <Lock className="ml-2 h-3 w-3" />}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Newsjack Channels */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Channel Configuration
              </CardTitle>
              <CardDescription>
                Configure tone, word count, and content ratio for each social platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={handleAddDefaultChannels} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Default Channels
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Channel
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Channel</DialogTitle>
                      <DialogDescription>Select a platform to add to your campaign</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                      {DEFAULT_PLATFORMS.filter(p => !channelConfigs[p.id]).map(platform => (
                        <Button
                          key={platform.id}
                          variant="outline"
                          className="justify-start"
                          onClick={() => {
                            setChannelConfigs(prev => ({
                              ...prev,
                              [platform.id]: { ...DEFAULT_CHANNEL_CONFIG }
                            }));
                          }}
                        >
                          <span className="mr-2">{platform.icon}</span>
                          {platform.name}
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              <div className="space-y-4">
                {getActivePlatforms().map(platformId => {
                  const platform = getPlatformInfo(platformId);
                  const config = channelConfigs[platformId];
                  
                  return (
                    <Card key={platformId} className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{platform.icon}</span>
                            <div>
                              <CardTitle className="text-lg">{platform.name}</CardTitle>
                              <Badge variant={config.enabled ? "default" : "secondary"}>
                                {config.enabled ? "Active" : "Disabled"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={config.enabled}
                              onCheckedChange={(checked) => 
                                handleChannelConfigChange(platformId, 'enabled', checked)
                              }
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveChannel(platformId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {config.enabled && (
                        <CardContent className="pt-0 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Tone</Label>
                              <Select
                                value={config.tone}
                                onValueChange={(value) => 
                                  handleChannelConfigChange(platformId, 'tone', value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TONE_OPTIONS.map(tone => (
                                    <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label>
                                  {platformId === 'twitter' ? 'Character Count' : 'Word Count'}
                                </Label>
                                {platformId === 'twitter' && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Twitter standard max is 280 characters. Editable for premium-tier accounts.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
                              <Input
                                type="number"
                                value={config.wordCount}
                                onChange={(e) => 
                                  handleChannelConfigChange(platformId, 'wordCount', parseInt(e.target.value) || 0)
                                }
                                min="1"
                                max={platformId === 'twitter' ? "25000" : "5000"}
                                placeholder={platformId === 'twitter' ? "280" : undefined}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Content Ratio</Label>
                              <Select
                                value={config.contentRatio}
                                onValueChange={(value) => 
                                  handleChannelConfigChange(platformId, 'contentRatio', value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONTENT_RATIO_OPTIONS.map(ratio => (
                                    <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>

              {getActivePlatforms().length === 0 && (
                <Alert>
                  <AlertDescription>
                    No channels configured. Use "Add Default Channels" to get started.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveChannelSettings}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Channel Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Thumbnail Settings */}
        <TabsContent value="thumbnails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Thumbnail Settings
              </CardTitle>
              <CardDescription>
                Configure thumbnail display order for each platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Default:</strong> Thumbnail appears before text content<br />
                  <strong>Reverse:</strong> Thumbnail appears after text content
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {getActivePlatforms().map(platformId => {
                  const platform = getPlatformInfo(platformId);
                  
                  return (
                    <Card key={platformId} className="border-l-4 border-l-green-500">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{platform.icon}</span>
                            <div>
                              <h4 className="font-medium">{platform.name}</h4>
                              <p className="text-sm text-muted-foreground">Thumbnail placement</p>
                            </div>
                          </div>
                          
                          <RadioGroup
                            value={thumbnailSettings[platformId] || 'default'}
                            onValueChange={(value: 'default' | 'reverse') => 
                              setThumbnailSettings(prev => ({ ...prev, [platformId]: value }))
                            }
                            className="flex gap-6"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="default" id={`${platformId}-default`} />
                              <Label htmlFor={`${platformId}-default`}>Default (Recommended)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="reverse" id={`${platformId}-reverse`} />
                              <Label htmlFor={`${platformId}-reverse`}>Reverse</Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {getActivePlatforms().length === 0 && (
                <Alert>
                  <AlertDescription>
                    No active channels found. Configure channels in the "Newsjack Channels" tab first.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSaveThumbnailSettings}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Thumbnail Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Social Media API */}
        <TabsContent value="api" className="space-y-4">
          {isAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Social Media API
                </CardTitle>
                <CardDescription>
                  Configure API credentials for automated posting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={apiEnabled}
                    onCheckedChange={setApiEnabled}
                  />
                  <Label>Enable API Posting</Label>
                </div>

                {apiEnabled && (
                  <Tabs defaultValue="twitter" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="twitter">Twitter/X</TabsTrigger>
                      <TabsTrigger value="facebook">Facebook</TabsTrigger>
                      <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
                      <TabsTrigger value="instagram">Instagram</TabsTrigger>
                    </TabsList>

                    {['twitter', 'facebook', 'linkedin', 'instagram'].map(platform => (
                      <TabsContent key={platform} value={platform} className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="capitalize">{platform} API Credentials</CardTitle>
                            <CardDescription>
                              {platform === 'twitter' && 'Get credentials from Twitter Developer Portal'}
                              {platform === 'facebook' && 'Get credentials from Facebook Developers'}
                              {platform === 'linkedin' && 'Get credentials from LinkedIn Developer Portal'}
                              {platform === 'instagram' && 'Get credentials from Instagram Basic Display API'}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>API Key</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type={showApiKeys[`${platform}-key`] ? 'text' : 'password'}
                                    value={apiCredentials[platform]?.apiKey || ''}
                                    onChange={(e) => setApiCredentials(prev => ({
                                      ...prev,
                                      [platform]: { ...prev[platform], apiKey: e.target.value }
                                    }))}
                                    placeholder="Enter API key"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowApiKeys(prev => ({
                                      ...prev,
                                      [`${platform}-key`]: !prev[`${platform}-key`]
                                    }))}
                                  >
                                    {showApiKeys[`${platform}-key`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>API Secret</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type={showApiKeys[`${platform}-secret`] ? 'text' : 'password'}
                                    value={apiCredentials[platform]?.apiSecret || ''}
                                    onChange={(e) => setApiCredentials(prev => ({
                                      ...prev,
                                      [platform]: { ...prev[platform], apiSecret: e.target.value }
                                    }))}
                                    placeholder="Enter API secret"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowApiKeys(prev => ({
                                      ...prev,
                                      [`${platform}-secret`]: !prev[`${platform}-secret`]
                                    }))}
                                  >
                                    {showApiKeys[`${platform}-secret`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Access Token</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type={showApiKeys[`${platform}-token`] ? 'text' : 'password'}
                                    value={apiCredentials[platform]?.accessToken || ''}
                                    onChange={(e) => setApiCredentials(prev => ({
                                      ...prev,
                                      [platform]: { ...prev[platform], accessToken: e.target.value }
                                    }))}
                                    placeholder="Enter access token"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowApiKeys(prev => ({
                                      ...prev,
                                      [`${platform}-token`]: !prev[`${platform}-token`]
                                    }))}
                                  >
                                    {showApiKeys[`${platform}-token`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Token Secret</Label>
                                <div className="flex gap-2">
                                  <Input
                                    type={showApiKeys[`${platform}-tokensecret`] ? 'text' : 'password'}
                                    value={apiCredentials[platform]?.tokenSecret || ''}
                                    onChange={(e) => setApiCredentials(prev => ({
                                      ...prev,
                                      [platform]: { ...prev[platform], tokenSecret: e.target.value }
                                    }))}
                                    placeholder="Enter token secret"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowApiKeys(prev => ({
                                      ...prev,
                                      [`${platform}-tokensecret`]: !prev[`${platform}-tokensecret`]
                                    }))}
                                  >
                                    {showApiKeys[`${platform}-tokensecret`] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </TabsContent>
                    ))}
                  </Tabs>
                )}

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={handleSaveApiSettings}
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? 'Saving...' : 'Save All Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-medium">Admin Access Required</h3>
                  <p className="text-muted-foreground">
                    API configuration is only available to administrators.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}