import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, HelpCircle } from 'lucide-react';

interface CampaignFormData {
  campaignName: string;
  campaignUrl: string;
  websiteUrl: string;
  additionalData: string;
  tone: string;
  strategy_q1: string;
  strategy_q2: string;
  strategy_q3: string;
  strategy_q4: string;
  strategy_q5: string;
}

// Tooltip content for form fields
const tooltips = {
  campaignName: "Enter a short, memorable name for this campaign (used internally only).",
  campaignUrl: "Paste the URL users should be sent to when they click on your NewsJack (e.g. product, signup, landing page).",
  websiteUrl: "Enter the homepage or About URL of the company. The system will scrape this for brand insights.",
  additionalData: "Upload documents or enter extended notes to help AI understand the brand, product, or tone.",
  autoPopulate: "Click to auto-fill campaign data using content from the Website URL and uploaded documents.",
  tone: "Select the brand archetype to shape tone. Examples: Sage (educational), Rebel (challenging), Hero (bold).",
  strategy_q1: "What is the core objective? Examples: drive trial signups, spark conversation, position as thought leader.",
  strategy_q2: "Describe the audience this campaign speaks to. Include traits, pains, desires (e.g. 'Tech founders under 35').",
  strategy_q3: "Highlight why this solution stands out. What is your unfair advantage or market wedge?",
  strategy_q4: "What do you want the reader to feel? (e.g., urgency, curiosity, outrage, validation, hope).",
  strategy_q5: "Skip this if not relevant. Timeline is optional and typically unused for fast-moving news cycles."
};

const toneOptions = [
  { value: 'sage', label: 'Sage', description: 'Educational, wise, and informative - positions as expert and teacher' },
  { value: 'rebel', label: 'Rebel', description: 'Challenging status quo, disruptive - appeals to those wanting change' },
  { value: 'hero', label: 'Hero', description: 'Bold, courageous, determined - inspires action and overcoming challenges' },
  { value: 'innocent', label: 'Innocent', description: 'Pure, optimistic, honest - builds trust through simplicity and goodness' },
  { value: 'explorer', label: 'Explorer', description: 'Adventurous, pioneering, freedom-seeking - appeals to discovery and independence' },
  { value: 'creator', label: 'Creator', description: 'Imaginative, artistic, innovative - appeals to self-expression and creativity' },
  { value: 'ruler', label: 'Ruler', description: 'Authoritative, responsible, leadership-focused - appeals to control and success' },
  { value: 'magician', label: 'Magician', description: 'Transformative, visionary, mysterious - promises extraordinary results' },
  { value: 'lover', label: 'Lover', description: 'Passionate, intimate, devoted - appeals to relationships and experiences' },
  { value: 'caregiver', label: 'Caregiver', description: 'Nurturing, generous, compassionate - focuses on helping and protecting others' },
  { value: 'jester', label: 'Jester', description: 'Fun, lighthearted, playful - brings joy and doesn\'t take itself too seriously' },
  { value: 'everyman', label: 'Everyman', description: 'Relatable, down-to-earth, authentic - appeals to belonging and common values' },
];

export default function CampaignForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CampaignFormData>({
    campaignName: '',
    campaignUrl: '',
    websiteUrl: '',
    additionalData: '',
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
        websiteUrl: '',
        additionalData: '',
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
    <TooltipProvider>
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="campaignName">Campaign Name *</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.campaignName}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="campaignName"
                  placeholder="Enter campaign name"
                  value={formData.campaignName}
                  onChange={(e) => handleInputChange('campaignName', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="campaignUrl">Campaign URL</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.campaignUrl}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
              <div className="flex items-center gap-2">
                <Label htmlFor="websiteUrl">Website URL (for scraping)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{tooltips.websiteUrl}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://company.com"
                value={formData.websiteUrl}
                onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="additionalData">Additional Campaign Data</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{tooltips.additionalData}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="additionalData"
                placeholder="Upload documents or enter extended notes..."
                value={formData.additionalData}
                onChange={(e) => handleInputChange('additionalData', e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="outline" className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4" />
                    Auto-Populate (AI Scrape)
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltips.autoPopulate}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="tone">Brand Voice/Tone Archetype</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{tooltips.tone}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Select value={formData.tone} onValueChange={(value) => handleInputChange('tone', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand voice archetype" />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="strategy_q1">Primary Business Goal</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.strategy_q1}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  id="strategy_q1"
                  placeholder="What is the core objective? Examples: drive trial signups, spark conversation..."
                  value={formData.strategy_q1}
                  onChange={(e) => handleInputChange('strategy_q1', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="strategy_q2">Target Audience</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.strategy_q2}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  id="strategy_q2"
                  placeholder="Describe the audience this campaign speaks to..."
                  value={formData.strategy_q2}
                  onChange={(e) => handleInputChange('strategy_q2', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="strategy_q3">What makes your product/service unique?</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.strategy_q3}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  id="strategy_q3"
                  placeholder="Highlight your unique value proposition and differentiators..."
                  value={formData.strategy_q3}
                  onChange={(e) => handleInputChange('strategy_q3', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="strategy_q4">What emotional response do you want?</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.strategy_q4}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  id="strategy_q4"
                  placeholder="What do you want the reader to feel? (e.g., urgency, curiosity, validation...)"
                  value={formData.strategy_q4}
                  onChange={(e) => handleInputChange('strategy_q4', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="strategy_q5">Timeline</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{tooltips.strategy_q5}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  id="strategy_q5"
                  placeholder="Optional - Specify campaign duration and key milestones..."
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
    </TooltipProvider>
  );
}