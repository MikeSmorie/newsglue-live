import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send, ChevronRight, Plus, Loader2, Edit, Trash2, CheckSquare, Square } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCampaign } from '@/contexts/campaign-context';

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
  createdAt: string;
  updatedAt: string;
}

interface NewsSubmission {
  campaignId: string;
  headline: string;
  sourceUrl: string;
  content: string;
  type: 'external' | 'internal';
}

export default function Module3() {
  const { selectedCampaign } = useCampaign();
  
  // CAMPAIGN ISOLATION GUARD - Block access without campaign selection
  if (!selectedCampaign) {
    console.log('❌ [MODULE 3] Campaign guard triggered - redirecting to campaign selection');
    // Force redirect to campaign selection
    window.location.href = '/';
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Redirecting to campaign selection...</p>
      </div>
    );
  }
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
  const [formData, setFormData] = useState<NewsSubmission>({
    campaignId: '',
    headline: '',
    sourceUrl: '',
    content: '',
    type: 'external'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update news item mutation
  const updateNewsMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<NewsSubmission> }) => {
      const response = await fetch(`/api/news-items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update news item');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-items', selectedCampaign?.id] });
      toast({
        title: "News Updated",
        description: "Your news item has been updated successfully.",
        variant: "default"
      });
      setEditingItem(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Delete news item mutation
  const deleteNewsMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/news-items/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete news item');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-items', selectedCampaign?.id] });
      toast({
        title: "News Deleted",
        description: "News item has been deleted successfully.",
        variant: "default"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (itemIds: number[]) => {
      const response = await fetch('/api/news-items/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemIds })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete news items');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-items', selectedCampaign?.id] });
      toast({
        title: "Items Deleted",
        description: `Successfully deleted ${data.deletedCount} news items.`,
        variant: "default"
      });
      setSelectedItems([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Bulk Delete Failed",
        description: error.message,
        variant: "destructive"
      });
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

  // Fetch news items for selected campaign
  const { data: newsItems = [], refetch: refetchNewsItems } = useQuery<NewsItem[]>({
    queryKey: ['news-items', selectedCampaign?.id],
    queryFn: async () => {
      if (!selectedCampaign?.id) return [];
      const res = await fetch(`/api/news-items/${selectedCampaign.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch news items');
      const data = await res.json();
      return data.newsItems || [];
    },
    enabled: !!selectedCampaign?.id
  });

  // Submit news item mutation
  const submitMutation = useMutation({
    mutationFn: async (data: NewsSubmission) => {
      const res = await fetch('/api/news-items/manual-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit news item');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'News Item Queued',
        description: '✅ News item queued for execution in Module 6'
      });
      
      // Reset form
      setFormData({
        campaignId: selectedCampaign?.id || '',
        headline: '',
        sourceUrl: '',
        content: '',
        type: 'external'
      });
      
      // Close form and refresh news items
      setIsFormOpen(false);
      refetchNewsItems();
    },
    onError: (error) => {
      toast({
        title: 'Submission Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Initialize form data with selected campaign
  useEffect(() => {
    if (selectedCampaign) {
      setFormData(prev => ({ ...prev, campaignId: selectedCampaign.id }));
    }
  }, [selectedCampaign]);

  // Update form campaign ID when selected campaign changes
  useEffect(() => {
    if (selectedCampaign) {
      setFormData(prev => ({ ...prev, campaignId: selectedCampaign.id }));
    }
  }, [selectedCampaign]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.headline.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Headline is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (!formData.sourceUrl.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Source URL is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (!formData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Content is required',
        variant: 'destructive'
      });
      return;
    }

    if (editingItem) {
      updateNewsMutation.mutate({ 
        id: editingItem.id, 
        data: formData 
      });
    } else {
      submitMutation.mutate(formData);
    }
  };

  const handleEdit = (item: NewsItem) => {
    setEditingItem(item);
    setFormData({
      campaignId: item.campaignId,
      headline: item.headline,
      sourceUrl: item.sourceUrl,
      content: item.content,
      type: item.contentType
    });
    setIsFormOpen(true);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormData({
      campaignId: selectedCampaign?.id || '',
      headline: '',
      sourceUrl: '',
      content: '',
      type: 'external'
    });
    setIsFormOpen(false);
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(newsItems.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    bulkDeleteMutation.mutate(selectedItems);
  };

  const getStatusBadge = (status: NewsItem['status']) => {
    const statusConfig = {
      draft: { color: 'bg-yellow-100 text-yellow-800', label: 'Draft' },
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      archived: { color: 'bg-gray-100 text-foreground', label: 'Archived' },
      bin: { color: 'bg-red-100 text-red-800', label: 'Bin' }
    };

    const config = statusConfig[status];
    if (!config) {
      return (
        <Badge className="bg-gray-100 text-foreground border-0">
          Unknown
        </Badge>
      );
    }
    
    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const getStatusTooltip = (status: NewsItem['status']) => {
    const tooltips = {
      draft: 'News item is queued and waiting for processing',
      active: 'News item is active and ready for content generation',
      archived: 'News item has been archived',
      bin: 'News item has been moved to bin'
    };
    return tooltips[status] || 'Unknown status';
  };

  const handleGoToModule6 = () => {
    window.location.href = '/module/6';
  };

  if (!selectedCampaign) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>3 User Inputted News</CardTitle>
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
          <h1 className="text-2xl font-bold">3 User Inputted News</h1>
          <p className="text-muted-foreground">Submit news content directly to Module 6 execution queue</p>
        </div>
        
        {campaigns.length > 1 && (
          <Select
            value={selectedCampaign.id}
            onValueChange={(campaignId) => {
              // Campaign selection is now handled by the campaign context
              // This dropdown is read-only for display purposes
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

      {/* News Submission Form */}
      <Card>
        <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add News Item
                  </CardTitle>
                  <CardDescription>
                    Submit news content for {selectedCampaign.campaignName}
                  </CardDescription>
                </div>
                <ChevronRight className={`h-5 w-5 transition-transform ${isFormOpen ? 'rotate-90' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline *</Label>
                  <Input
                    id="headline"
                    value={formData.headline}
                    onChange={(e) => setFormData(prev => ({ ...prev, headline: e.target.value }))}
                    placeholder="Enter news headline"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Source URL *</Label>
                  <Input
                    id="sourceUrl"
                    type="url"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                    placeholder="https://example.com/news-article"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Paste or type the news content here..."
                    rows={6}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>Content Type</Label>
                  <RadioGroup
                    value={formData.type}
                    onValueChange={(value: 'external' | 'internal') => 
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                    className="flex gap-6"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="external" id="external" />
                      <Label htmlFor="external">External News</Label>
                      <span className="text-xs text-muted-foreground">(NewsJack from external source)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="internal" id="internal" />
                      <Label htmlFor="internal">Internal Post</Label>
                      <span className="text-xs text-muted-foreground">(Direct campaign content)</span>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={submitMutation.isPending || updateNewsMutation.isPending}
                    className="flex-1"
                  >
                    {(submitMutation.isPending || updateNewsMutation.isPending) ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {editingItem ? 'Update News Item' : 'Send to Module 6'}
                  </Button>
                  
                  {editingItem ? (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleGoToModule6}
                    >
                      <ChevronRight className="mr-2 h-4 w-4" />
                      Go to Module 6
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* News Items Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle>Module 6 Queue Status</CardTitle>
          <CardDescription>
            News items submitted for execution in {selectedCampaign.campaignName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {newsItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No news items submitted yet</p>
              <p className="text-sm">Use the form above to add your first news item</p>
            </div>
          ) : (
            <TooltipProvider>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-foreground">📰 News Items Queue ({newsItems.length})</h4>
                  <div className="flex gap-2">
                    {selectedItems.length > 0 && (
                      <Button
                        onClick={handleBulkDelete}
                        size="sm"
                        variant="destructive"
                        disabled={bulkDeleteMutation.isPending}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        Delete Selected ({selectedItems.length})
                      </Button>
                    )}
                  </div>
                </div>

                {/* Select All Checkbox */}
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={selectedItems.length === newsItems.length && newsItems.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="text-sm text-foreground">
                    Select all items
                  </Label>
                </div>

                {/* News Items List */}
                <div className="space-y-3">
                  {newsItems.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                          className="mt-1"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-medium text-sm text-foreground truncate pr-2">{item.headline}</h5>
                            <div className="flex items-center gap-2">
                              <Tooltip>
                                <TooltipTrigger>
                                  {getStatusBadge(item.status)}
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{getStatusTooltip(item.status)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                          
                          <p className="text-xs text-foreground mb-3 line-clamp-2">{item.content}</p>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-4 text-xs text-foreground">
                              <span className="capitalize">{item.contentType} content</span>
                              <span>{new Date(item.createdAt).toLocaleString()}</span>
                            </div>
                            
                            <div className="flex gap-1">
                              <Button
                                onClick={() => handleEdit(item)}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                onClick={() => deleteNewsMutation.mutate(item.id)}
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-red-600 hover:text-red-700"
                                disabled={deleteNewsMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button 
                  onClick={handleGoToModule6}
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Review in Module 6
                </Button>
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}