import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Send, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

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
  status: string;
  createdAt: string;
}

interface NewsSubmission {
  campaignId: string;
  headline: string;
  sourceUrl: string;
  content: string;
  type: 'external' | 'internal';
}

export default function Module3() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<NewsSubmission>({
    campaignId: '',
    headline: '',
    sourceUrl: '',
    content: '',
    type: 'external'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Initialize with first campaign
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaign) {
      const campaign = campaigns[0];
      setSelectedCampaign(campaign);
      setFormData(prev => ({ ...prev, campaignId: campaign.id }));
    }
  }, [campaigns, selectedCampaign]);

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

    submitMutation.mutate(formData);
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
              const campaign = campaigns.find(c => c.id === campaignId);
              if (campaign) setSelectedCampaign(campaign);
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
                    disabled={submitMutation.isPending}
                    className="flex-1"
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Send to Module 6
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGoToModule6}
                  >
                    <ChevronRight className="mr-2 h-4 w-4" />
                    Go to Module 6
                  </Button>
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
            <div className="space-y-3">
              {newsItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.headline}</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleDateString()} • {item.contentType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      item.status === 'draft' ? 'secondary' :
                      item.status === 'processing' ? 'default' :
                      item.status === 'completed' ? 'default' : 'destructive'
                    }>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}