import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription 
} from '@/components/ui/form';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  HelpCircle, 
  Target, 
  Globe, 
  Heart, 
  Users, 
  FileText,
  Lightbulb,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import SimplePlatformSelector from './SimplePlatformSelector';

const campaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100, 'Campaign name must be under 100 characters'),
  website_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  cta_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  emotional_objective: z.string().min(1, 'Please provide emotional objective').max(1000, 'Must be under 1000 characters'),
  audience_pain: z.string().min(1, 'Please provide audience pain points').max(1000, 'Must be under 1000 characters'),
  additional_data: z.string().max(5000, 'Must be under 5000 characters').optional(),
  platforms: z.array(z.string()).min(1, 'Select at least one platform'),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

interface CampaignFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editingCampaign?: any;
}

export default function CampaignForm({ onSuccess, onCancel, editingCampaign }: CampaignFormProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scrapedData, setScrapedData] = useState<any>(null);
  const [isScrapingWebsite, setIsScrapingWebsite] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load existing platform selections when editing
  React.useEffect(() => {
    if (editingCampaign?.channels) {
      const platforms = editingCampaign.channels.map((ch: any) => ch.platform);
      setSelectedPlatforms(platforms);
    }
  }, [editingCampaign]);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: editingCampaign?.campaignName || '',
      website_url: editingCampaign?.websiteUrl || '',
      cta_url: editingCampaign?.ctaUrl || '',
      emotional_objective: editingCampaign?.emotionalObjective || '',
      audience_pain: editingCampaign?.audiencePain || '',
      additional_data: editingCampaign?.additionalData || '',
      platforms: [],
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const url = editingCampaign ? `/api/campaigns/${editingCampaign.id}` : '/api/campaigns';
      const method = editingCampaign ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to save campaign');
      }
      
      return res.json();
    },
    onSuccess: async (campaign) => {
      // Save channel selections
      if (selectedPlatforms.length > 0) {
        await fetch('/api/campaign-channels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            campaignId: campaign.id,
            platforms: selectedPlatforms,
          }),
        });
      }

      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: editingCampaign ? 'Campaign Updated' : 'Campaign Created',
        description: `${campaign.campaignName} has been ${editingCampaign ? 'updated' : 'created'} successfully.`,
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

  const handleWebsiteScrape = async (url: string) => {
    if (!url || url === '') return;
    
    setIsScrapingWebsite(true);
    try {
      const response = await fetch('/api/website-scraper/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape website');
      }

      const data = await response.json();
      setScrapedData(data);
      
      toast({
        title: 'Website Analyzed',
        description: `Successfully extracted content from ${new URL(url).hostname}`,
      });
    } catch (error) {
      toast({
        title: 'Scraping Failed',
        description: 'Could not analyze the website. Please check the URL and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsScrapingWebsite(false);
    }
  };

  const onSubmit = (data: CampaignFormData) => {
    createMutation.mutate({
      ...data,
      platforms: selectedPlatforms,
    });
  };

  const TooltipWrapper = ({ children, content }: { children: React.ReactNode; content: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {editingCampaign ? 'Edit Campaign' : 'Create NewsJack Campaign'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Build emotion-driven content that connects trending news with your brand message
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Campaign Basics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Campaign Basics
              </CardTitle>
              <CardDescription>
                Set up your campaign foundation with clear naming and targeting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Campaign Name
                      <TooltipWrapper content="Choose a descriptive name that helps you identify this campaign's purpose. This is for your internal use only.">
                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipWrapper>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Q1 Product Launch NewsJack" {...field} />
                    </FormControl>
                    <FormDescription>
                      This helps you organize and identify your campaigns
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Website URL
                        <TooltipWrapper content="Your main website or landing page. AI will analyze this to understand your brand context for better content generation.">
                          <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                        </TooltipWrapper>
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input placeholder="https://yourwebsite.com" {...field} />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => field.value && handleWebsiteScrape(field.value)}
                            disabled={!field.value || isScrapingWebsite}
                            className="whitespace-nowrap"
                          >
                            {isScrapingWebsite ? 'Analyzing...' : 'Analyze Site'}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cta_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Call-to-Action URL
                        <TooltipWrapper content="Where you want to drive traffic (product page, signup, etc.). This will be integrated into your NewsJack content suggestions.">
                          <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                        </TooltipWrapper>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="https://yourwebsite.com/signup" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Website Analysis Results */}
          {scrapedData && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Globe className="h-5 w-5" />
                  Website Analysis Results
                </CardTitle>
                <CardDescription>
                  AI has extracted key information from your website to enhance content generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-semibold">Page Title</Label>
                    <p className="text-gray-600 dark:text-gray-300">{scrapedData.title}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Meta Description</Label>
                    <p className="text-gray-600 dark:text-gray-300">{scrapedData.description}</p>
                  </div>
                </div>
                
                {scrapedData.keywords?.length > 0 && (
                  <div>
                    <Label className="font-semibold">Keywords Found</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {scrapedData.keywords.slice(0, 10).map((keyword: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label className="font-semibold">Content Preview</Label>
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded text-xs max-h-32 overflow-y-auto">
                    {scrapedData.contentPreview}
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Analyzed on {new Date(scrapedData.scrapedAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* NewsJack Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-red-500" />
                NewsJack Emotional Strategy
              </CardTitle>
              <CardDescription>
                Define the emotional connection between trending news and your audience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="emotional_objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Emotional Objective
                      <TooltipWrapper content="What emotion do you want to evoke when connecting news to your brand? Examples: excitement about innovation, relief from pain points, urgency for action, hope for the future.">
                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipWrapper>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., Create excitement about how our AI solution helps businesses stay ahead of technological disruption, making them feel empowered and future-ready..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Be specific about the emotional journey you want to create
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="audience_pain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Audience Pain Points
                      <TooltipWrapper content="What specific problems, fears, or challenges does your audience face that trending news might amplify or relate to? This helps connect news events to your solution.">
                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipWrapper>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="e.g., Small business owners fear being left behind by rapid technological changes, struggle with manual processes, worry about competitors gaining advantages..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Focus on emotional triggers that news events might activate
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Distribution Platforms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Content Distribution
              </CardTitle>
              <CardDescription>
                Choose platforms where your NewsJack content will be published
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  Select Platforms
                  <TooltipWrapper content="Choose platforms where you'll publish your NewsJack content. Each platform has different content styles and requirements that our AI will adapt to.">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipWrapper>
                </Label>
                <SimplePlatformSelector
                  selectedPlatforms={selectedPlatforms}
                  onSelectionChange={setSelectedPlatforms}
                />
                {selectedPlatforms.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedPlatforms.map((platform) => (
                      <Badge key={platform} variant="secondary">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Context */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Additional Context & Brand Intelligence
              </CardTitle>
              <CardDescription>
                Provide detailed information to enhance AI content generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="additional_data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      Brand Voice, Context & Campaign Details
                      <TooltipWrapper content="Paste detailed briefing documents, brand guidelines, product information, target audience insights, competitor analysis, or any relevant campaign materials. The more context you provide, the better the AI can tailor NewsJack content to your specific needs.">
                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipWrapper>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Paste your campaign brief, brand guidelines, target audience details, product information, competitor analysis, or any relevant documentation here.

Example content:
- Brand voice and personality guidelines
- Product/service detailed descriptions  
- Target audience demographics and psychographics
- Key messaging frameworks
- Competitor positioning
- Industry trends and insights
- Previous campaign performance data
- Customer testimonials and case studies
- Technical specifications or unique selling propositions"
                        className="min-h-[200px] font-mono text-sm"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      <strong>Tip:</strong> Copy and paste from documents, spreadsheets, or briefing materials. 
                      The AI will analyze this information to create more targeted and relevant NewsJack content.
                      Maximum 5,000 characters.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* File Upload Placeholder for Future Implementation */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">File Upload Coming Soon</p>
                  <p className="text-xs">Future: Upload PDFs, Word docs, or text files for automatic content extraction</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Form Actions */}
          <div className="flex justify-between items-center pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || selectedPlatforms.length === 0}
              className="min-w-[120px]"
            >
              {createMutation.isPending 
                ? 'Saving...' 
                : editingCampaign 
                ? 'Update Campaign' 
                : 'Create Campaign'
              }
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}