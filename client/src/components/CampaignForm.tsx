import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface CampaignFormData {
  campaignName: string;
  campaignUrl: string;
  tone: string;
  strategy_q1: string;
  strategy_q2: string;
  strategy_q3: string;
  strategy_q4: string;
  strategy_q5: string;
}

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'casual', label: 'Casual' },
  { value: 'innovative', label: 'Innovative' },
  { value: 'trustworthy', label: 'Trustworthy' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'sophisticated', label: 'Sophisticated' },
];

export default function CampaignForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CampaignFormData>({
    campaignName: '',
    campaignUrl: '',
    tone: '',
    strategy_q1: '',
    strategy_q2: '',
    strategy_q3: '',
    strategy_q4: '',
    strategy_q5: '',
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create campaign');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Campaign created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      // Reset form
      setFormData({
        campaignName: '',
        campaignUrl: '',
        tone: '',
        strategy_q1: '',
        strategy_q2: '',
        strategy_q3: '',
        strategy_q4: '',
        strategy_q5: '',
      });

      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCampaignMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof CampaignFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Campaign</CardTitle>
        <CardDescription>
          Define your campaign strategy and brand voice for targeted content generation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign Name *</Label>
              <Input
                id="campaignName"
                placeholder="Enter campaign name"
                value={formData.campaignName}
                onChange={(e) => handleInputChange('campaignName', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaignUrl">Campaign URL</Label>
              <Input
                id="campaignUrl"
                type="url"
                placeholder="https://example.com"
                value={formData.campaignUrl}
                onChange={(e) => handleInputChange('campaignUrl', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Brand Voice/Tone</Label>
            <Select value={formData.tone} onValueChange={(value) => handleInputChange('tone', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select brand voice archetype" />
              </SelectTrigger>
              <SelectContent>
                {toneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="strategy_q1">What is your primary business goal?</Label>
              <Textarea
                id="strategy_q1"
                placeholder="Describe your main business objective for this campaign"
                value={formData.strategy_q1}
                onChange={(e) => handleInputChange('strategy_q1', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy_q2">Who is your target audience?</Label>
              <Textarea
                id="strategy_q2"
                placeholder="Define your ideal customer profile and demographics"
                value={formData.strategy_q2}
                onChange={(e) => handleInputChange('strategy_q2', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy_q3">What makes your product/service unique?</Label>
              <Textarea
                id="strategy_q3"
                placeholder="Highlight your unique value proposition and differentiators"
                value={formData.strategy_q3}
                onChange={(e) => handleInputChange('strategy_q3', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy_q4">What is your desired outcome?</Label>
              <Textarea
                id="strategy_q4"
                placeholder="Define success metrics and expected results"
                value={formData.strategy_q4}
                onChange={(e) => handleInputChange('strategy_q4', e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy_q5">What is your timeline?</Label>
              <Textarea
                id="strategy_q5"
                placeholder="Specify campaign duration and key milestones"
                value={formData.strategy_q5}
                onChange={(e) => handleInputChange('strategy_q5', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={createCampaignMutation.isPending || !formData.campaignName.trim()}
          >
            {createCampaignMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Campaign
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}