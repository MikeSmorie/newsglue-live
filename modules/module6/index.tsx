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
import { Copy, Trash2, ExternalLink, Sparkles, Edit, RefreshCw, Filter, Clock, Zap, Download, FileText, File, BookOpen } from 'lucide-react';
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
  const [activeChannel, setActiveChannel] = useState<string>('twitter');
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // PDF Export handlers
  const handleNewsJackPDFExport = async (newsItemId: number, headline: string) => {
    try {
      const response = await fetch(`/api/pdf/newsjack/${newsItemId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate NewsJack PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsjack-${headline.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "NewsJack PDF Exported",
        description: "Your NewsJack content has been exported successfully"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export NewsJack PDF",
        variant: "destructive"
      });
    }
  };

  const handleCampaignDossierPDFExport = async () => {
    if (!selectedCampaign) return;
    
    try {
      const response = await fetch(`/api/pdf/dossier/${selectedCampaign.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate Campaign Dossier PDF');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-dossier-${selectedCampaign.campaignName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Campaign Dossier Exported",
        description: "Your campaign dossier has been exported successfully"
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export Campaign Dossier PDF",
        variant: "destructive"
      });
    }
  };

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
  const { data: queueData, refetch: refetchQueue } = useQuery({
    queryKey: ['/api/queue/fetch', selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign?.id) return { newsItems: [] };
      const res = await fetch(`/api/queue/fetch/${selectedCampaign.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch queue');
      const data = await res.json();
      return data;
    },
    enabled: !!selectedCampaign?.id
  });

  const newsQueue = queueData?.newsItems || [];

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
      refetchQueue();
      toast({
        title: "Status Updated",
        description: "News item status has been updated.",
      });
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
      refetchQueue();
      setSelectedNewsItem(null);
      toast({
        title: "Item Deleted",
        description: "News item has been removed from the queue.",
      });
    }
  });

  // Filter news items by status
  const filteredItems = (newsQueue as NewsItem[]).filter((item: NewsItem) => 
    statusFilter === 'all' || item.status === statusFilter
  );

  // Set first available channel when news item changes
  useEffect(() => {
    if (selectedNewsItem?.platformOutputs) {
      const availableChannels = Object.keys(selectedNewsItem.platformOutputs);
      if (availableChannels.length > 0 && !availableChannels.includes(activeChannel)) {
        setActiveChannel(availableChannels[0]);
      }
    }
  }, [selectedNewsItem, activeChannel]);

  // Auto-select first campaign if available
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaign) {
      setSelectedCampaign(campaigns[0]);
    }
  }, [campaigns, selectedCampaign]);

  // Debug logging
  useEffect(() => {
    console.log('Module 6 Debug:', {
      selectedCampaign: selectedCampaign?.campaignName,
      newsQueueLength: newsQueue.length,
      filteredItemsLength: filteredItems.length,
      queueData
    });
  }, [selectedCampaign, newsQueue, filteredItems, queueData]);

  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig: any = {
      draft: { color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200', label: 'Draft' },
      active: { color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200', label: 'Active' },
      archived: { color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200', label: 'Archived' },
      bin: { color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200', label: 'Bin' }
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

  // PDF download functions
  const handleDownloadNewsJackPDF = async (newsItemId: number) => {
    try {
      const res = await fetch(`/api/pdf/newsjack/${newsItemId}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsjack-${newsItemId}-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "PDF Downloaded",
        description: "NewsJack content report has been downloaded."
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDownloadCampaignDossier = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/pdf/campaign-dossier/${campaignId}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to generate campaign dossier');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-dossier-${campaignId}-${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Dossier Downloaded",
        description: "Campaign dossier has been downloaded."
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Edit Content Modal Component
  const EditContentModal = ({ isOpen, onClose, platform, content, onSave }: any) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-white">Edit {platform} Content</DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-300">
            Make changes to the generated content for {platform}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            defaultValue={content?.content || ''}
            rows={8}
            className="w-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(content)}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      <TooltipProvider>
        {/* Panel 2: Left Column - News Item List */}
        <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">News Items</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              Select a news item to generate or view newsjack content
            </p>
            
            {/* Campaign Selection */}
            <div className="mb-3">
              <Select
                value={selectedCampaign?.id || ''}
                onValueChange={(value) => {
                  const campaign = campaigns.find(c => c.id === value);
                  setSelectedCampaign(campaign || null);
                  setSelectedNewsItem(null);
                }}
              >
                <SelectTrigger className="w-full">
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

            {/* Campaign Dossier PDF Export */}
            {selectedCampaign && (
              <div className="mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCampaignDossierPDFExport}
                  className="w-full flex items-center gap-2"
                >
                  <BookOpen className="h-4 w-4" />
                  Export Campaign Dossier PDF
                </Button>
              </div>
            )}

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              <button 
                className={`px-2 py-1 text-xs rounded ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                onClick={() => setStatusFilter('all')}
              >
                All
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${statusFilter === 'draft' ? 'bg-yellow-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                onClick={() => setStatusFilter('draft')}
              >
                Draft
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${statusFilter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                onClick={() => setStatusFilter('active')}
              >
                Active
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${statusFilter === 'archived' ? 'bg-gray-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                onClick={() => setStatusFilter('archived')}
              >
                Archive
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${statusFilter === 'bin' ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                onClick={() => setStatusFilter('bin')}
              >
                Bin
              </button>
            </div>

            {/* Bulk Selection Toggle */}
            {filteredItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-600 dark:text-gray-300">Bulk Selection Mode</Label>
                  <Checkbox
                    checked={bulkSelectMode}
                    onCheckedChange={(checked) => setBulkSelectMode(checked === true)}
                  />
                </div>
                {bulkSelectMode && selectedItems.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    onClick={() => {
                      selectedItems.forEach(id => updateStatusMutation.mutate({ id, status: 'archived' }));
                      setSelectedItems([]);
                    }}
                  >
                    Archive Selected ({selectedItems.length})
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Scrollable News List */}
          <div className="flex-1 overflow-y-auto">
            {!selectedCampaign ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm">Select a campaign to view news items</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-3">📰</div>
                <p className="text-sm">No news items found</p>
                <p className="text-xs mt-1">Add items from Module 4 or 5</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredItems.map((item: NewsItem) => (
                  <div
                    key={item.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedNewsItem?.id === item.id ? 'bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedNewsItem(item)}
                  >
                    {/* Row Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {bulkSelectMode && (
                          <Checkbox
                            checked={selectedItems.includes(item.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedItems([...selectedItems, item.id]);
                              } else {
                                setSelectedItems(selectedItems.filter(id => id !== item.id));
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <StatusBadge status={item.status} />
                      </div>
                      
                      {/* Inline Actions */}
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-blue-600"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>View source</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1 text-gray-400 hover:text-yellow-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingContent({ platform: 'edit', content: item });
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Edit item</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1 text-gray-400 hover:text-gray-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({ id: item.id, status: 'archived' });
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Archive</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1 text-gray-400 hover:text-red-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteItemMutation.mutate(item.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Headline with Tooltip */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight">
                          {item.headline}
                        </h4>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>{item.headline}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Date and Generation Status */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1">
                        {getGeneratedPlatforms(item).length > 0 ? (
                          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Zap className="h-3 w-3" />
                            <span className="font-medium">{getGeneratedPlatforms(item).length}</span>
                          </div>
                        ) : (
                          <button
                            className="p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              generateContentMutation.mutate(item.id);
                            }}
                            disabled={generateContentMutation.isPending}
                          >
                            {generateContentMutation.isPending ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel 3: Right Column - Content Display */}
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
          {!selectedNewsItem ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">👆</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Select a news item to begin</h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Choose an item from the queue to generate or view NewsJack content
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header Area */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedNewsItem.headline}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
                      <span>Campaign: {selectedCampaign?.campaignName}</span>
                      <span>•</span>
                      <a
                        href={selectedNewsItem.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Source URL
                      </a>
                      <span>•</span>
                      <span>{new Date(selectedNewsItem.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* PDF Download Buttons */}
                  <div className="flex gap-2 ml-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadNewsJackPDF(selectedNewsItem.id)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          NewsJack PDF
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Download PDF report for this news item's generated content
                      </TooltipContent>
                    </Tooltip>
                    
                    {selectedCampaign && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadCampaignDossier(selectedCampaign.id)}
                            className="flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            Campaign Dossier
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Download complete campaign strategy and content dossier
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                {/* Channel Filter Tabs */}
                {selectedNewsItem.platformOutputs && Object.keys(selectedNewsItem.platformOutputs).length > 0 && (
                  <div className="flex gap-2">
                    {Object.keys(selectedNewsItem.platformOutputs).map((channel) => (
                      <button
                        key={channel}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize border ${
                          activeChannel === channel
                            ? 'bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600'
                        }`}
                        onClick={() => setActiveChannel(channel)}
                      >
                        {channel}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 p-6 overflow-y-auto">
                {!selectedNewsItem.platformOutputs || Object.keys(selectedNewsItem.platformOutputs).length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-lg">
                      <Sparkles className="mx-auto h-16 w-16 text-blue-500 mb-6" />
                      <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-3">Generate NewsJack Content</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                        Create AI-powered content for all social platforms using the NewsJack methodology: 
                        Start with news, frame tension, introduce campaign, drive urgency.
                      </p>
                      <Button
                        onClick={() => generateContentMutation.mutate(selectedNewsItem.id)}
                        disabled={generateContentMutation.isPending}
                        size="lg"
                        className="px-8 py-3"
                      >
                        {generateContentMutation.isPending ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating Content...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Generate Content
                          </>
                        )}
                      </Button>
                      
                      {generateContentMutation.isPending && (
                        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <Clock className="h-4 w-4" />
                            Estimated time: 15-30 seconds
                          </div>
                          <div className="text-left space-y-1 max-w-xs mx-auto">
                            <p>• Analyzing news context and audience pain points...</p>
                            <p>• Applying NewsJack methodology framework...</p>
                            <p>• Generating platform-optimized content...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Content Output Display */}
                    {selectedNewsItem.platformOutputs[activeChannel] && (
                      <>
                        {/* Styled Output */}
                        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                                {activeChannel} NewsJack Output
                              </h3>
                              <div className="flex items-center gap-2">
                                <Select
                                  value={selectedNewsItem.status}
                                  onValueChange={(status) => updateStatusMutation.mutate({ id: selectedNewsItem.id, status })}
                                >
                                  <SelectTrigger className="w-[100px] h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="archived">Archive</SelectItem>
                                    <SelectItem value="bin">Bin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-6">
                            <div className={`bg-white dark:bg-gray-900 p-6 rounded border leading-relaxed text-gray-900 dark:text-white ${
                              activeChannel === 'blog' 
                                ? 'text-base whitespace-pre-wrap font-serif max-h-96 overflow-y-auto' 
                                : 'text-sm whitespace-pre-wrap font-mono'
                            }`}>
                              {selectedNewsItem.platformOutputs[activeChannel].content}
                            </div>
                          </div>
                        </div>

                        {/* Copy Buttons */}
                        <div className="flex gap-3">
                          <Button
                            variant="default"
                            onClick={() => {
                              const content = selectedNewsItem.platformOutputs[activeChannel];
                              const fullContent = `${content.content}\n\nSource: ${selectedNewsItem.sourceUrl}\nCampaign: ${selectedCampaign?.campaignName}${content.hashtags ? '\n\nHashtags: ' + content.hashtags.map((tag: string) => '#' + tag).join(' ') : ''}${content.cta ? '\n\nCTA: ' + content.cta : ''}`;
                              handleCopyToClipboard(fullContent);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy All
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={() => {
                              const urlsOnly = `Source: ${selectedNewsItem.sourceUrl}\nCampaign: ${selectedCampaign?.campaignName}`;
                              handleCopyToClipboard(urlsOnly);
                            }}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Copy URLs
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={() => {
                              const content = selectedNewsItem.platformOutputs[activeChannel];
                              const richText = `**${content.content}**\n\n${content.hashtags ? content.hashtags.map((tag: string) => '#' + tag).join(' ') + '\n\n' : ''}${content.cta ? '*' + content.cta + '*' : ''}`;
                              handleCopyToClipboard(richText);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Copy Rich Text
                          </Button>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            onClick={() => setEditingContent({ 
                              platform: activeChannel, 
                              content: selectedNewsItem.platformOutputs[activeChannel] 
                            })}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => generateContentMutation.mutate(selectedNewsItem.id)}
                            disabled={generateContentMutation.isPending}
                          >
                            {generateContentMutation.isPending ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Regenerate
                          </Button>

                          <Button
                            variant="destructive"
                            onClick={() => deleteItemMutation.mutate(selectedNewsItem.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>

                        {/* Additional Content Elements */}
                        {selectedNewsItem.platformOutputs[activeChannel].hashtags && (
                          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Hashtags</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedNewsItem.platformOutputs[activeChannel].hashtags.map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedNewsItem.platformOutputs[activeChannel].cta && (
                          <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">Call to Action</h4>
                            <p className="text-sm text-green-800 dark:text-green-200">{selectedNewsItem.platformOutputs[activeChannel].cta}</p>
                            {selectedNewsItem.platformOutputs[activeChannel].ctaUrl && (
                              <a 
                                href={selectedNewsItem.platformOutputs[activeChannel].ctaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-sm text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {selectedNewsItem.platformOutputs[activeChannel].ctaUrl}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Stats Panel */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Content Metrics */}
                          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Content Analysis</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">Requested vs. Actual:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {activeChannel === 'twitter' ? '280' : 
                                   activeChannel === 'linkedin' ? '3000' : 
                                   activeChannel === 'instagram' ? '2200' : '1000'} / {selectedNewsItem.platformOutputs[activeChannel].content.length} chars
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">Word Count:</span>
                                <span className="font-medium text-gray-900 dark:text-white">{selectedNewsItem.platformOutputs[activeChannel].content.split(/\s+/).length} words</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">AI Model:</span>
                                <span className="font-medium text-gray-900 dark:text-white">GPT-4o</span>
                              </div>
                            </div>
                          </div>

                          {/* Performance Benchmarks */}
                          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Performance Benchmarks</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">AI Processing Time:</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">{selectedNewsItem.generationMetrics?.generationTime || '3.2s'}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">Human Time:</span>
                                <span className="font-medium text-gray-600 dark:text-gray-400">~45min</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">Human + AI Time:</span>
                                <span className="font-medium text-green-600 dark:text-green-400">~8min</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-300">NewsGlue Time:</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">{selectedNewsItem.generationMetrics?.generationTime || '3.2s'}</span>
                              </div>
                              <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                                <div className="flex justify-between text-sm font-medium">
                                  <span className="text-gray-700 dark:text-gray-300">Time Savings:</span>
                                  <span className="text-emerald-600 dark:text-emerald-400">82% vs Human | 60% vs Human+AI</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* NewsJack Quality Metrics */}
                        {selectedNewsItem.platformOutputs[activeChannel].metrics && (
                          <div className="bg-purple-50 dark:bg-purple-900/50 border border-purple-200 dark:border-purple-600 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3">NewsJack Quality Analysis</h4>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="text-center bg-white dark:bg-gray-800 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                                <div className="text-3xl font-bold text-orange-600 dark:text-orange-300 mb-1">
                                  {selectedNewsItem.platformOutputs[activeChannel].metrics.newsPercentage}%
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">News Focus</div>
                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mt-2">
                                  <div 
                                    className="bg-orange-500 dark:bg-orange-400 h-3 rounded-full transition-all" 
                                    style={{ width: `${selectedNewsItem.platformOutputs[activeChannel].metrics.newsPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                              <div className="text-center bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                                <div className="text-3xl font-bold text-purple-600 dark:text-purple-300 mb-1">
                                  {selectedNewsItem.platformOutputs[activeChannel].metrics.campaignPercentage}%
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">Campaign Focus</div>
                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mt-2">
                                  <div 
                                    className="bg-purple-500 dark:bg-purple-400 h-3 rounded-full transition-all" 
                                    style={{ width: `${selectedNewsItem.platformOutputs[activeChannel].metrics.campaignPercentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Edit Content Modal */}
        {editingContent && (
          <EditContentModal
            isOpen={!!editingContent}
            onClose={() => setEditingContent(null)}
            platform={editingContent.platform}
            content={editingContent.content}
            onSave={(updatedContent: any) => {
              setEditingContent(null);
              refetchQueue();
            }}
          />
        )}
      </TooltipProvider>
    </div>
  );
}