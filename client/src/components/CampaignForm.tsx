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
  website_url: z.string().optional().or(z.literal('')),
  cta_url: z.string().optional().or(z.literal('')),
  emotional_objective: z.string().optional(),
  audience_pain: z.string().optional(),
  additional_data: z.string().optional(),
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

  // Load existing platform selections and website analysis when editing
  React.useEffect(() => {
    if (editingCampaign?.channels) {
      const platforms = editingCampaign.channels.map((ch: any) => ch.platform);
      setSelectedPlatforms(platforms);
    }
    
    // Load saved website analysis data
    if (editingCampaign?.websiteAnalysis) {
      try {
        const parsedData = JSON.parse(editingCampaign.websiteAnalysis);
        setScrapedData(parsedData);
      } catch (error) {
        console.log('Could not parse website analysis data:', error);
      }
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
      
      console.log('Making API request:', { url, method, data });
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      
      console.log('API response status:', res.status);
      
      if (!res.ok) {
        const error = await res.json();
        console.error('API error response:', error);
        throw new Error(error.message || 'Failed to save campaign');
      }
      
      const result = await res.json();
      console.log('API success response:', result);
      return result;
    },
    onSuccess: async (campaign) => {
      console.log('Campaign save successful:', campaign);
      
      // Save channel selections
      if (selectedPlatforms.length > 0) {
        try {
          await fetch('/api/campaign-channels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              campaignId: campaign.id,
              platforms: selectedPlatforms,
            }),
          });
          console.log('Channels saved successfully');
        } catch (error) {
          console.error('Error saving channels:', error);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      toast({
        title: editingCampaign ? 'Campaign Updated Successfully' : 'Campaign Created Successfully',
        description: `${campaign.campaignName} has been ${editingCampaign ? 'updated' : 'created'} and will now appear in your campaign list.`,
      });
      
      console.log('Calling onSuccess callback');
      
      // Force navigation back to campaigns
      setTimeout(() => {
        onSuccess?.();
      }, 100);
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
      
      // Automatically append scraped content to the additional_data field
      const currentAdditionalData = form.getValues('additional_data') || '';
      const websiteAnalysis = `\n\n=== Website Analysis ===\nURL: ${url}\nTitle: ${data.title || 'N/A'}\nDescription: ${data.description || 'N/A'}\nContent Summary: ${data.content || 'N/A'}`;
      
      form.setValue('additional_data', currentAdditionalData + websiteAnalysis);
      
      toast({
        title: 'Website Analyzed',
        description: `Successfully extracted content from ${new URL(url).hostname} and added to campaign data`,
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
    console.log('=== FORM SUBMISSION STARTED ===');
    console.log('Form data:', data);
    console.log('Selected platforms:', selectedPlatforms);
    console.log('Editing campaign:', editingCampaign);
    console.log('Is editing mode:', !!editingCampaign);
    
    const submitData = {
      ...data,
      platforms: selectedPlatforms,
    };
    
    console.log('Final submit data:', submitData);
    createMutation.mutate(submitData);
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
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {editingCampaign ? 'Edit Campaign' : 'Create NewsJack Campaign'}
        </h1>
        <p className="text-foreground">
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
                    <p className="text-foreground">{scrapedData.title}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Meta Description</Label>
                    <p className="text-foreground">{scrapedData.description}</p>
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

          {/* Additional Context & Bulk Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Campaign Intelligence & Bulk Information
              </CardTitle>
              <CardDescription>
                Paste detailed campaign information, briefing documents, or upload files for AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bulk Information Input */}
              <FormField
                control={form.control}
                name="additional_data"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-base font-semibold">
                      <FileText className="h-4 w-4" />
                      Bulk Campaign Information
                      <TooltipWrapper content="Paste any amount of detailed information about your campaign, brand, target audience, competitors, or strategic context. The AI will process all this information to create highly targeted NewsJack content.">
                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                      </TooltipWrapper>
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Paste comprehensive campaign information here - no limits on length or format:

• Campaign briefs and strategy documents
• Brand guidelines and voice documentation  
• Product/service detailed specifications
• Target audience research and personas
• Competitor analysis and market research
• Previous campaign data and performance metrics
• Customer testimonials and case studies
• Industry trends and market insights
• Key messaging frameworks and positioning
• Technical documentation and features
• Pricing strategies and value propositions
• Distribution channels and partnerships
• Stakeholder information and requirements
• Budget considerations and constraints
• Timeline and milestone requirements
• Legal and compliance requirements
• Any other relevant business context

The more detail you provide, the better the AI can create targeted NewsJack content that resonates with your specific audience and objectives."
                        className="min-h-[300px] font-mono text-sm resize-y"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-sm space-y-1">
                        <div><strong>Pro Tip:</strong> Paste entire documents, research reports, or briefing materials directly into this field.</div>
                        <div><strong>Data Sources:</strong> Copy from PDFs, Word docs, spreadsheets, research reports, or any text-based materials.</div>
                        <div><strong>Usage:</strong> AI will analyze all this context to create highly personalized NewsJack content strategies.</div>
                        <div className="text-xs text-gray-500">No character limit - paste as much relevant information as you have available.</div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* File Upload Section */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-base font-semibold">
                  <FileText className="h-4 w-4" />
                  Document Upload
                  <TooltipWrapper content="Upload PDF documents, Word files, or text files containing campaign briefs, brand guidelines, or research materials. Content will be automatically extracted and added to your campaign intelligence.">
                    <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipWrapper>
                </Label>
                
                <div className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-6 bg-blue-50 dark:bg-blue-950/20">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-3 text-blue-500" />
                    <p className="text-base font-medium text-blue-700 dark:text-blue-300 mb-2">
                      Smart Document Processing
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                      Upload PDFs, Word docs, or text files for automatic content extraction and AI analysis
                    </p>
                    
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt,.rtf"
                      multiple
                      onChange={(e) => {
                        // File upload handler will be implemented
                        const files = Array.from(e.target.files || []);
                        files.forEach(file => {
                          console.log('File selected:', file.name);
                          // TODO: Implement file processing
                        });
                      }}
                    />
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="border-blue-400 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/40"
                      onClick={() => document.getElementById('file-upload')?.click()}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Choose Files to Upload
                    </Button>
                    
                    <p className="text-xs text-foreground mt-3">
                      Supported: PDF, Word (.doc/.docx), Text files (.txt/.rtf) • Max 10MB per file
                    </p>
                  </div>
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
              type="button"
              disabled={createMutation.isPending}
              className="min-w-[140px]"
              onClick={() => {
                console.log('Button clicked!');
                const formValues = form.getValues();
                console.log('Form values:', formValues);
                console.log('Selected platforms:', selectedPlatforms);
                console.log('Scraped data:', scrapedData);
                
                const submitData = {
                  ...formValues,
                  platforms: selectedPlatforms,
                  website_analysis: scrapedData ? JSON.stringify(scrapedData) : null,
                };
                
                console.log('Final submit data:', submitData);
                createMutation.mutate(submitData);
              }}
            >
              {createMutation.isPending 
                ? (editingCampaign ? 'Updating...' : 'Creating...') 
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