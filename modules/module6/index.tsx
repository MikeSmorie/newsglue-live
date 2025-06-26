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
import { Copy, Trash2, ExternalLink, Sparkles, Edit, RefreshCw, Filter, Clock, Zap, Download, FileText, File, BookOpen, Globe } from 'lucide-react';
import { SeoLandingPageButton } from '@/components/seo-landing-page-button';
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
  processingTimeSeconds?: number;
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
  const [latencyStats, setLatencyStats] = useState<any>(null);
  const [generationProgress, setGenerationProgress] = useState<{[key: string]: boolean}>({});

  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if debug mode is enabled via URL parameter
  const isDebugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'true';

  // Helper function to get generated platforms for a news item
  const getGeneratedPlatforms = (item: NewsItem) => {
    if (!item.platformOutputs) return [];
    // Only count platforms that have actual NewsJack content (not just source data)
    return Object.keys(item.platformOutputs).filter(platform => {
      const content = item.platformOutputs[platform];
      // Check if this is actual generated content, not just source metadata
      return content && typeof content === 'object' && 
             (content.content || content.text || content.body) &&
             !(content.source && content.imageUrl && !content.content); // Exclude source-only data
    });
  };


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

  // Format time utility function
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) return `${minutes}m`;
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Calculate time savings
  const calculateTimeSavings = (processingTime: number) => {
    const humanTime = 45 * 60; // 45 minutes in seconds (2700 seconds)
    const humanAiTime = 8 * 60; // 8 minutes in seconds (480 seconds)
    
    return {
      humanTimeSaved: humanTime - processingTime,
      humanAiTimeSaved: humanAiTime - processingTime,
      humanTime,
      humanAiTime
    };
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
    queryKey: ['/api/queue/fetch', selectedCampaignID],
    queryFn: async () => {
      if (!selectedCampaignID) return { newsItems: [] };
      const res = await fetch(`/api/queue/fetch/${selectedCampaign.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch queue');
      const data = await res.json();
      return data;
    },
    enabled: !!selectedCampaignID
  });

  const newsQueue = queueData?.newsItems || [];

  // Generate newsjack content mutation
  const generateContentMutation = useMutation({
    mutationFn: async (newsItemId: number) => {
      // Initialize progress tracking
      setGenerationProgress({
        blog: false,
        twitter: false,
        linkedin: false,
        instagram: false,
        facebook: false
      });
      
      // T1: Time when "Generate" is clicked
      const T1 = Date.now();
      console.time('NewsJack-Total-Latency');
      console.log(`[LATENCY] T1: Generate clicked at ${T1} (${new Date(T1).toISOString()})`);
      
      // T2: Time request is sent to backend
      const T2 = Date.now();
      console.log(`[LATENCY] T2: Request sent at ${T2} (${new Date(T2).toISOString()}) - Frontend prep time: ${T2 - T1}ms`);
      
      // Set up progress monitoring via polling
      const progressInterval = setInterval(async () => {
        try {
          const progressRes = await fetch(`/api/queue/generation-progress/${newsItemId}`, {
            credentials: 'include'
          });
          if (progressRes.ok) {
            const progressData = await progressRes.json();
            if (progressData.progress) {
              setGenerationProgress(progressData.progress);
            }
          }
        } catch (error) {
          // Ignore polling errors
        }
      }, 1000);
      
      const res = await fetch(`/api/queue/generate-newsjacks/${newsItemId}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      clearInterval(progressInterval);
      
      // T5: Time when response is received
      const T5 = Date.now();
      console.log(`[LATENCY] T5: Response received at ${T5} (${new Date(T5).toISOString()}) - Network + Processing time: ${T5 - T2}ms`);
      console.timeEnd('NewsJack-Total-Latency');
      console.log(`[LATENCY] TOTAL USER-PERCEIVED LATENCY: ${T5 - T1}ms`);
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate content');
      }
      
      const result = await res.json();
      
      // Final progress update
      setGenerationProgress({
        blog: true,
        twitter: true,
        linkedin: true,
        instagram: true,
        facebook: true
      });
      
      // Store timing data for potential debug display
      const timingData = {
        T1, T2, T5,
        frontendPrepTime: T2 - T1,
        networkProcessingTime: T5 - T2,
        totalLatency: T5 - T1,
        backendBreakdown: result.latencyBreakdown
      };
      setLatencyStats(timingData);
      
      return result;
    },
    onSuccess: (data) => {
      // T6: Frontend starts processing response
      const T6 = Date.now();
      console.log(`[LATENCY] T6: Frontend processing response at ${T6} (${new Date(T6).toISOString()})`);
      
      toast({
        title: "Content Generated",
        description: "Newsjack content has been generated for all platforms.",
      });
      
      // Update the selected news item immediately with the new data
      if (data?.newsItem && selectedNewsItem?.id === data.newsItem.id) {
        setSelectedNewsItem(data.newsItem);
      }
      
      // Force invalidate all related queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      
      // Refresh the queue to get the latest data
      refetchQueue();
      
      // T7: Frontend rendering complete
      const T7 = Date.now();
      console.log(`[LATENCY] T7: Frontend rendering complete at ${T7} - Render time: ${T7 - T6}ms`);
      
      // Display comprehensive latency summary
      if (data?.latencyBreakdown) {
        console.log(`[LATENCY SUMMARY] Complete Generation Pipeline:`);
        console.log(`• Network + Backend time: ${data.latencyBreakdown.totalBackendTime}ms`);
        console.log(`• Average time per platform: ${data.latencyBreakdown.avgTimePerPlatform}ms`);
        console.log(`• Frontend render time: ${T7 - T6}ms`);
        
        // Update latency stats with final render time
        setLatencyStats((prev: any) => prev ? {...prev, renderTime: T7 - T6, totalPipeline: prev.totalLatency + (T7 - T6)} : null);
      }
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
      draft: { color: 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-100', label: 'Draft' },
      active: { color: 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100', label: 'Active' },
      archived: { color: 'bg-secondary text-foreground dark:text-foreground', label: 'Archived' },
      bin: { color: 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100', label: 'Bin' }
    };

    const config = statusConfig[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
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
      <DialogContent className="max-w-2xl bg-background border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit {platform} Content</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Make changes to the generated content for {platform}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            defaultValue={content?.content || ''}
            rows={8}
            className="w-full bg-background text-foreground border"
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
        <div className="w-96 bg-card border-r border flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border bg-muted/50">
            <h2 className="text-lg font-semibold text-foreground mb-2">News Items</h2>
            <p className="text-sm text-foreground mb-3">
              Select a news item to generate or view newsjack content
            </p>
            
            {/* Campaign Selection */}
            <div className="mb-3">
              <Select
                value={selectedCampaignID || ''}
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

            {/* Campaign Dossier PDF Button */}
            {selectedCampaign && (
              <div className="mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCampaignDossierPDFExport()}
                  className="w-full flex items-center gap-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                >
                  <FileText className="h-4 w-4" />
                  Campaign Dossier PDF
                </Button>
              </div>
            )}



            {/* Status Filter Buttons */}
            <div className="flex flex-wrap gap-1">
              <button 
                className={`px-2 py-1 text-xs rounded ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border'}`}
                onClick={() => setStatusFilter('all')}
              >
                All
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${statusFilter === 'draft' ? 'bg-yellow-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border'}`}
                onClick={() => setStatusFilter('draft')}
              >
                Draft
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${statusFilter === 'active' ? 'bg-green-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border'}`}
                onClick={() => setStatusFilter('active')}
              >
                Active
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${statusFilter === 'archived' ? 'bg-gray-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border'}`}
                onClick={() => setStatusFilter('archived')}
              >
                Archive
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded ${statusFilter === 'bin' ? 'bg-red-600 text-white' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border'}`}
                onClick={() => setStatusFilter('bin')}
              >
                Bin
              </button>
            </div>

            {/* Bulk Selection Toggle */}
            {filteredItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">Bulk Selection Mode</Label>
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
              <div className="p-6 text-center text-foreground dark:text-foreground">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm">Select a campaign to view news items</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-6 text-center text-foreground dark:text-foreground">
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
                        
                        {/* NewsJack Status Indicator - VERY OBVIOUS VISUAL DISTINCTION */}
                        {getGeneratedPlatforms(item).length > 0 ? (
                          <div className="px-3 py-1 text-xs font-extrabold rounded-full bg-green-500 text-white shadow-xl border-2 border-green-300 ring-2 ring-green-200">
                            ✅ {getGeneratedPlatforms(item).length}xNJ
                          </div>
                        ) : (
                          <div className="px-3 py-1 text-xs font-extrabold rounded-full bg-red-600 text-white shadow-xl border-2 border-yellow-300 ring-2 ring-red-200 animate-pulse">
                            🚨 NEEDS NJ
                          </div>
                        )}
                      </div>
                      
                      {/* Inline Actions */}
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={item.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-foreground dark:text-foreground hover:text-blue-600 dark:hover:text-blue-400"
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
                              className="p-1 text-foreground dark:text-foreground hover:text-green-600 dark:hover:text-green-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNewsJackPDFExport(item.id, item.headline);
                              }}
                            >
                              <File className="h-3 w-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Export NewsJack PDF</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              className="p-1 text-foreground hover:text-yellow-600"
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
                              className="p-1 text-foreground dark:text-foreground hover:text-foreground dark:hover:text-foreground"
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
                              className="p-1 text-foreground dark:text-foreground hover:text-red-600 dark:hover:text-red-400"
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
                        <h4 className="text-sm font-medium text-foreground dark:text-white mb-2 line-clamp-2 leading-tight">
                          {item.headline}
                        </h4>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>{item.headline}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Date and Generation Status */}
                    <div className="flex items-center justify-between text-xs text-foreground dark:text-foreground">
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
        <div className="flex-1 flex flex-col bg-background">
          {!selectedNewsItem ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">👆</div>
                <h3 className="text-xl font-semibold text-foreground dark:text-white mb-2">Select a news item to begin</h3>
                <p className="text-foreground dark:text-foreground">
                  Choose an item from the queue to generate or view NewsJack content
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Header Area */}
              <div className="p-6 border-b border bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-xl font-bold text-foreground dark:text-white mb-2">
                      {selectedNewsItem.headline}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-foreground dark:text-foreground mb-3">
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
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => generateContentMutation.mutate(selectedNewsItem.id)}
                      disabled={generateContentMutation.isPending}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 font-bold text-lg shadow-lg min-h-[3.5rem]"
                    >
                      {generateContentMutation.isPending ? (
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex items-center justify-center gap-3">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            <span>Generating NewsJacks...</span>
                          </div>
                          {Object.keys(generationProgress).length > 0 && (
                            <div className="w-full space-y-1">
                              <div className="flex justify-between text-xs text-white/80">
                                <span>Progress</span>
                                <span>{Math.round((Object.values(generationProgress).filter(Boolean).length / 5) * 100)}%</span>
                              </div>
                              <div className="w-full bg-secondary rounded-full h-1.5">
                                <div 
                                  className="bg-primary h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${(Object.values(generationProgress).filter(Boolean).length / 5) * 100}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-white/70">
                                {Object.entries(generationProgress).map(([platform, completed]) => (
                                  <span key={platform} className={completed ? 'text-green-300 font-semibold' : 'text-white/50'}>
                                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                                    {completed ? ' ✓' : '...'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <Zap className="mr-3 h-5 w-5" />
                          NewsJack Now
                        </>
                      )}
                    </Button>
                    
                    {selectedNewsItem.platformOutputs && Object.keys(selectedNewsItem.platformOutputs).length > 0 && (
                      <Button
                        onClick={() => generateContentMutation.mutate(selectedNewsItem.id)}
                        disabled={generateContentMutation.isPending}
                        variant="outline"
                        size="lg"
                        className="flex items-center gap-2 border-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Regenerate All
                      </Button>
                    )}
                    
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
                            : 'bg-gray-50 dark:bg-gray-800 text-foreground dark:text-foreground hover:bg-gray-100 dark:hover:bg-gray-700 border'
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
                    <div className="text-center max-w-2xl">
                      <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-12 border border-blue-200 dark:border-blue-800">
                        <Zap className="mx-auto h-20 w-20 text-blue-600 dark:text-blue-400 mb-8" />
                        <h2 className="text-3xl font-bold text-foreground dark:text-white mb-4">Ready to NewsJack</h2>
                        <h3 className="text-xl font-medium text-foreground dark:text-foreground mb-6">Transform Breaking News Into Strategic Content</h3>
                        <p className="text-foreground dark:text-foreground mb-8 leading-relaxed text-lg">
                          Apply NewsJack methodology to turn current events into compelling content that drives engagement and conversions across all platforms.
                        </p>
                        
                        <Button
                          onClick={() => generateContentMutation.mutate(selectedNewsItem.id)}
                          disabled={generateContentMutation.isPending}
                          size="lg"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-12 py-4 font-bold text-xl shadow-xl rounded-xl"
                        >
                          {generateContentMutation.isPending ? (
                            <>
                              <RefreshCw className="mr-3 h-6 w-6 animate-spin" />
                              Generating NewsJacks...
                            </>
                          ) : (
                            <>
                              <Zap className="mr-3 h-6 w-6" />
                              NewsJack Now
                            </>
                          )}
                        </Button>
                        
                        {generateContentMutation.isPending && (
                          <div className="mt-8 p-6 bg-card/50 rounded-xl border border-primary/30">
                            <div className="flex items-center justify-center gap-2 mb-4">
                              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              <span className="font-semibold text-blue-600 dark:text-blue-400">Processing: 30-60 seconds</span>
                            </div>
                            <div className="space-y-3 text-sm text-foreground dark:text-foreground">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span>Analyzing news context and relevance...</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                                <span>Applying NewsJack methodology framework...</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span>Generating platform-optimized content...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Content Output Display */}
                    {selectedNewsItem.platformOutputs?.[activeChannel]?.content && (
                      <>
                        {/* Styled Output */}
                        <div className="bg-gray-50 dark:bg-gray-800 border border rounded-lg">
                          <div className="p-4 border-b border bg-secondary">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-foreground dark:text-white capitalize">
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
                            <div className={`bg-background p-6 rounded border leading-relaxed text-foreground ${
                              activeChannel === 'blog' 
                                ? 'text-base whitespace-pre-wrap font-serif max-h-96 overflow-y-auto' 
                                : 'text-sm whitespace-pre-wrap font-mono'
                            }`}>
                              {selectedNewsItem.platformOutputs?.[activeChannel]?.content || 'No content generated yet'}
                            </div>
                          </div>
                        </div>

                        {/* Copy Buttons and SEO Landing Page */}
                        <div className="flex gap-3 flex-wrap">
                          <Button
                            variant="default"
                            onClick={() => {
                              const content = selectedNewsItem.platformOutputs?.[activeChannel];
                              if (content?.content) {
                                const fullContent = `${content.content}\n\nSource: ${selectedNewsItem.sourceUrl}\nCampaign: ${selectedCampaign?.campaignName}${content.hashtags ? '\n\nHashtags: ' + content.hashtags.map((tag: string) => '#' + tag).join(' ') : ''}${content.cta ? '\n\nCTA: ' + content.cta : ''}`;
                                handleCopyToClipboard(fullContent);
                              } else {
                                toast({ title: "No content", description: "Generate content first to copy it.", variant: "destructive" });
                              }
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy All
                          </Button>

                          {/* SEO Landing Page Button for Blog Content */}
                          {activeChannel === 'blog' && (
                            <SeoLandingPageButton 
                              key={`${selectedNewsItem.id}-${selectedNewsItem.platformOutputs.blog?.generatedAt}`}
                              newsjackId={selectedNewsItem.id.toString()}
                              initialStatus={selectedNewsItem.platformOutputs.blog?.landingPageStatus || 'unpublished'}
                              initialUrl={selectedNewsItem.platformOutputs.blog?.landingPageUrl}
                            />
                          )}
                          
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
                              const content = selectedNewsItem.platformOutputs?.[activeChannel];
                              const richText = `**${content?.content || ''}**\n\n${content?.hashtags ? content.hashtags.map((tag: string) => '#' + tag).join(' ') + '\n\n' : ''}${content?.cta ? '*' + content.cta + '*' : ''}`;
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
                              content: selectedNewsItem.platformOutputs?.[activeChannel] || {}
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
                        {selectedNewsItem.platformOutputs?.[activeChannel]?.hashtags && (
                          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Hashtags</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedNewsItem.platformOutputs?.[activeChannel]?.hashtags?.map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Performance Metrics */}
                        {selectedNewsItem.processingTimeSeconds && (
                          <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 border border p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="text-lg">📈</div>
                              <h4 className="text-sm font-semibold text-foreground dark:text-white">Performance Benchmarks</h4>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="text-foreground dark:text-foreground hover:text-foreground dark:hover:text-foreground">
                                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-xs">?</div>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Benchmarks based on industry research and prior NewsGlue human-assisted runs
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-foreground dark:text-foreground">NG Processing Time:</span>
                                  <Badge variant="default" className="bg-green-600 text-white">
                                    {formatTime(selectedNewsItem.processingTimeSeconds)}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-foreground dark:text-foreground">Est. Human Time:</span>
                                  <span className="font-medium text-foreground dark:text-white">
                                    {formatTime(calculateTimeSavings(selectedNewsItem.processingTimeSeconds).humanTime)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-foreground dark:text-foreground">Est. Human + AI Time:</span>
                                  <span className="font-medium text-foreground dark:text-white">
                                    {formatTime(calculateTimeSavings(selectedNewsItem.processingTimeSeconds).humanAiTime)}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-foreground dark:text-foreground">Time Saved (vs Human):</span>
                                  <Badge variant="default" className="bg-blue-600 text-white">
                                    {formatTime(calculateTimeSavings(selectedNewsItem.processingTimeSeconds).humanTimeSaved)}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-foreground dark:text-foreground">Time Saved (vs Human+AI):</span>
                                  <Badge variant="default" className="bg-purple-600 text-white">
                                    {formatTime(calculateTimeSavings(selectedNewsItem.processingTimeSeconds).humanAiTimeSaved)}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-foreground dark:text-foreground">Efficiency Gain:</span>
                                  <Badge variant="default" className="bg-orange-600 text-white">
                                    {Math.round((calculateTimeSavings(selectedNewsItem.processingTimeSeconds).humanTimeSaved / calculateTimeSavings(selectedNewsItem.processingTimeSeconds).humanTime) * 100)}%
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedNewsItem.platformOutputs?.[activeChannel]?.cta && (
                          <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">Call to Action</h4>
                            <p className="text-sm text-green-800 dark:text-green-200">{selectedNewsItem.platformOutputs?.[activeChannel]?.cta}</p>
                            {selectedNewsItem.platformOutputs?.[activeChannel]?.ctaUrl && (
                              <a 
                                href={selectedNewsItem.platformOutputs?.[activeChannel]?.ctaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-sm text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {selectedNewsItem.platformOutputs?.[activeChannel]?.ctaUrl}
                              </a>
                            )}
                          </div>
                        )}

                        {/* Stats Panel */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Content Metrics */}
                          <div className="bg-gray-50 dark:bg-gray-800 border border p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-foreground dark:text-white mb-3">Content Analysis</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground dark:text-foreground">Requested vs. Actual:</span>
                                <span className="font-medium text-foreground dark:text-white">
                                  {activeChannel === 'twitter' ? '280' : 
                                   activeChannel === 'linkedin' ? '3000' : 
                                   activeChannel === 'instagram' ? '2200' : '1000'} / {selectedNewsItem.platformOutputs?.[activeChannel]?.content?.length || 0} chars
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground dark:text-foreground">Word Count:</span>
                                <span className="font-medium text-foreground dark:text-white">{selectedNewsItem.platformOutputs?.[activeChannel]?.content?.split(/\s+/).length || 0} words</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground dark:text-foreground">AI Model:</span>
                                <span className="font-medium text-foreground dark:text-white">GPT-4o</span>
                              </div>
                            </div>
                          </div>

                          {/* Performance Benchmarks */}
                          <div className="bg-gray-50 dark:bg-gray-800 border border p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="text-lg">📈</div>
                              <h4 className="text-sm font-semibold text-foreground dark:text-white">Performance Benchmarks</h4>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button className="text-foreground dark:text-foreground hover:text-foreground dark:hover:text-foreground">
                                    <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-xs">?</div>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs">
                                    Benchmarks for creating content across all 5 platforms (Twitter, LinkedIn, Instagram, Blog, Facebook).
                                    Human baseline: 45 min total. Human+AI: 8 min total.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground dark:text-foreground">NewsGlue Processing (All 5 Platforms):</span>
                                <Badge variant="default" className="bg-green-600 text-white">
                                  {selectedNewsItem.processingTimeSeconds ? 
                                    formatTime(selectedNewsItem.processingTimeSeconds) : 
                                    (selectedNewsItem.generationMetrics?.generationTime ? 
                                      `${Math.round(selectedNewsItem.generationMetrics.generationTime / 1000)}s` : 
                                      '45s'
                                    )
                                  }
                                </Badge>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground dark:text-foreground">Est. Human Time (All 5 Platforms):</span>
                                <span className="font-medium text-foreground dark:text-foreground">45min</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-foreground dark:text-foreground">Est. Human + AI Time (All 5 Platforms):</span>
                                <span className="font-medium text-orange-600 dark:text-orange-400">8min</span>
                              </div>
                              <div className="pt-2 border-t border">
                                <div className="flex justify-between text-sm font-medium">
                                  <span className="text-foreground dark:text-foreground">Speed Improvement:</span>
                                  <div className="flex gap-2">
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                                      {selectedNewsItem.processingTimeSeconds ? 
                                        `${Math.round((45 * 60) / selectedNewsItem.processingTimeSeconds)}X vs Human` :
                                        '60X vs Human'
                                      }
                                    </Badge>
                                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                                      {selectedNewsItem.processingTimeSeconds ? 
                                        `${Math.round((8 * 60) / selectedNewsItem.processingTimeSeconds)}X vs Human+AI` :
                                        '11X vs Human+AI'
                                      }
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* NewsJack Quality Metrics */}
                        {selectedNewsItem.platformOutputs?.[activeChannel]?.metrics && (
                          <div className="bg-purple-50 dark:bg-purple-900/50 border border-purple-200 dark:border-purple-600 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-3">NewsJack Quality Analysis</h4>
                            <div className="grid grid-cols-2 gap-6">
                              <div className="text-center bg-card p-4 rounded-lg border border-orange-500/30">
                                <div className="text-3xl font-bold text-orange-600 dark:text-orange-300 mb-1">
                                  {selectedNewsItem.platformOutputs?.[activeChannel]?.metrics?.newsPercentage || 0}%
                                </div>
                                <div className="text-sm text-foreground dark:text-foreground font-medium">News Focus</div>
                                <div className="w-full bg-secondary rounded-full h-3 mt-2">
                                  <div 
                                    className="bg-orange-500 dark:bg-orange-400 h-3 rounded-full transition-all" 
                                    style={{ width: `${selectedNewsItem.platformOutputs?.[activeChannel]?.metrics?.newsPercentage || 0}%` }}
                                  ></div>
                                </div>
                              </div>
                              <div className="text-center bg-card p-4 rounded-lg border border-purple-500/30">
                                <div className="text-3xl font-bold text-purple-600 dark:text-purple-300 mb-1">
                                  {selectedNewsItem.platformOutputs?.[activeChannel]?.metrics?.campaignPercentage || 0}%
                                </div>
                                <div className="text-sm text-foreground dark:text-foreground font-medium">Campaign Focus</div>
                                <div className="w-full bg-secondary rounded-full h-3 mt-2">
                                  <div 
                                    className="bg-purple-500 dark:bg-purple-400 h-3 rounded-full transition-all" 
                                    style={{ width: `${selectedNewsItem.platformOutputs?.[activeChannel]?.metrics?.campaignPercentage || 0}%` }}
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