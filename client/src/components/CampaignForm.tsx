// [CAMPAIGN FORM COMPONENT] - NewsJack methodology focused
import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import SocialChannelsSelector from './SocialChannelsSelector';

export default function CampaignForm() {
  const { register, handleSubmit, reset } = useForm();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const handlePlatformChange = useCallback((platforms: string[]) => {
    setSelectedPlatforms(platforms);
  }, []);

  const mutation = useMutation({
    mutationFn: async (data) => {
      // First create the campaign
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create campaign');
      const campaign = await res.json();

      // Then update the campaign channels if platforms are selected
      if (selectedPlatforms.length > 0) {
        const channelRes = await fetch(`/api/campaign-channels/${campaign.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ platforms: selectedPlatforms }),
        });
        if (!channelRes.ok) {
          console.warn('Failed to save campaign channels');
        }
      }

      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({ title: 'Campaign Created', description: 'Your NewsJack campaign and social platforms have been saved.' });
      reset();
      setSelectedPlatforms([]);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to save campaign.', variant: 'destructive' });
    },
  });

  const onSubmit = (data: any) => {
    console.log('NewsJack campaign data:', data);
    mutation.mutate(data);
  };

  return (
    <TooltipProvider>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">
            Campaign Name
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="inline h-4 w-4 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                The internal name for this campaign. Choose something short and recognizable.
              </TooltipContent>
            </Tooltip>
          </Label>
          <Input id="name" {...register('name')} required />
        </div>

        <div>
          <Label htmlFor="url">
            Website URL
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="inline h-4 w-4 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Paste the company's homepage or About page. We'll scrape it for key context.
              </TooltipContent>
            </Tooltip>
          </Label>
          <Input id="url" {...register('website_url')} required />
        </div>

        <div>
          <Label htmlFor="cta_url">
            CTA URL
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="inline h-4 w-4 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Where should news-driven traffic be sent? Paste a product or landing page URL.
              </TooltipContent>
            </Tooltip>
          </Label>
          <Input id="cta_url" {...register('cta_url')} />
        </div>

        <div>
          <Label htmlFor="emotionalObjective">
            Emotional Campaign Objective
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="inline h-4 w-4 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                What emotional response should the audience feel? E.g. urgency, hope, outrage, safety, belonging.
              </TooltipContent>
            </Tooltip>
          </Label>
          <Input id="emotionalObjective" {...register('emotional_objective')} />
        </div>

        <div>
          <Label htmlFor="painPoint">
            Pain-Focused Audience Description
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="inline h-4 w-4 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Describe your audience's current pain, fear, frustration, or unmet need.
              </TooltipContent>
            </Tooltip>
          </Label>
          <Textarea id="painPoint" {...register('audience_pain')} />
        </div>

        <div>
          <Label htmlFor="additionalData">
            Additional Data
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="inline h-4 w-4 ml-1 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Any extra context (mission, competitors, tone, etc) useful for tailoring your campaign.
              </TooltipContent>
            </Tooltip>
          </Label>
          <Textarea id="additionalData" {...register('additional_data')} />
        </div>

        <div className="border-t pt-4">
          <SocialChannelsSelector
            selectedPlatforms={selectedPlatforms}
            onSelectionChange={handlePlatformChange}
            disabled={mutation.isPending}
          />
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving Campaign & Platforms...' : 'Save Campaign'}
        </Button>
      </form>
    </TooltipProvider>
  );
}