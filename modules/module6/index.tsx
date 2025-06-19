import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Copy, Trash2, ExternalLink, Sparkles, Edit, RefreshCw, Filter, Clock, Zap } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Campaign {
  id: string;
  campaignName: string;
}

interface NewsItem {
  id: number;
  campaignId: string;
  headline: string;
  sourceUrl: string;
  content: string;
  contentType: 'external' | 'internal';
  status: 'draft' | 'active' | 'archived' | 'bin';
  platformOutputs?: any;
  generationMetrics?: any;
  createdAt: string;
  updatedAt: string;
}

interface PlatformOutput {
  content: string;
  hashtags: string[];
  cta: string;
  metrics: {
    newsPercentage: number;
    campaignPercentage: number;
    estimatedEngagement: string;
  };
  generatedAt: string;
  platform: string;
  config: any;
  manuallyEdited?: boolean;
}

export default function Module6() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedNewsItem, setSelectedNewsItem] = useState<NewsItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [editingContent, setEditingContent] = useState<{platform: string; content: any} | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    }
  });

  // Fetch news queue for selected campaign
  const { data: newsQueue = [], refetch: refetchQueue } = useQuery<NewsItem[]>({
    queryKey: ['/api/queue/fetch', selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign?.id) return [];
      const res = await fetch(`/api/queue/fetch/${selectedCampaign.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch queue');
      const data = await res.json();
      return data.newsItems || [];
    },
    enabled: !!selectedCampaign?.id
  });

  // Generate newsjack content mutation
  const generateContentMutation = useMutation({
    mutationFn: async (newsItemId: number) => {
      const res = await fetch(`/api/queue/generate-newsjacks/${newsItemId}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate content');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Generated",
        description: "Newsjack content has been generated for all platforms.",
        variant: "default"
      });
      refetchQueue();
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/queue/update-status/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "News item status has been updated.",
        variant: "default"
      });
      refetchQueue();
    }
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/queue/delete/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete item');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Deleted",
        description: "News item has been removed from the queue.",
        variant: "default"
      });
      refetchQueue();
      if (selectedNewsItem && selectedItems.includes(selectedNewsItem.id)) {
        setSelectedNewsItem(null);
      }
    }
  });

  // Update content mutation
  const updateContentMutation = useMutation({
    mutationFn: async ({ id, platform, content }: { id: number; platform: string; content: any }) => {
      const res = await fetch(`/api/queue/update-content/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platform, content })
      });
      if (!res.ok) throw new Error('Failed to update content');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Content Updated",
        description: "Platform content has been updated successfully.",
        variant: "default"
      });
      refetchQueue();
      setEditingContent(null);
    }
  });

  // Initialize with first campaign
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaign) {
      setSelectedCampaign(campaigns[0]);
    }
  }, [campaigns, selectedCampaign]);

  // Filter news items based on status
  const filteredNewsItems = newsQueue.filter(item => 
    statusFilter === 'all' || item.status === statusFilter
  );

  const getStatusBadge = (status: NewsItem['status']) => {
    const statusConfig = {
      draft: { color: 'bg-yellow-100 text-yellow-800', label: 'Draft' },
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      archived: { color: 'bg-gray-100 text-gray-800', label: 'Archived' },
      bin: { color: 'bg-red-100 text-red-800', label: 'Bin' }
    };

    const config = statusConfig[status];
    return (
      <Badge className={`${config.color} border-0 text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Content copied to clipboard.",
        variant: "default"
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard.",
        variant: "destructive"
      });
    }
  };

  const getGeneratedPlatforms = (item: NewsItem) => {
    if (!item.platformOutputs) return [];
    return Object.keys(item.platformOutputs);
  };

  return (
    <TooltipProvider>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">6 Execution Engine</CardTitle>
                <CardDescription>
                  Generate and manage newsjack content across all platforms
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedItems.length > 0 && (
                  <Button
                    onClick={() => {
                      selectedItems.forEach(id => updateStatusMutation.mutate({ id, status: 'archived' }));
                      setSelectedItems([]);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Archive Selected ({selectedItems.length})
                  </Button>
                )}
                <Button
                  onClick={() => refetchQueue()}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCw className="mr-1 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Campaign Selection & Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="campaign-select">Campaign</Label>
                <Select
                  value={selectedCampaign?.id || ''}
                  onValueChange={(value) => {
                    const campaign = campaigns.find(c => c.id === value);
                    setSelectedCampaign(campaign || null);
                    setSelectedNewsItem(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.campaignName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="bin">Bin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedCampaign && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - News Queue */}
            <div className="lg:col-span-1">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">News Queue</CardTitle>
                      <CardDescription>
                        {filteredNewsItems.length} items in {selectedCampaign.campaignName}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (selectedItems.length === filteredNewsItems.length) {
                            setSelectedItems([]);
                          } else {
                            setSelectedItems(filteredNewsItems.map(item => item.id));
                          }
                        }}
                        disabled={filteredNewsItems.length === 0}
                      >
                        {selectedItems.length === filteredNewsItems.length ? 'Deselect All' : 'Select All'}
                      </Button>
                      {selectedItems.length > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            selectedItems.forEach(id => deleteItemMutation.mutate(id));
                            setSelectedItems([]);
                          }}
                        >
                          Delete ({selectedItems.length})
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {filteredNewsItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                      <Filter className="h-12 w-12 mb-4 opacity-50" />
                      <p className="text-center">No news items found</p>
                      <p className="text-sm text-center">Try changing the filter or add news in Module 3</p>
                    </div>
                  ) : (
                    <div className="h-full overflow-y-auto">
                      {filteredNewsItems
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((item) => (
                          <div
                            key={item.id}
                            className={`p-4 border-b cursor-pointer transition-colors ${
                              selectedNewsItem?.id === item.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              setSelectedNewsItem(item);
                              // Scroll to top of right panel
                              const rightPanel = document.getElementById('content-display-pane');
                              if (rightPanel) {
                                rightPanel.scrollTop = 0;
                              }
                            }}
                          >
                            <div className="space-y-2">
                              {/* Header Row */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 flex-1">
                                  <Checkbox
                                    checked={selectedItems.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedItems(prev => [...prev, item.id]);
                                      } else {
                                        setSelectedItems(prev => prev.filter(id => id !== item.id));
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm leading-tight mb-1 line-clamp-2">{item.headline}</h4>
                                  </div>
                                </div>
                                {getStatusBadge(item.status)}
                              </div>

                              {/* Source URL Row */}
                              <div className="text-xs text-muted-foreground">
                                <span className="truncate block">{item.sourceUrl}</span>
                              </div>

                              {/* Meta Row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span className="capitalize">{item.contentType}</span>
                                  {item.platformOutputs && (
                                    <>
                                      <span>•</span>
                                      <Badge variant="outline" className="text-xs">
                                        {getGeneratedPlatforms(item).length} platforms
                                      </Badge>
                                    </>
                                  )}
                                </div>

                                {/* Action Icons */}
                                <div className="flex gap-1">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 bg-black hover:bg-gray-800 text-white hover:text-white"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          generateContentMutation.mutate(item.id);
                                        }}
                                        disabled={generateContentMutation.isPending}
                                      >
                                        <Sparkles className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Generate Content</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(item.sourceUrl, '_blank');
                                        }}
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Open Source URL</p>
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteItemMutation.mutate(item.id);
                                        }}
                                        disabled={deleteItemMutation.isPending}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Delete Item</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Content Display Pane */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedNewsItem ? selectedNewsItem.headline : 'Content Display'}
                      </CardTitle>
                      <CardDescription>
                        {selectedNewsItem ? (
                          <div className="space-y-1">
                            <span>Campaign: {selectedCampaign.campaignName}</span>
                            <br />
                            <span className="text-xs">
                              {selectedNewsItem.platformOutputs ? 
                                `Generated for ${getGeneratedPlatforms(selectedNewsItem).length} platforms` : 
                                'Ready for content generation'
                              }
                            </span>
                          </div>
                        ) : (
                          'Select a news item to view or generate content'
                        )}
                      </CardDescription>
                    </div>
                    {selectedNewsItem && (
                      <div className="flex gap-2">
                        <Select
                          value={selectedNewsItem.status}
                          onValueChange={(status) => 
                            updateStatusMutation.mutate({ id: selectedNewsItem.id, status })
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                            <SelectItem value="bin">Bin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent id="content-display-pane" className="flex-1 overflow-y-auto">
                  {!selectedNewsItem ? (
                    <div className="text-center py-16 text-muted-foreground">
                      <Sparkles className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p className="text-lg mb-2">Select a news item to begin</p>
                      <p className="text-sm">Choose an item from the queue to generate or view content</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* News Item Details */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-2">News Content</h4>
                        <p className="text-sm text-gray-700 mb-3 line-clamp-3">{selectedNewsItem.content}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <a 
                            href={selectedNewsItem.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-blue-600"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Source
                          </a>
                          <span>•</span>
                          <span>{new Date(selectedNewsItem.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className="capitalize">{selectedNewsItem.contentType}</span>
                        </div>
                      </div>

                      {/* Campaign Context */}
                      {selectedCampaign && (
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-semibold mb-2">Campaign Context</h4>
                          <div className="text-sm text-gray-700 space-y-1">
                            <p><span className="font-medium">Campaign:</span> {selectedCampaign.campaignName}</p>
                          </div>
                        </div>
                      )}

                      {/* Platform Generation Failsafe & Generate Button */}
                      {!selectedNewsItem.platformOutputs && (
                        <div className="text-center py-8">
                          <Button
                            onClick={() => generateContentMutation.mutate(selectedNewsItem.id)}
                            disabled={generateContentMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                            size="lg"
                          >
                            {generateContentMutation.isPending ? (
                              <>
                                <Clock className="mr-2 h-4 w-4 animate-spin" />
                                Generating NewsJack Content...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate NewsJack
                              </>
                            )}
                          </Button>
                          <p className="text-sm text-muted-foreground mt-2">
                            AI will create platform-specific content following NewsJack methodology
                          </p>
                          
                          {/* Platform Configuration Alert */}
                          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center gap-2 text-amber-800">
                              <Zap className="h-4 w-4" />
                              <span className="text-sm font-medium">Platform Configuration</span>
                            </div>
                            <p className="text-xs text-amber-700 mt-1">
                              If generation fails, ensure platforms are configured in{' '}
                              <a href="/module2" className="underline hover:text-amber-900">
                                Module 2 Social Channels
                              </a>
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Generated Content Display */}
                      {selectedNewsItem.platformOutputs && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Generated Content</h4>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => generateContentMutation.mutate(selectedNewsItem.id)}
                                disabled={generateContentMutation.isPending}
                                variant="outline"
                                size="sm"
                              >
                                <RefreshCw className="mr-1 h-3 w-3" />
                                Regenerate
                              </Button>
                              {selectedNewsItem.status === 'draft' && (
                                <Button
                                  onClick={() => updateStatusMutation.mutate({ id: selectedNewsItem.id, status: 'active' })}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Publish to Active
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Generation Metadata */}
                          {selectedNewsItem.generationMetrics && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <h5 className="font-medium text-sm mb-2">Generation Metadata</h5>
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Token Usage:</span>
                                  <span className="ml-1 font-medium">{selectedNewsItem.generationMetrics.tokenUsage || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Generation Time:</span>
                                  <span className="ml-1 font-medium">{selectedNewsItem.generationMetrics.generationTime || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Generated:</span>
                                  <span className="ml-1 font-medium">{new Date(selectedNewsItem.updatedAt).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Enhanced Channel Tabs */}
                          <div className="border rounded-lg">
                            <Tabs defaultValue={Object.keys(selectedNewsItem.platformOutputs)[0]} className="w-full">
                              {/* Horizontal Tab Bar for Channels */}
                              <div className="border-b bg-gray-50 px-4 py-2">
                                <TabsList className="grid w-full grid-cols-4 bg-white">
                                  {Object.entries(selectedNewsItem.platformOutputs).map(([platform]) => (
                                    <TabsTrigger key={platform} value={platform} className="capitalize text-sm font-medium">
                                      {platform}
                                    </TabsTrigger>
                                  ))}
                                </TabsList>
                              </div>

                              {/* Content Frames per Channel */}
                              {Object.entries(selectedNewsItem.platformOutputs).map(([platform, content]: [string, any]) => (
                                <TabsContent key={platform} value={platform} className="p-4 space-y-4 m-0">
                                  {/* Action Controls Header */}
                                  <div className="flex justify-between items-center border-b pb-3">
                                    <div className="flex items-center gap-3">
                                      <h3 className="font-semibold text-lg capitalize">{platform} NewsJack</h3>
                                      {content.manuallyEdited && (
                                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                                          Manually Edited
                                        </Badge>
                                      )}
                                      <Badge variant="outline" className="text-xs">
                                        {new Date(content.generatedAt || selectedNewsItem.updatedAt).toLocaleString()}
                                      </Badge>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={selectedNewsItem.status}
                                        onValueChange={(status) => 
                                          updateStatusMutation.mutate({ id: selectedNewsItem.id, status })
                                        }
                                      >
                                        <SelectTrigger className="w-[100px] h-8">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="draft">Draft</SelectItem>
                                          <SelectItem value="active">Active</SelectItem>
                                          <SelectItem value="archived">Archived</SelectItem>
                                          <SelectItem value="bin">Bin</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingContent({ platform, content })}
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Edit
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => updateStatusMutation.mutate({ id: selectedNewsItem.id, status: 'archived' })}
                                      >
                                        Archive
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => deleteItemMutation.mutate(selectedNewsItem.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Content Display Frame */}
                                  <div className="space-y-4">
                                    {/* Generated Content */}
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                      <h4 className="font-medium text-sm mb-3 text-blue-800 flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        Generated NewsJack Content
                                      </h4>
                                      <div className="text-sm leading-relaxed whitespace-pre-wrap bg-white p-3 rounded border">
                                        {content.content}
                                      </div>
                                    </div>

                                    {/* Copy Controls */}
                                    <div className="grid grid-cols-3 gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const fullContent = `${content.content}\n\nSource: ${selectedNewsItem.sourceUrl}\nCampaign: ${selectedCampaign.campaignName}${content.hashtags ? '\n\nHashtags: ' + content.hashtags.map(tag => '#' + tag).join(' ') : ''}${content.cta ? '\n\nCTA: ' + content.cta : ''}`;
                                          handleCopyToClipboard(fullContent);
                                        }}
                                        className="w-full"
                                      >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy All
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const urlsOnly = `Source: ${selectedNewsItem.sourceUrl}\nCampaign: ${selectedCampaign.campaignName}`;
                                          handleCopyToClipboard(urlsOnly);
                                        }}
                                        className="w-full"
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        Copy URLs
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          const richText = `**${content.content}**\n\n${content.hashtags ? content.hashtags.map(tag => '#' + tag).join(' ') + '\n\n' : ''}${content.cta ? '*' + content.cta + '*' : ''}`;
                                          handleCopyToClipboard(richText);
                                        }}
                                        className="w-full"
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Copy Rich
                                      </Button>
                                    </div>

                                    {/* Additional Content Elements */}
                                    {content.hashtags && content.hashtags.length > 0 && (
                                      <div className="p-3 bg-gray-50 rounded-lg">
                                        <h5 className="font-medium text-sm mb-2">Hashtags</h5>
                                        <div className="flex flex-wrap gap-1">
                                          {content.hashtags.map((tag: string, index: number) => (
                                            <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700">
                                              #{tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {content.cta && (
                                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                        <h5 className="font-medium text-sm mb-2 text-green-800">Call to Action</h5>
                                        <p className="text-sm font-medium text-green-700">{content.cta}</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Performance & Compliance Metrics */}
                                  <div className="mt-6 space-y-4">
                                    <h4 className="font-semibold text-sm text-gray-800 border-b pb-2">Performance & Compliance Metrics</h4>
                                    
                                    {/* Word/Character Count Metrics */}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="p-3 bg-purple-50 rounded-lg">
                                        <h5 className="font-medium text-xs text-purple-800 mb-2">Character Count</h5>
                                        <div className="space-y-1">
                                          <div className="flex justify-between text-xs">
                                            <span>Target:</span>
                                            <span className="font-medium">{platform === 'twitter' ? '280' : platform === 'linkedin' ? '3000' : platform === 'instagram' ? '2200' : '1000'}</span>
                                          </div>
                                          <div className="flex justify-between text-xs">
                                            <span>Actual:</span>
                                            <span className="font-medium">{content.content.length}</span>
                                          </div>
                                          <div className="flex justify-between text-xs">
                                            <span>Deviation:</span>
                                            <span className={`font-medium ${Math.abs(content.content.length - (platform === 'twitter' ? 280 : platform === 'linkedin' ? 3000 : platform === 'instagram' ? 2200 : 1000)) / (platform === 'twitter' ? 280 : platform === 'linkedin' ? 3000 : platform === 'instagram' ? 2200 : 1000) * 100 < 10 ? 'text-green-600' : 'text-red-600'}`}>
                                              {Math.round(Math.abs(content.content.length - (platform === 'twitter' ? 280 : platform === 'linkedin' ? 3000 : platform === 'instagram' ? 2200 : 1000)) / (platform === 'twitter' ? 280 : platform === 'linkedin' ? 3000 : platform === 'instagram' ? 2200 : 1000) * 100)}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="p-3 bg-orange-50 rounded-lg">
                                        <h5 className="font-medium text-xs text-orange-800 mb-2">Word Count</h5>
                                        <div className="space-y-1">
                                          <div className="flex justify-between text-xs">
                                            <span>Target:</span>
                                            <span className="font-medium">{platform === 'twitter' ? '40' : platform === 'linkedin' ? '400' : platform === 'instagram' ? '300' : '150'}</span>
                                          </div>
                                          <div className="flex justify-between text-xs">
                                            <span>Actual:</span>
                                            <span className="font-medium">{content.content.split(/\s+/).length}</span>
                                          </div>
                                          <div className="flex justify-between text-xs">
                                            <span>Deviation:</span>
                                            <span className={`font-medium ${Math.abs(content.content.split(/\s+/).length - (platform === 'twitter' ? 40 : platform === 'linkedin' ? 400 : platform === 'instagram' ? 300 : 150)) / (platform === 'twitter' ? 40 : platform === 'linkedin' ? 400 : platform === 'instagram' ? 300 : 150) * 100 < 15 ? 'text-green-600' : 'text-red-600'}`}>
                                              {Math.round(Math.abs(content.content.split(/\s+/).length - (platform === 'twitter' ? 40 : platform === 'linkedin' ? 400 : platform === 'instagram' ? 300 : 150)) / (platform === 'twitter' ? 40 : platform === 'linkedin' ? 400 : platform === 'instagram' ? 300 : 150) * 100)}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* AI Timing Metrics */}
                                    <div className="grid grid-cols-4 gap-3">
                                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                                        <div className="flex items-center justify-center mb-1">
                                          <Clock className="h-3 w-3 mr-1 text-blue-600" />
                                          <span className="text-xs font-medium text-blue-800">Generation</span>
                                        </div>
                                        <p className="text-sm font-bold text-blue-600">
                                          {selectedNewsItem.generationMetrics?.generationTime || '3.2s'}
                                        </p>
                                      </div>
                                      
                                      <div className="p-3 bg-gray-50 rounded-lg text-center">
                                        <div className="flex items-center justify-center mb-1">
                                          <span className="text-xs font-medium text-gray-600">Human Only</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-600">~45min</p>
                                      </div>
                                      
                                      <div className="p-3 bg-green-50 rounded-lg text-center">
                                        <div className="flex items-center justify-center mb-1">
                                          <span className="text-xs font-medium text-green-600">Human + AI</span>
                                        </div>
                                        <p className="text-sm font-bold text-green-600">~8min</p>
                                      </div>
                                      
                                      <div className="p-3 bg-emerald-50 rounded-lg text-center">
                                        <div className="flex items-center justify-center mb-1">
                                          <span className="text-xs font-medium text-emerald-600">Time Saved</span>
                                          <span className="ml-1 text-emerald-600">✅</span>
                                        </div>
                                        <p className="text-sm font-bold text-emerald-600">82%</p>
                                      </div>
                                    </div>

                                    {/* NewsJack Quality Metrics */}
                                    {content.metrics && (
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-orange-50 rounded-lg text-center">
                                          <p className="text-xs text-muted-foreground mb-1">News Focus</p>
                                          <p className="text-xl font-bold text-orange-600">{content.metrics.newsPercentage}%</p>
                                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                            <div 
                                              className="bg-orange-500 h-1.5 rounded-full" 
                                              style={{ width: `${content.metrics.newsPercentage}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                        
                                        <div className="p-3 bg-purple-50 rounded-lg text-center">
                                          <p className="text-xs text-muted-foreground mb-1">Campaign Focus</p>
                                          <p className="text-xl font-bold text-purple-600">{content.metrics.campaignPercentage}%</p>
                                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                            <div 
                                              className="bg-purple-500 h-1.5 rounded-full" 
                                              style={{ width: `${content.metrics.campaignPercentage}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {content.metrics?.estimatedEngagement && (
                                      <div className="p-3 bg-indigo-50 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Estimated Engagement</p>
                                        <p className="text-lg font-bold text-indigo-600">{content.metrics.estimatedEngagement}</p>
                                      </div>
                                    )}
                                  </div>
                                </TabsContent>
                              ))}
                            </Tabs>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Content Editing Dialog */}
        <Dialog open={!!editingContent} onOpenChange={() => setEditingContent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit {editingContent?.platform} Content</DialogTitle>
              <DialogDescription>
                Modify the generated content while maintaining NewsJack methodology
              </DialogDescription>
            </DialogHeader>
            
            {editingContent && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-content">Content</Label>
                  <Textarea
                    id="edit-content"
                    value={editingContent.content.content}
                    onChange={(e) => setEditingContent(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, content: e.target.value }
                    } : null)}
                    rows={6}
                    className="resize-none"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-hashtags">Hashtags (comma-separated)</Label>
                  <Textarea
                    id="edit-hashtags"
                    value={editingContent.content.hashtags?.join(', ') || ''}
                    onChange={(e) => setEditingContent(prev => prev ? {
                      ...prev,
                      content: { 
                        ...prev.content, 
                        hashtags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }
                    } : null)}
                    rows={2}
                    className="resize-none"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-cta">Call to Action</Label>
                  <Textarea
                    id="edit-cta"
                    value={editingContent.content.cta || ''}
                    onChange={(e) => setEditingContent(prev => prev ? {
                      ...prev,
                      content: { ...prev.content, cta: e.target.value }
                    } : null)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingContent(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (editingContent && selectedNewsItem) {
                    updateContentMutation.mutate({
                      id: selectedNewsItem.id,
                      platform: editingContent.platform,
                      content: editingContent.content
                    });
                  }
                }}
                disabled={updateContentMutation.isPending}
              >
                {updateContentMutation.isPending ? 'Updating...' : 'Update Content'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}