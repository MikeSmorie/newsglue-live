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
    
    if (keywords.length === 0) {
      const defaultKeywords = [
        campaign.campaignName,
        campaign.emotionalObjective,
        campaign.audiencePain
      ].filter(k => k && k.trim()).map(k => k.trim());

      keywords = defaultKeywords.map((keyword, index) => ({
        id: `default-${index}`,
        keyword,
        isDefault: true,
        campaignId
      }));

      campaignKeywords.set(campaignId, keywords);
    }

    res.json(keywords);
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

// Suggest keywords using AI
router.post('/suggest-keywords/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Use OpenAI to suggest keywords with comprehensive campaign analysis
    const prompt = `You are an expert keyword strategist for NewsJacking campaigns. Analyze ALL the campaign details below to generate strategic keywords that will surface relevant news articles for this specific brand and audience.

CAMPAIGN ANALYSIS:
Campaign Name: ${campaign.campaignName}
Website URL: ${campaign.websiteUrl || 'Not provided'}
CTA URL: ${campaign.ctaUrl || 'Not specified'}
Emotional Objective: ${campaign.emotionalObjective || 'Not specified'}
Audience Pain Points: ${campaign.audiencePain || 'Not specified'}
Website Analysis: ${campaign.websiteAnalysis || 'Not provided'}
Additional Context: ${campaign.additionalData || 'Not provided'}
Social Settings: ${campaign.socialSettings || 'Not specified'}

KEYWORD STRATEGY RULES:
1. Parse ALL campaign fields - do not make assumptions based on campaign name alone
2. Infer themes from brand tone, product type, and audience pain points
3. Focus on NewsJacking opportunities (breaking news, trending topics, industry developments)
4. Generate 12-15 diverse keywords covering different angles:
   - Industry-specific terms
   - Audience pain point related topics
   - Geographic/regional terms (if specified)
   - Trending themes relevant to the brand
   - Regulatory/policy changes affecting the industry
5. Each keyword should be 2-4 words maximum
6. Avoid generic terms like "business", "news", "company", "industry"
7. Ensure high relevance diversity - different topic angles

Respond with JSON in this format:
{
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500
    });

    const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
    const suggestedKeywords = aiResponse.keywords || [];

    // Add suggested keywords to campaign
    const keywords = campaignKeywords.get(campaignId) || [];
    const newKeywords = suggestedKeywords.map((keyword: string, index: number) => ({
      id: `ai-${Date.now()}-${index}`,
      keyword: keyword.trim(),
      isDefault: false,
      source: 'AI',
      campaignId
    }));

    const updatedKeywords = [...keywords, ...newKeywords];
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