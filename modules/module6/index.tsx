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
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">News Queue</CardTitle>
                      <CardDescription>
                        {filteredNewsItems.length} items in {selectedCampaign.campaignName}
                      </CardDescription>
                    </div>
                    <Checkbox
                      checked={selectedItems.length === filteredNewsItems.length && filteredNewsItems.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedItems(filteredNewsItems.map(item => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filteredNewsItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No news items found</p>
                      <p className="text-sm">Try changing the filter or add news in Module 3</p>
                    </div>
                  ) : (
                    filteredNewsItems.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedNewsItem?.id === item.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedNewsItem(item)}
                      >
                        <div className="flex items-start gap-2">
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
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm truncate pr-2">{item.headline}</h4>
                              {getStatusBadge(item.status)}
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <span className="capitalize">{item.contentType}</span>
                              <span>•</span>
                              <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                            </div>

                            {item.platformOutputs && (
                              <div className="flex items-center gap-1 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {getGeneratedPlatforms(item).length} platforms
                                </Badge>
                              </div>
                            )}

                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
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
                                    className="h-6 px-2"
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
                                    className="h-6 px-2 text-red-600 hover:text-red-700"
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
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Content Generation */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedNewsItem ? selectedNewsItem.headline : 'Generated Content'}
                      </CardTitle>
                      <CardDescription>
                        {selectedNewsItem ? 'Platform-specific newsjack content' : 'Select a news item to view generated content'}
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
                <CardContent>
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

                      {/* Generate NewsJack Button */}
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
                        </div>
                      )}

                      {/* Generated Content Display */}
                      {selectedNewsItem.platformOutputs && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Generated Content</h4>
                            <Button
                              onClick={() => generateContentMutation.mutate(selectedNewsItem.id)}
                              disabled={generateContentMutation.isPending}
                              variant="outline"
                              size="sm"
                            >
                              <RefreshCw className="mr-1 h-3 w-3" />
                              Regenerate
                            </Button>
                          </div>

                          <Tabs defaultValue={Object.keys(selectedNewsItem.platformOutputs)[0]}>
                            <TabsList className="grid w-full grid-cols-4">
                              {Object.entries(selectedNewsItem.platformOutputs).map(([platform]) => (
                                <TabsTrigger key={platform} value={platform} className="capitalize">
                                  {platform}
                                </TabsTrigger>
                              ))}
                            </TabsList>

                            {Object.entries(selectedNewsItem.platformOutputs).map(([platform, content]: [string, any]) => (
                              <TabsContent key={platform} value={platform} className="space-y-4">
                                <Card>
                                  <CardHeader className="pb-3">
                                    <div className="flex justify-between items-center">
                                      <CardTitle className="text-base capitalize">{platform} Content</CardTitle>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleCopyToClipboard(content.content)}
                                        >
                                          <Copy className="mr-1 h-3 w-3" />
                                          Copy
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingContent({ platform, content })}
                                        >
                                          <Edit className="mr-1 h-3 w-3" />
                                          Edit
                                        </Button>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-4">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                      <h5 className="font-medium text-sm mb-2">Content</h5>
                                      <p className="text-sm whitespace-pre-wrap">{content.content}</p>
                                    </div>

                                    {content.hashtags && content.hashtags.length > 0 && (
                                      <div>
                                        <h5 className="font-medium text-sm mb-2">Hashtags</h5>
                                        <div className="flex flex-wrap gap-1">
                                          {content.hashtags.map((tag: string, index: number) => (
                                            <Badge key={index} variant="outline" className="text-xs">
                                              #{tag}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {content.cta && (
                                      <div>
                                        <h5 className="font-medium text-sm mb-2">Call to Action</h5>
                                        <p className="text-sm font-medium text-blue-600">{content.cta}</p>
                                      </div>
                                    )}

                                    {content.metrics && (
                                      <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                        <div>
                                          <p className="text-xs text-muted-foreground">News Focus</p>
                                          <p className="text-sm font-medium">{content.metrics.newsPercentage}%</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Campaign Focus</p>
                                          <p className="text-sm font-medium">{content.metrics.campaignPercentage}%</p>
                                        </div>
                                      </div>
                                    )}
                                  </CardContent>
                                </Card>
                              </TabsContent>
                            ))}
                          </Tabs>
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