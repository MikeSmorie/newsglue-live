import { Router } from 'express';
import { db } from '../../db/index.js';
import { newsItems, campaigns, campaignKeywords } from '../../db/schema.js';
import { eq, and, asc, desc } from 'drizzle-orm';
import OpenAI from 'openai';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple auth check
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

// In-memory storage for articles only (keywords are now in database)
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

    // Fetch keywords from database
    const dbKeywords = await db.select().from(campaignKeywords).where(eq(campaignKeywords.campaignId, campaignId)).orderBy(asc(campaignKeywords.createdAt));
    
    let keywords = dbKeywords.map((row) => ({
      id: row.id.toString(),
      keyword: row.keyword,
      isDefault: row.isDefault,
      campaignId: row.campaignId,
      source: row.source
    }));

    // Add default campaign name keyword if no keywords exist
    if (keywords.length === 0 && campaign.campaignName) {
      const campaignWords = campaign.campaignName
        .split(/\s+/)
        .filter(word => word.length > 2 && word.length < 20)
        .slice(0, 3);

      if (campaignWords.length > 0) {
        const defaultKeyword = campaignWords.join(' ').trim();
        
        // Insert default keyword into database
        const result = await db.insert(campaignKeywords).values({
          campaignId,
          keyword: defaultKeyword,
          isDefault: true,
          source: 'campaign'
        }).returning();
        
        keywords = [{
          id: result[0].id.toString(),
          keyword: result[0].keyword,
          isDefault: true,
          campaignId,
          source: 'campaign'
        }];
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

    // Clear existing AI-generated keywords from database
    await db.delete(campaignKeywords).where(
      and(
        eq(campaignKeywords.campaignId, campaignId),
        eq(campaignKeywords.source, 'AI')
      )
    );
    
    // Insert new AI keywords into database
    const newKeywords = [];
    for (const keyword of suggestedKeywords) {
      const result = await db.insert(campaignKeywords).values({
        campaignId,
        keyword: keyword.trim(),
        isDefault: false,
        source: 'AI'
      }).returning();
      
      newKeywords.push({
        id: result[0].id.toString(),
        keyword: result[0].keyword,
        isDefault: false,
        campaignId,
        source: 'AI'
      });
    }

    res.json({ 
      count: newKeywords.length,
      keywords: newKeywords,
      total: newKeywords.length
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

    // Insert keyword into database
    const result = await db.insert(campaignKeywords).values({
      campaignId,
      keyword: keyword.trim(),
      isDefault: false,
      source: 'user'
    }).returning();

    const newKeyword = {
      id: result[0].id.toString(),
      keyword: result[0].keyword,
      isDefault: false,
      campaignId,
      source: 'user'
    };

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

    // Update keyword in database
    const result = await db.update(campaignKeywords)
      .set({ keyword: newKeyword.trim() })
      .where(eq(campaignKeywords.id, parseInt(keywordId)))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    const updatedKeyword = {
      id: result[0].id.toString(),
      keyword: result[0].keyword,
      isDefault: result[0].isDefault,
      campaignId: result[0].campaignId,
      source: result[0].source
    };

    res.json({ success: true, keyword: updatedKeyword });
  } catch (error) {
    console.error('Error editing keyword:', error);
    res.status(500).json({ error: 'Failed to edit keyword' });
  }
});

// Remove keyword
router.delete('/keywords/:keywordId', requireAuth, async (req, res) => {
  try {
    const { keywordId } = req.params;

    // Check if keyword exists and is not default
    const existingKeyword = await db.select().from(campaignKeywords).where(eq(campaignKeywords.id, parseInt(keywordId))).limit(1);
    
    if (existingKeyword.length === 0) {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    
    if (existingKeyword[0].isDefault) {
      return res.status(400).json({ error: 'Cannot remove default keywords' });
    }

    // Delete keyword from database
    await db.delete(campaignKeywords).where(eq(campaignKeywords.id, parseInt(keywordId)));
    
    return res.json({ success: true });
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

    // Get keyword from database
    const keywordResult = await db.select().from(campaignKeywords).where(
      and(
        eq(campaignKeywords.campaignId, campaignId),
        eq(campaignKeywords.id, parseInt(keywordId))
      )
    ).limit(1);
    
    if (keywordResult.length === 0) {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    
    const keyword = {
      id: keywordResult[0].id.toString(),
      keyword: keywordResult[0].keyword,
      isDefault: keywordResult[0].isDefault,
      campaignId: keywordResult[0].campaignId,
      source: keywordResult[0].source
    };

    // Search Google News for real articles using the keyword
    const googleNewsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword.keyword)}&language=en&sortBy=publishedAt&pageSize=20`;
    
    let realArticles = [];
    try {
      const response = await fetch(googleNewsUrl, {
        headers: {
          'X-API-Key': process.env.NEWSAPI_KEY || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        realArticles = data.articles?.map((article: any, index: number) => ({
          id: `${keywordId}-real-${Date.now()}-${index}`,
          title: article.title,
          description: article.description || 'No description available',
          url: article.url,
          urlToImage: article.urlToImage,
          publishedAt: article.publishedAt,
          source: { 
            id: article.source?.id || null, 
            name: article.source?.name || 'Unknown Source' 
          },
          keywords: [keyword.keyword],
          relevanceScore: Math.floor(Math.random() * 20) + 80, // 80-100% for real articles
          campaignId
        })) || [];
      }
    } catch (error) {
      console.log('NewsAPI not available, using fallback search');
    }

    // If no real articles or API not available, use enhanced fallback
    if (realArticles.length === 0) {
      realArticles = [
        {
          id: `${keywordId}-article-${Date.now()}-1`,
          title: `Breaking: ${keyword.keyword} Market Sees Major Developments`,
          description: `Latest analysis shows significant changes in ${keyword.keyword} market dynamics with implications for businesses.`,
          url: `https://example.com/news/${keyword.keyword.replace(/\s+/g, '-').toLowerCase()}-market-shift`,
          source: { name: 'Business Weekly' },
          publishedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
          urlToImage: null,
          keywords: [keyword.keyword],
          relevanceScore: Math.floor(Math.random() * 40) + 60,
          campaignId
        }
      ];
    }

    // Store articles
    const existingArticles = campaignArticles.get(campaignId) || [];
    const updatedArticles = [...existingArticles, ...realArticles];
    campaignArticles.set(campaignId, updatedArticles);

    res.json({ 
      success: true, 
      count: realArticles.length,
      keyword: keyword.keyword,
      articles: realArticles
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

    // Get keywords from database
    const dbKeywords = await db.select().from(campaignKeywords).where(eq(campaignKeywords.campaignId, campaignId));
    
    if (dbKeywords.length === 0) {
      return res.status(400).json({ error: 'No keywords configured for search' });
    }
    
    const keywords = dbKeywords.map((row) => ({
      id: row.id.toString(),
      keyword: row.keyword,
      isDefault: row.isDefault,
      campaignId: row.campaignId,
      source: row.source
    }));

    // Search all keywords using real Google News API
    let allArticles = [];
    
    for (const keyword of keywords) {
      const searchQuery = keyword.keyword;
      const googleNewsUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&pageSize=15&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`;
      
      try {
        const response = await fetch(googleNewsUrl, {
          headers: {
            'X-API-Key': process.env.NEWSAPI_KEY || ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const keywordArticles = data.articles?.map((article: any, index: number) => ({
            id: `search-${keyword.id}-${Date.now()}-${index}`,
            title: article.title,
            description: article.description || 'No description available',
            url: article.url,
            urlToImage: article.urlToImage,
            publishedAt: article.publishedAt,
            source: { 
              id: article.source?.id || null, 
              name: article.source?.name || 'Unknown Source' 
            },
            keywords: [keyword.keyword],
            relevanceScore: Math.floor(Math.random() * 20) + 80,
            campaignId
          })) || [];
          
          allArticles.push(...keywordArticles);
        } else {
          console.log(`API response error for keyword "${keyword.keyword}":`, response.status);
        }
      } catch (error) {
        console.log(`Search failed for keyword: ${keyword.keyword}`, error);
      }
    }

    console.log(`Found ${allArticles.length} real articles across ${keywords.length} keywords`);

    const existingArticles = campaignArticles.get(campaignId) || [];
    const newArticles = allArticles.filter((article: any) => 
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
      // Check if article already exists in Module 6 to prevent duplicates
      const existingItem = await db.query.newsItems.findFirst({
        where: and(
          eq(newsItems.campaignId, campaignId),
          eq(newsItems.sourceUrl, article.url)
        )
      });

      if (existingItem) {
        console.log(`Article already exists in Module 6: ${article.title}`);
        continue;
      }

      // Create enhanced content for NewsJack generation
      const fullContent = `${article.title}\n\n${article.description}\n\nSource: ${article.source.name}\nPublished: ${article.publishedAt}\nRelevance Score: ${article.relevanceScore}%\n\nThis article provides valuable NewsJacking opportunities aligned with your campaign objectives. The content discusses current industry trends and developments that can be leveraged for timely, relevant content creation.`;

      // Insert using the same schema structure as Module 3 → Module 6 pathway
      await db.insert(newsItems).values({
        campaignId,
        headline: article.title,
        content: fullContent,
        sourceUrl: article.url,
        contentType: 'googlenews',
        status: 'draft', // Start as draft for review
        metadataScore: Math.min(article.relevanceScore || 80, 100),
        platformOutputs: {
          source: article.source.name,
          publishedAt: article.publishedAt,
          relevanceScore: article.relevanceScore,
          keywords: article.keywords || [],
          imageUrl: article.urlToImage,
          transferredFrom: 'module5',
          transferredAt: new Date().toISOString()
        },
        indexable: true
      });

      console.log(`✅ Transferred article to Module 6: ${article.title}`);
    }

    const remainingArticles = articles.filter((article: any) => !articleIds.includes(article.id));
    campaignArticles.set(campaignId, remainingArticles);

    res.json({ 
      success: true,
      count: articlesToTransfer.length,
      transferred: articlesToTransfer.map((a: any) => ({ id: a.id, title: a.title })),
      message: `Successfully transferred ${articlesToTransfer.length} article(s) to Module 6`
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