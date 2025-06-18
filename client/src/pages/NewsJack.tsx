import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, TrendingUp, AlertTriangle } from 'lucide-react';

interface Campaign {
  campaignName: string;
  description: string;
  targetAudience: string;
  keywords: string;
}

interface NewsItem {
  headline: string;
  content: string;
}

interface Channel {
  name: string;
  type: string;
  maxLength: number;
}

interface NewsjackContent {
  content: string;
  hook: string;
  callToAction: string;
  hashtags: string[];
  mediaRecommendations: string[];
  schedulingRecommendation: string;
  engagementPrediction: number;
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
}

const generateNewsjackContent = async (data: { campaign: Campaign; newsItem: NewsItem; channel: Channel }): Promise<{ content: NewsjackContent }> => {
  const response = await fetch('/api/newsjack/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to generate content');
  }

  return response.json();
};

export default function NewsJack() {
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign>({
    campaignName: '',
    description: '',
    targetAudience: '',
    keywords: '',
  });
  const [newsItem, setNewsItem] = useState<NewsItem>({
    headline: '',
    content: '',
  });
  const [channel, setChannel] = useState<Channel>({
    name: 'Twitter',
    type: 'twitter',
    maxLength: 280,
  });
  const [result, setResult] = useState<NewsjackContent | null>(null);

  const mutation = useMutation({
    mutationFn: generateNewsjackContent,
    onSuccess: (data) => {
      setResult(data.content);
      toast({
        title: "Content Generated",
        description: "Your newsjack content has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate newsjack content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign.campaignName || !newsItem.headline || !newsItem.content) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    mutation.mutate({ campaign, newsItem, channel });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          NewsJack Content Generator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Transform breaking news into engaging branded content. Analyze trending stories and create targeted newsjacking campaigns for your audience.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaignName">Campaign Name *</Label>
                <Input
                  id="campaignName"
                  value={campaign.campaignName}
                  onChange={(e) => setCampaign({ ...campaign, campaignName: e.target.value })}
                  placeholder="e.g., Tech Innovation Series"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={campaign.description}
                  onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
                  placeholder="Brief description of your campaign"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Input
                  id="targetAudience"
                  value={campaign.targetAudience}
                  onChange={(e) => setCampaign({ ...campaign, targetAudience: e.target.value })}
                  placeholder="e.g., tech professionals, entrepreneurs"
                />
              </div>
              <div>
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={campaign.keywords}
                  onChange={(e) => setCampaign({ ...campaign, keywords: e.target.value })}
                  placeholder="e.g., innovation, technology, AI"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>News Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="headline">News Headline *</Label>
                <Input
                  id="headline"
                  value={newsItem.headline}
                  onChange={(e) => setNewsItem({ ...newsItem, headline: e.target.value })}
                  placeholder="Enter the breaking news headline"
                />
              </div>
              <div>
                <Label htmlFor="content">News Content *</Label>
                <Textarea
                  id="content"
                  value={newsItem.content}
                  onChange={(e) => setNewsItem({ ...newsItem, content: e.target.value })}
                  placeholder="Paste the full news article or summary"
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution Channel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="channelName">Platform</Label>
                <select
                  id="channelName"
                  value={channel.name}
                  onChange={(e) => {
                    const selectedPlatform = e.target.value;
                    let maxLength = 280;
                    let type = 'twitter';
                    
                    switch (selectedPlatform) {
                      case 'LinkedIn':
                        maxLength = 3000;
                        type = 'linkedin';
                        break;
                      case 'Facebook':
                        maxLength = 2000;
                        type = 'facebook';
                        break;
                      case 'Instagram':
                        maxLength = 500;
                        type = 'instagram';
                        break;
                      default:
                        maxLength = 280;
                        type = 'twitter';
                    }
                    
                    setChannel({ name: selectedPlatform, type, maxLength });
                  }}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="Twitter">Twitter</option>
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                </select>
              </div>
              <p className="text-sm text-muted-foreground">
                Character limit: {channel.maxLength}
              </p>
            </CardContent>
          </Card>

          <Button 
            onClick={handleSubmit} 
            disabled={mutation.isPending}
            className="w-full"
            size="lg"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Generate NewsJack Content
              </>
            )}
          </Button>
        </div>

        <div className="space-y-6">
          {result ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Generated Content
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Hook</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="font-medium">{result.hook}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Full Content</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p className="whitespace-pre-wrap">{result.content}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Call to Action</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <p>{result.callToAction}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Hashtags & Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Hashtags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {result.hashtags.map((hashtag, index) => (
                        <Badge key={index} variant="secondary">{hashtag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Media Recommendations</Label>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      {result.mediaRecommendations.map((rec, index) => (
                        <li key={index} className="text-sm">{rec}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <Label>Scheduling</Label>
                    <p className="text-sm mt-1">{result.schedulingRecommendation}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Analytics & Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Engagement Prediction</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${result.engagementPrediction * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(result.engagementPrediction * 100)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Risk Assessment
                    </Label>
                    <div className="mt-2 space-y-2">
                      <Badge className={getRiskColor(result.riskAssessment.level)}>
                        {result.riskAssessment.level.toUpperCase()} RISK
                      </Badge>
                      <ul className="list-disc list-inside space-y-1">
                        {result.riskAssessment.factors.map((factor, index) => (
                          <li key={index} className="text-sm">{factor}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center space-y-2">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">
                    Fill in the campaign and news details to generate your newsjack content
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}