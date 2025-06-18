// NewsJack Content Generator - Core Engine
// Restored from original NewsGlue build into Omega-V9

import { Campaign, NewsItem, Channel } from '../../lib/newsjack/types.js';

// Extended interfaces for internal processing
interface ExtendedCampaign extends Campaign {
  tone?: 'professional' | 'casual' | 'humorous' | 'urgent' | 'inspirational';
  keyMessages?: string[];
  hashtags?: string[];
  contentTypes?: string[];
}

interface ExtendedNewsItem extends NewsItem {
  id?: string;
  summary?: string;
  source?: string;
  publishedAt?: string;
  category?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number;
  keywords?: string[];
}

interface ExtendedChannel extends Channel {
  id?: string;
  platform?: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'blog' | 'email';
  characterLimit?: number;
  contentFormat?: string;
  audienceSize?: number;
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

async function generateNewsjackContent(campaign: Campaign, newsItem: NewsItem, channel: Channel): Promise<NewsjackContent> {
  try {
    // Convert to extended interfaces for internal processing
    const extendedCampaign: ExtendedCampaign = {
      ...campaign,
      tone: 'professional',
      keyMessages: campaign.keywords ? campaign.keywords.split(',').map(k => k.trim()) : [],
      hashtags: [],
      contentTypes: ['social']
    };

    const extendedNewsItem: ExtendedNewsItem = {
      ...newsItem,
      id: 'news-' + Date.now(),
      summary: newsItem.content.substring(0, 200),
      source: newsItem.sourceUrl,
      publishedAt: new Date().toISOString(),
      category: 'general',
      sentiment: 'neutral',
      relevanceScore: 0.7,
      keywords: newsItem.headline.split(' ').slice(0, 5)
    };

    const extendedChannel: ExtendedChannel = {
      ...channel,
      id: 'channel-' + Date.now(),
      platform: channel.type as any,
      characterLimit: channel.maxLength,
      contentFormat: channel.formatNotes || 'standard',
      audienceSize: 1000
    };

    // Analyze news relevance and brand alignment
    const relevanceAnalysis = analyzeNewsRelevance(extendedCampaign, extendedNewsItem);
    
    if (relevanceAnalysis.score < 0.6) {
      throw new Error('News item relevance score too low for effective newsjacking');
    }

    // Generate content hook based on news timing and brand positioning
    const hook = await generateContentHook(extendedNewsItem, extendedCampaign, extendedChannel);
    
    // Create platform-specific content
    const content = await generatePlatformContent(hook, extendedCampaign, extendedNewsItem, extendedChannel);
    
    // Generate strategic hashtags
    const hashtags = generateStrategicHashtags(extendedCampaign, extendedNewsItem, extendedChannel);
    
    // Create compelling call-to-action
    const callToAction = generateCallToAction(extendedCampaign, extendedChannel);
    
    // Recommend media assets
    const mediaRecommendations = suggestMediaAssets(extendedNewsItem, extendedCampaign, extendedChannel);
    
    // Calculate optimal timing
    const schedulingRecommendation = calculateOptimalTiming(extendedNewsItem, extendedChannel);
    
    // Predict engagement potential
    const engagementPrediction = predictEngagement(content, extendedNewsItem, extendedChannel, extendedCampaign);
    
    // Assess risks and compliance
    const riskAssessment = assessContentRisks(content, extendedNewsItem, extendedCampaign);

    return {
      content,
      hook,
      callToAction,
      hashtags,
      mediaRecommendations,
      schedulingRecommendation,
      engagementPrediction,
      riskAssessment
    };

  } catch (error) {
    console.error('NewsJack content generation failed:', error);
    throw new Error(`Failed to generate newsjack content: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Supporting functions for the core generator

function analyzeNewsRelevance(campaign: ExtendedCampaign, newsItem: ExtendedNewsItem) {
  let score = 0;
  const factors = [];

  // Check keyword alignment
  const keywordMatches = campaign.keyMessages.filter(msg => 
    newsItem.headline.toLowerCase().includes(msg.toLowerCase()) ||
    newsItem.summary.toLowerCase().includes(msg.toLowerCase())
  );
  
  if (keywordMatches.length > 0) {
    score += 0.3;
    factors.push(`Keyword matches: ${keywordMatches.length}`);
  }

  // Check sentiment alignment
  if (newsItem.sentiment === 'positive' && campaign.tone !== 'urgent') {
    score += 0.2;
    factors.push('Positive sentiment alignment');
  }

  // Check recency (news within last 24 hours gets higher score)
  const newsAge = Date.now() - new Date(newsItem.publishedAt).getTime();
  const hoursOld = newsAge / (1000 * 60 * 60);
  
  if (hoursOld < 24) {
    score += 0.3;
    factors.push('Fresh news (< 24 hours)');
  } else if (hoursOld < 48) {
    score += 0.2;
    factors.push('Recent news (< 48 hours)');
  }

  // Use existing relevance score from news item
  score += newsItem.relevanceScore * 0.2;

  return { score: Math.min(score, 1), factors };
}

async function generateContentHook(newsItem: ExtendedNewsItem, campaign: ExtendedCampaign, channel: ExtendedChannel): Promise<string> {
  const templates = {
    breaking: `🚨 BREAKING: ${newsItem.headline} - Here's what this means for ${campaign.targetAudience}...`,
    trend: `📈 Everyone's talking about: ${newsItem.headline}. Our take:`,
    insight: `💡 While everyone focuses on "${newsItem.headline}", here's the real opportunity...`,
    contrarian: `🤔 Hot take on "${newsItem.headline}": What if we're looking at this all wrong?`,
    educational: `📚 Breaking down "${newsItem.headline}" - What ${campaign.targetAudience} need to know:`
  };

  // Select template based on campaign tone and news sentiment
  let selectedTemplate;
  switch (campaign.tone) {
    case 'urgent':
      selectedTemplate = templates.breaking;
      break;
    case 'professional':
      selectedTemplate = templates.insight;
      break;
    case 'casual':
      selectedTemplate = templates.trend;
      break;
    case 'humorous':
      selectedTemplate = templates.contrarian;
      break;
    default:
      selectedTemplate = templates.educational;
  }

  return selectedTemplate;
}

async function generatePlatformContent(hook: string, campaign: ExtendedCampaign, newsItem: ExtendedNewsItem, channel: ExtendedChannel): Promise<string> {
  let content = hook;

  // Add brand perspective
  const brandPerspective = `\n\nAs ${campaign.brand}, we see this as ${generateBrandPerspective(campaign, newsItem)}.`;
  
  // Add value proposition
  const valueAdd = `\n\n${generateValueAddition(campaign, newsItem)}`;

  // Combine and optimize for platform
  content += brandPerspective + valueAdd;

  // Apply character limits if needed
  if (channel.characterLimit && content.length > channel.characterLimit) {
    content = truncateIntelligently(content, channel.characterLimit);
  }

  return content;
}

function generateBrandPerspective(campaign: ExtendedCampaign, newsItem: ExtendedNewsItem): string {
  const perspectives = [
    `an opportunity to ${campaign.keyMessages[0]}`,
    `a chance to help ${campaign.targetAudience} navigate this change`,
    `validation of what we've been saying about ${campaign.keyMessages[0]}`,
    `a perfect example of why ${campaign.keyMessages[0]} matters more than ever`
  ];

  return perspectives[Math.floor(Math.random() * perspectives.length)];
}

function generateValueAddition(campaign: ExtendedCampaign, newsItem: ExtendedNewsItem): string {
  return `Here's how ${campaign.targetAudience} can turn this into an advantage: [Strategic insight based on ${campaign.keyMessages[0]}]`;
}

function generateStrategicHashtags(campaign: Campaign, newsItem: NewsItem, channel: Channel): string[] {
  const hashtags = [...campaign.hashtags];
  
  // Add trending hashtags related to news
  hashtags.push(...newsItem.keywords.slice(0, 3).map(k => `#${k.replace(/\s+/g, '')}`));
  
  // Add platform-specific hashtags
  if (channel.platform === 'linkedin') {
    hashtags.push('#Leadership', '#BusinessInsights');
  } else if (channel.platform === 'twitter') {
    hashtags.push('#Breaking', '#Trending');
  }

  return hashtags.slice(0, 8); // Limit to 8 hashtags
}

function generateCallToAction(campaign: Campaign, channel: Channel): string {
  const ctas = {
    engagement: `What's your take on this? Share your thoughts below! 👇`,
    lead: `Want to know how this affects your business? Let's discuss: [link]`,
    share: `Think your network should see this? Share it and tag someone who needs to know!`,
    learn: `Dive deeper into this topic: [link to relevant content]`
  };

  // Select CTA based on channel and campaign goals
  if (channel.platform === 'linkedin') {
    return Math.random() > 0.5 ? ctas.engagement : ctas.lead;
  } else if (channel.platform === 'twitter') {
    return Math.random() > 0.5 ? ctas.engagement : ctas.share;
  }

  return ctas.engagement;
}

function suggestMediaAssets(newsItem: NewsItem, campaign: Campaign, channel: Channel): string[] {
  const suggestions = [];

  // Visual content recommendations
  if (channel.platform === 'instagram' || channel.platform === 'facebook') {
    suggestions.push('Branded infographic summarizing key points');
    suggestions.push('Quote card with brand colors');
  }

  // Video content for engagement
  if (channel.audienceSize > 1000) {
    suggestions.push('Short explainer video (60-90 seconds)');
  }

  // News-specific imagery
  suggestions.push('Screenshot of news headline with brand overlay');
  suggestions.push('Data visualization if news contains statistics');

  return suggestions;
}

function calculateOptimalTiming(newsItem: NewsItem, channel: Channel): string {
  const newsAge = Date.now() - new Date(newsItem.publishedAt).getTime();
  const hoursOld = newsAge / (1000 * 60 * 60);

  if (hoursOld < 2) {
    return 'IMMEDIATE - Post within next 30 minutes to capitalize on breaking news';
  } else if (hoursOld < 6) {
    return 'URGENT - Post within next 2 hours while story is still developing';
  } else if (hoursOld < 24) {
    return 'TODAY - Post within next 6 hours during peak engagement times';
  } else {
    return 'STRATEGIC - Wait for next related development or provide deeper analysis';
  }
}

function predictEngagement(content: string, newsItem: NewsItem, channel: Channel, campaign: Campaign): number {
  let score = 0.5; // Base score

  // News recency factor
  const newsAge = Date.now() - new Date(newsItem.publishedAt).getTime();
  const hoursOld = newsAge / (1000 * 60 * 60);
  
  if (hoursOld < 6) score += 0.3;
  else if (hoursOld < 24) score += 0.2;
  else if (hoursOld < 48) score += 0.1;

  // Sentiment factor
  if (newsItem.sentiment === 'positive') score += 0.1;
  else if (newsItem.sentiment === 'negative') score += 0.15; // Controversy drives engagement

  // Content quality factors
  if (content.includes('?')) score += 0.05; // Questions drive engagement
  if (content.includes('🚨') || content.includes('📈')) score += 0.05; // Emojis
  if (content.length > 100 && content.length < 200) score += 0.1; // Optimal length

  // Platform factors
  if (channel.platform === 'twitter' && content.length < 280) score += 0.1;
  if (channel.platform === 'linkedin' && campaign.tone === 'professional') score += 0.1;

  return Math.min(score, 1);
}

function assessContentRisks(content: string, newsItem: NewsItem, campaign: Campaign): { level: 'low' | 'medium' | 'high'; factors: string[] } {
  const risks = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // Check for controversial topics
  const controversialKeywords = ['politics', 'scandal', 'lawsuit', 'controversy', 'fired', 'resign'];
  const hasControversial = controversialKeywords.some(keyword => 
    newsItem.headline.toLowerCase().includes(keyword) || 
    newsItem.summary.toLowerCase().includes(keyword)
  );

  if (hasControversial) {
    risks.push('News item contains potentially controversial content');
    riskLevel = 'medium';
  }

  // Check for negative sentiment in crisis-prone industries
  if (newsItem.sentiment === 'negative' && campaign.brand.toLowerCase().includes('tech')) {
    risks.push('Negative tech news - exercise caution');
    riskLevel = 'medium';
  }

  // Check timing risks
  const newsAge = Date.now() - new Date(newsItem.publishedAt).getTime();
  const hoursOld = newsAge / (1000 * 60 * 60);
  
  if (hoursOld > 48) {
    risks.push('News is getting stale - may appear out of touch');
  }

  // Check for missing context
  if (!content.includes(campaign.brand) && !content.includes('we')) {
    risks.push('Content lacks clear brand connection');
  }

  if (risks.length === 0) {
    risks.push('No significant risks identified');
  }

  // Escalate to high risk if multiple medium risks
  if (risks.length > 2 && riskLevel === 'medium') {
    riskLevel = 'high';
  }

  return { level: riskLevel, factors: risks };
}

function truncateIntelligently(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;

  // Try to truncate at sentence boundary
  const sentences = content.split('. ');
  let truncated = '';
  
  for (const sentence of sentences) {
    if ((truncated + sentence + '. ').length <= maxLength - 3) {
      truncated += sentence + '. ';
    } else {
      break;
    }
  }

  if (truncated.length === 0) {
    // If no complete sentences fit, truncate at word boundary
    const words = content.split(' ');
    truncated = '';
    
    for (const word of words) {
      if ((truncated + word + ' ').length <= maxLength - 3) {
        truncated += word + ' ';
      } else {
        break;
      }
    }
  }

  return truncated.trim() + '...';
}

export { generateNewsjackContent, Campaign, NewsItem, Channel, NewsjackContent };