import { Router } from 'express';
import { db } from '../../db/index.js';
import { newsItems, campaigns } from '../../db/schema.js';
import { eq, and } from 'drizzle-orm';
import OpenAI from 'openai';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple auth check
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

// In-memory storage for keywords and articles
const campaignKeywords = new Map();
const campaignArticles = new Map();

// Get keywords for campaign
router.get('/keywords/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    let keywords = campaignKeywords.get(campaignId) || [];
    
    // Only show campaign name as initial keyword, no raw text injection
    if (keywords.length === 0 && campaign.campaignName) {
      // Extract clean keywords from campaign name only - no long-form text
      const campaignWords = campaign.campaignName
        .split(/\s+/)
        .filter(word => word.length > 2 && word.length < 20) // Reasonable keyword length
        .slice(0, 3); // Maximum 3 words from campaign name

      if (campaignWords.length > 0) {
        keywords = [{
          id: 'default-0',
          keyword: campaignWords.join(' ').trim(),
          isDefault: true,
          campaignId,
          source: 'campaign'
        }];

        campaignKeywords.set(campaignId, keywords);
      }
    }

    res.json(keywords);
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

// Suggest keywords using AI with campaign context resilience
router.post('/suggest-keywords/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    // Fetch complete campaign data for context resilience
    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Validate essential campaign fields for AI generation
    const requiredFields = {
      campaignName: campaign.campaignName,
      websiteUrl: campaign.websiteUrl,
      emotionalObjective: campaign.emotionalObjective,
      audiencePain: campaign.audiencePain
    };
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Incomplete campaign data', 
        missingFields,
        message: 'Please complete campaign setup before generating keywords'
      });
    }

    // Use OpenAI to suggest keywords with comprehensive campaign analysis
    const prompt = `You are an expert keyword strategist for NewsJacking campaigns. Analyze the campaign context below to generate clean, search-optimized keywords that will find relevant breaking news for content opportunities.

CAMPAIGN CONTEXT:
Campaign Name: "${campaign.campaignName}"
Website: ${campaign.websiteUrl || 'Not provided'}
Target Audience: ${campaign.emotionalObjective || 'Not specified'}
Pain Points: ${campaign.audiencePain || 'Not specified'}
Brand Context: ${campaign.websiteAnalysis ? campaign.websiteAnalysis.substring(0, 200) + '...' : 'Not provided'}

KEYWORD GENERATION RULES:
1. Generate exactly 12-15 clean, searchable keywords
2. Each keyword must be 2-4 words maximum
3. Focus on NewsJacking opportunities (breaking news, trending topics, industry developments)
4. Create diverse keyword categories:
   - Core industry terms
   - Trending market topics
   - Regulatory/policy keywords
   - Technology advancement terms
   - Consumer behavior shifts
5. NO generic terms: avoid "business", "news", "company", "industry", "update"
6. NO raw campaign text: generate fresh, search-optimized terms
7. Prioritize terms that surface breaking news relevant to the brand

Output clean JSON format:
{
  "keywords": ["bitcoin price", "crypto regulation", "digital currency", "blockchain adoption"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500
    });

    const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
    const suggestedKeywords = aiResponse.keywords || [];

    // Clear existing AI-generated keywords and add fresh suggestions
    const existingKeywords = campaignKeywords.get(campaignId) || [];
    const nonAIKeywords = existingKeywords.filter((k: any) => k.source !== 'AI');
    
    const newKeywords = suggestedKeywords.map((keyword: string, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      keyword: keyword.trim(),
      isDefault: false,
      source: 'AI',
      campaignId
    }));

    const updatedKeywords = [...nonAIKeywords, ...newKeywords];
    campaignKeywords.set(campaignId, updatedKeywords);

    res.json({ 
      count: newKeywords.length,
      keywords: newKeywords,
      total: updatedKeywords.length
    });
  } catch (error) {
    console.error('Error suggesting keywords:', error);
    res.status(500).json({ error: 'Failed to suggest keywords' });
  }
});

// Add keyword
router.post('/keywords/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { keyword } = req.body;
    const userId = req.user!.id;

    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const keywords = campaignKeywords.get(campaignId) || [];
    const newKeyword = {
      id: `user-${Date.now()}`,
      keyword: keyword.trim(),
      isDefault: false,
      campaignId
    };

    keywords.push(newKeyword);
    campaignKeywords.set(campaignId, keywords);

    res.json(newKeyword);
  } catch (error) {
    console.error('Error adding keyword:', error);
    res.status(500).json({ error: 'Failed to add keyword' });
  }
});

// Edit keyword
router.put('/keywords/:keywordId', requireAuth, async (req, res) => {
  try {
    const { keywordId } = req.params;
    const { keyword: newKeyword } = req.body;
    
    if (!newKeyword?.trim()) {
      return res.status(400).json({ error: 'Keyword text is required' });
    }

    // Find and update in all campaigns
    for (const [campaignId, keywords] of campaignKeywords.entries()) {
      const keywordIndex = keywords.findIndex(k => k.id === keywordId);
      if (keywordIndex !== -1) {
        keywords[keywordIndex].keyword = newKeyword.trim();
        campaignKeywords.set(campaignId, keywords);
        return res.json({ success: true, keyword: keywords[keywordIndex] });
      }
    }

    res.status(404).json({ error: 'Keyword not found' });
  } catch (error) {
    console.error('Error editing keyword:', error);
    res.status(500).json({ error: 'Failed to edit keyword' });
  }
});

// Remove keyword
router.delete('/keywords/:keywordId', requireAuth, async (req, res) => {
  try {
    const { keywordId } = req.params;

    for (const [campaignId, keywords] of Array.from(campaignKeywords.entries())) {
      const keywordIndex = keywords.findIndex((k: any) => k.id === keywordId);
      if (keywordIndex !== -1) {
        const keyword = keywords[keywordIndex];
        if (!keyword.isDefault) {
          keywords.splice(keywordIndex, 1);
          campaignKeywords.set(campaignId, keywords);
          return res.json({ success: true });
        } else {
          return res.status(400).json({ error: 'Cannot remove default keywords' });
        }
      }
    }

    res.status(404).json({ error: 'Keyword not found' });
  } catch (error) {
    console.error('Error removing keyword:', error);
    res.status(500).json({ error: 'Failed to remove keyword' });
  }
});

// Search single keyword
router.post('/search-keyword/:campaignId/:keywordId', requireAuth, async (req, res) => {
  try {
    const { campaignId, keywordId } = req.params;
    const userId = req.user!.id;

    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const keywords = campaignKeywords.get(campaignId) || [];
    const keyword = keywords.find(k => k.id === keywordId);
    
    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    // Generate sample articles for the specific keyword
    const sampleArticles = [
      {
        id: `${keywordId}-article-${Date.now()}-1`,
        title: `Breaking: ${keyword.keyword} Market Sees Major Shift in Consumer Behavior`,
        description: `Latest analysis shows significant changes in ${keyword.keyword} market dynamics with implications for businesses.`,
        url: `https://example.com/news/${keyword.keyword.replace(/\s+/g, '-').toLowerCase()}-market-shift`,
        source: { name: 'Business Weekly' },
        publishedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        urlToImage: null,
        keyword: keyword.keyword,
        relevanceScore: Math.floor(Math.random() * 40) + 60, // 60-100%
        campaignId
      },
      {
        id: `${keywordId}-article-${Date.now()}-2`,
        title: `Industry Leaders Respond to ${keyword.keyword} Regulatory Changes`,
        description: `Key stakeholders share insights on recent ${keyword.keyword} policy updates and their business impact.`,
        url: `https://example.com/news/${keyword.keyword.replace(/\s+/g, '-').toLowerCase()}-regulatory-response`,
        source: { name: 'Industry Today' },
        publishedAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
        urlToImage: null,
        keyword: keyword.keyword,
        relevanceScore: Math.floor(Math.random() * 30) + 70, // 70-100%
        campaignId
      }
    ];

    // Store articles
    const existingArticles = campaignArticles.get(campaignId) || [];
    const updatedArticles = [...existingArticles, ...sampleArticles];
    campaignArticles.set(campaignId, updatedArticles);

    res.json({ 
      success: true, 
      count: sampleArticles.length,
      keyword: keyword.keyword,
      articles: sampleArticles
    });
  } catch (error) {
    console.error('Error searching keyword:', error);
    res.status(500).json({ error: 'Failed to search keyword' });
  }
});

// Search articles
router.post('/search/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const keywords = campaignKeywords.get(campaignId) || [];
    if (keywords.length === 0) {
      return res.status(400).json({ error: 'No keywords configured for search' });
    }

    // Sample Google News style articles
    const sampleArticles = [
      {
        id: `article-${Date.now()}-1`,
        title: "AI Revolution Transforms Digital Marketing Landscape",
        description: "New artificial intelligence tools are reshaping how businesses approach content creation and customer engagement across digital platforms.",
        url: "https://example.com/ai-marketing-revolution",
        urlToImage: "https://via.placeholder.com/400x200/4F46E5/FFFFFF?text=AI+Marketing",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        source: { id: null, name: "TechCrunch" },
        relevanceScore: 85,
        keywords: keywords.slice(0, 2).map((k: any) => k.keyword),
        campaignId
      },
      {
        id: `article-${Date.now()}-2`,
        title: "Small Business Growth Strategies for 2025",
        description: "Industry experts reveal key tactics for small businesses to compete effectively in an increasingly digital marketplace.",
        url: "https://example.com/small-business-growth",
        urlToImage: "https://via.placeholder.com/400x200/059669/FFFFFF?text=Business+Growth",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        source: { id: null, name: "Forbes" },
        relevanceScore: 78,
        keywords: keywords.slice(1, 3).map((k: any) => k.keyword),
        campaignId
      },
      {
        id: `article-${Date.now()}-3`,
        title: "Customer Experience Trends Drive Business Innovation",
        description: "Companies investing in customer experience see significant returns as consumer expectations continue to evolve rapidly.",
        url: "https://example.com/customer-experience-trends",
        urlToImage: "https://via.placeholder.com/400x200/7C3AED/FFFFFF?text=Customer+Experience",
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        source: { id: null, name: "Harvard Business Review" },
        relevanceScore: 72,
        keywords: keywords.slice(0, 1).map((k: any) => k.keyword),
        campaignId
      }
    ];

    const existingArticles = campaignArticles.get(campaignId) || [];
    const newArticles = sampleArticles.filter(article => 
      !existingArticles.some((existing: any) => existing.url === article.url)
    );
    
    const updatedArticles = [...existingArticles, ...newArticles];
    campaignArticles.set(campaignId, updatedArticles);

    res.json({ 
      count: newArticles.length,
      total: updatedArticles.length,
      articles: newArticles
    });
  } catch (error) {
    console.error('Error searching articles:', error);
    res.status(500).json({ error: 'Failed to search articles' });
  }
});

// Get articles
router.get('/articles/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const articles = campaignArticles.get(campaignId) || [];
    
    articles.sort((a: any, b: any) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Transfer articles to Module 6
router.post('/transfer/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { articleIds } = req.body;
    const userId = req.user!.id;

    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const articles = campaignArticles.get(campaignId) || [];
    const articlesToTransfer = articles.filter((article: any) => articleIds.includes(article.id));

    if (articlesToTransfer.length === 0) {
      return res.status(400).json({ error: 'No articles found to transfer' });
    }

    for (const article of articlesToTransfer) {
      const fullContent = `${article.title}\n\n${article.description}\n\nThis article from ${article.source.name} provides valuable insights that could be leveraged for NewsJacking opportunities. The content discusses current industry trends and developments that align with campaign objectives.`;

      await db.insert(newsItems).values({
        campaignId,
        headline: article.title,
        content: fullContent,
        sourceUrl: article.url,
        contentType: 'googlenews',
        status: 'active',
        platformOutputs: JSON.stringify({
          source: article.source.name,
          publishedAt: article.publishedAt,
          relevanceScore: article.relevanceScore,
          keywords: article.keywords,
          imageUrl: article.urlToImage
        })
      });
    }

    const remainingArticles = articles.filter((article: any) => !articleIds.includes(article.id));
    campaignArticles.set(campaignId, remainingArticles);

    res.json({ 
      count: articlesToTransfer.length,
      transferred: articlesToTransfer.map((a: any) => ({ id: a.id, title: a.title }))
    });
  } catch (error) {
    console.error('Error transferring articles:', error);
    res.status(500).json({ error: 'Failed to transfer articles' });
  }
});

// Delete articles
router.delete('/articles', requireAuth, async (req, res) => {
  try {
    const { articleIds } = req.body;

    if (!articleIds || articleIds.length === 0) {
      return res.status(400).json({ error: 'No article IDs provided' });
    }

    let deletedCount = 0;

    for (const [campaignId, articles] of Array.from(campaignArticles.entries())) {
      const originalLength = articles.length;
      const remainingArticles = articles.filter((article: any) => !articleIds.includes(article.id));
      
      if (remainingArticles.length < originalLength) {
        campaignArticles.set(campaignId, remainingArticles);
        deletedCount += originalLength - remainingArticles.length;
      }
    }

    res.json({ 
      count: deletedCount,
      message: `Deleted ${deletedCount} articles`
    });
  } catch (error) {
    console.error('Error deleting articles:', error);
    res.status(500).json({ error: 'Failed to delete articles' });
  }
});

export default router;