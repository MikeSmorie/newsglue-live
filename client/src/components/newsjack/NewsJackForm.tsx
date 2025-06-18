// Prompt 6 of 12 – Validate NewsJack Frontend UX

import React, { useState } from 'react';
import axios from 'axios';
// TypeScript interfaces matching the backend types
interface Campaign {
  campaignName: string;
  description?: string;
  targetAudience?: string;
  brandVoice?: string;
  keyBenefits?: string;
  keywords?: string;
  campaignGoals?: string;
  campaignUrl?: string;
}

interface NewsItem {
  headline: string;
  sourceUrl: string;
  content: string;
}

interface Channel {
  name: string;
  type: string;
  tone: string;
  maxLength: number;
  newsRatio: number;
  campaignRatio: number;
  formatNotes?: string;
  wordCount?: number;
  aiDetectionEnabled?: boolean;
}
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap } from 'lucide-react';

export default function NewsJackForm() {
  const { toast } = useToast();
  
  const [campaign, setCampaign] = useState<Campaign>({
    campaignName: '',
    description: '',
    targetAudience: '',
    brandVoice: '',
    keyBenefits: '',
    keywords: '',
    campaignGoals: '',
    campaignUrl: ''
  });

  const [newsItem, setNewsItem] = useState<NewsItem>({
    headline: '',
    sourceUrl: '',
    content: ''
  });

  const [channel, setChannel] = useState<Channel>({
    name: 'Twitter',
    type: 'twitter',
    tone: 'Witty',
    maxLength: 280,
    newsRatio: 60,
    campaignRatio: 40,
    formatNotes: '',
    wordCount: 0,
    aiDetectionEnabled: false
  });

  const [output, setOutput] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Validation function
  const validateForm = (): boolean => {
    if (!campaign.campaignName.trim()) {
      toast({
        title: "Validation Error",
        description: "Campaign name is required",
        variant: "destructive"
      });
      return false;
    }
    
    if (!newsItem.headline.trim()) {
      toast({
        title: "Validation Error", 
        description: "News headline is required",
        variant: "destructive"
      });
      return false;
    }
    
    if (!newsItem.content.trim()) {
      toast({
        title: "Validation Error",
        description: "News content is required", 
        variant: "destructive"
      });
      return false;
    }
    
    return true;
  };

  const handleGenerate = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setOutput(null);
    
    try {
      const res = await axios.post('/api/newsjack/generate', {
        campaign,
        newsItem,
        channel
      });
      
      setOutput(res.data.content);
      toast({
        title: "Content Generated",
        description: "NewsJack content created successfully"
      });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err.message || 'Unknown error';
      toast({
        title: "Generation Failed",
        description: `Error: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChannelChange = (value: string) => {
    let maxLength = 280;
    let type = 'twitter';
    
    switch (value) {
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
    
    setChannel({ ...channel, name: value, type, maxLength });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          NewsJack Content Generator
        </h1>
        <p className="text-muted-foreground">
          Transform breaking news into engaging branded content
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Campaign Section */}
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
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={campaign.description || ''}
                  onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
                  placeholder="Brief description of your campaign"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Input
                  id="targetAudience"
                  value={campaign.targetAudience || ''}
                  onChange={(e) => setCampaign({ ...campaign, targetAudience: e.target.value })}
                  placeholder="e.g., tech professionals, entrepreneurs"
                />
              </div>
              
              <div>
                <Label htmlFor="brandVoice">Brand Voice</Label>
                <Input
                  id="brandVoice"
                  value={campaign.brandVoice || ''}
                  onChange={(e) => setCampaign({ ...campaign, brandVoice: e.target.value })}
                  placeholder="e.g., professional, friendly, authoritative"
                />
              </div>
              
              <div>
                <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  value={campaign.keywords || ''}
                  onChange={(e) => setCampaign({ ...campaign, keywords: e.target.value })}
                  placeholder="e.g., innovation, technology, AI"
                />
              </div>
              
              <div>
                <Label htmlFor="campaignGoals">Campaign Goals</Label>
                <Textarea
                  id="campaignGoals"
                  value={campaign.campaignGoals || ''}
                  onChange={(e) => setCampaign({ ...campaign, campaignGoals: e.target.value })}
                  placeholder="What do you want to achieve?"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* News Item Section */}
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
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="sourceUrl">Source URL</Label>
                <Input
                  id="sourceUrl"
                  value={newsItem.sourceUrl}
                  onChange={(e) => setNewsItem({ ...newsItem, sourceUrl: e.target.value })}
                  placeholder="https://example.com/news-article"
                  type="url"
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
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Channel Section */}
          <Card>
            <CardHeader>
              <CardTitle>Distribution Channel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="platform">Platform</Label>
                <Select value={channel.name} onValueChange={handleChannelChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Twitter">Twitter</SelectItem>
                    <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="tone">Tone</Label>
                <Select value={channel.tone} onValueChange={(value) => setChannel({ ...channel, tone: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Witty">Witty</SelectItem>
                    <SelectItem value="Casual">Casual</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="Inspirational">Inspirational</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newsRatio">News Ratio (%)</Label>
                  <Input
                    id="newsRatio"
                    type="number"
                    min="0"
                    max="100"
                    value={channel.newsRatio}
                    onChange={(e) => setChannel({ ...channel, newsRatio: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="campaignRatio">Campaign Ratio (%)</Label>
                  <Input
                    id="campaignRatio"
                    type="number"
                    min="0"
                    max="100"
                    value={channel.campaignRatio}
                    onChange={(e) => setChannel({ ...channel, campaignRatio: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Character limit: {channel.maxLength}
              </p>
              
              <div>
                <Label htmlFor="formatNotes">Format Notes</Label>
                <Textarea
                  id="formatNotes"
                  value={channel.formatNotes || ''}
                  onChange={(e) => setChannel({ ...channel, formatNotes: e.target.value })}
                  placeholder="Any specific formatting requirements"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
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

        {/* Output Section */}
        <div className="space-y-6">
          {output ? (
            <Card>
              <CardHeader>
                <CardTitle>Generated Content</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Hook</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">{output.hook}</p>
                  </div>
                </div>
                
                <div>
                  <Label>Full Content</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="whitespace-pre-wrap">{output.content}</p>
                  </div>
                </div>
                
                <div>
                  <Label>Call to Action</Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p>{output.callToAction}</p>
                  </div>
                </div>
                
                {output.hashtags && (
                  <div>
                    <Label>Hashtags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {output.hashtags.map((hashtag: string, index: number) => (
                        <span key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">
                          {hashtag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {output.engagementPrediction && (
                  <div>
                    <Label>Engagement Prediction</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{ width: `${output.engagementPrediction * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(output.engagementPrediction * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
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