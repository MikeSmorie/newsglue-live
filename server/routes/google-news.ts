import { Router } from 'express';
import { db } from '../../db/index.js';
import { newsItems, campaigns } from '../../db/schema.js';
import { eq, and, desc, inArray } from 'drizzle-orm';
import OpenAI from 'openai';

// Simple auth check using passport
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Types for Google News API responses
interface GoogleNewsArticle {
  title: string;
  description: string;
  url: string;
  urlToImage?: string;
  publishedAt: string;
  source: {
    id?: string;
    name: string;
  };
}

interface SearchKeyword {
  id: string;
  keyword: string;
  isDefault: boolean;
  campaignId: string;
}

interface StoredNewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: {
    id: string | null;
    name: string;
  };
  relevanceScore: number;
  keywords: string[];
  content?: string;
  campaignId: string;
}

// Store keywords and articles in memory for quick access
const campaignKeywords = new Map<string, SearchKeyword[]>();
const campaignArticles = new Map<string, StoredNewsArticle[]>();

// Get keywords for campaign
router.get('/keywords/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    // Verify campaign ownership
    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get stored keywords or create defaults from campaign
    let keywords = campaignKeywords.get(campaignId) || [];
    
    if (keywords.length === 0) {
      // Create default keywords from campaign data
      const defaultKeywords = [
        campaign.campaignName,
        campaign.emotionalObjective,
        campaign.audiencePain,
        // Extract keywords from additional data if available
        ...(campaign.additionalData || '').split(',').map((k: string) => k.trim()).filter(Boolean)
      ].filter(Boolean);

      keywords = defaultKeywords.map((keyword, index) => ({
        id: `default-${index}`,
        keyword: keyword || '',
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

// Add keyword to campaign
router.post('/keywords/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { keyword } = req.body;
    const userId = req.user!.id;

    // Verify campaign ownership
    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const keywords = campaignKeywords.get(campaignId) || [];
    const newKeyword: SearchKeyword = {
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

// Remove keyword from campaign
router.delete('/keywords/:keywordId', requireAuth, async (req, res) => {
  try {
    const { keywordId } = req.params;

    // Find and remove keyword from all campaigns
    for (const [campaignId, keywords] of campaignKeywords.entries()) {
      const keywordIndex = keywords.findIndex(k => k.id === keywordId);
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

// Search Google News for articles
router.post('/search/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    // Verify campaign ownership
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

    // Simulate Google News API search with sample data
    const sampleArticles: GoogleNewsArticle[] = [
      {
        title: "Revolutionary AI Tool Transforms Content Marketing Strategies",
        description: "New artificial intelligence platform helps businesses create more engaging content across multiple channels, increasing conversion rates by up to 40%.",
        url: "https://example.com/ai-content-marketing",
        urlToImage: "https://via.placeholder.com/400x200/4F46E5/FFFFFF?text=AI+Marketing",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        source: { name: "TechCrunch" }
      },
      {
        title: "Small Business Digital Marketing Trends for 2025",
        description: "Industry experts reveal the top digital marketing strategies small businesses should adopt to compete with larger companies in the evolving marketplace.",
        url: "https://example.com/small-business-trends",
        urlToImage: "https://via.placeholder.com/400x200/059669/FFFFFF?text=Digital+Trends",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
        source: { name: "Forbes" }
      },
      {
        title: "Privacy Laws Impact Content Creation and Distribution",
        description: "New regulations require content creators to adapt their strategies while maintaining user engagement and compliance with data protection standards.",
        url: "https://example.com/privacy-laws-content",
        urlToImage: "https://via.placeholder.com/400x200/DC2626/FFFFFF?text=Privacy+Laws",
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
        source: { name: "Wired" }
      },
      {
        title: "Social Media Algorithm Changes Affect Business Reach",
        description: "Major platforms update their algorithms, prompting businesses to reconsider their social media marketing approaches and content strategies.",
        url: "https://example.com/algorithm-changes",
        urlToImage: "https://via.placeholder.com/400x200/7C3AED/FFFFFF?text=Social+Media",
        publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), // 18 hours ago
        source: { name: "Social Media Today" }
      },
      {
        title: "E-commerce Growth Strategies for Local Businesses",
        description: "Regional retailers discover new ways to compete online while maintaining their community connections and local market advantages.",
        url: "https://example.com/ecommerce-local",
        urlToImage: "https://via.placeholder.com/400x200/059669/FFFFFF?text=E-commerce",
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        source: { name: "Retail Dive" }
      }
    ];

    // Calculate relevance scores using AI
    const articlesWithScores: StoredNewsArticle[] = [];
    
    for (const article of sampleArticles) {
      try {
        // Use AI to calculate relevance score
        const prompt = `
Analyze the relevance of this news article to a campaign with these details:
Campaign: ${campaign.campaignName}
Emotional Objective: ${campaign.emotionalObjective || 'Not specified'}
Audience Pain: ${campaign.audiencePain || 'Not specified'}
Keywords: ${keywords.map(k => k.keyword).join(', ')}

Article Title: ${article.title}
Article Description: ${article.description}

Rate the relevance from 0-100 where:
- 90-100: Extremely relevant, perfect for NewsJacking
- 70-89: Highly relevant, good NewsJacking opportunity
- 50-69: Moderately relevant, some potential
- 30-49: Low relevance, limited potential
- 0-29: Not relevant for this campaign

Also identify which specific keywords from the campaign this article relates to.

Respond with JSON in this format:
{
  "relevanceScore": number,
  "matchingKeywords": ["keyword1", "keyword2"],
  "reasoning": "brief explanation"
}`;

        const response = await openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 300
        });

        const analysis = JSON.parse(response.choices[0].message.content || '{}');
        
        const storedArticle: StoredNewsArticle = {
          id: `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: article.title,
          description: article.description,
          url: article.url,
          urlToImage: article.urlToImage || null,
          publishedAt: article.publishedAt,
          source: {
            id: article.source.id || null,
            name: article.source.name
          },
          relevanceScore: analysis.relevanceScore || Math.floor(Math.random() * 40) + 50, // Fallback random score
          keywords: analysis.matchingKeywords || [],
          campaignId
        };

        articlesWithScores.push(storedArticle);
      } catch (aiError) {
        console.error('AI analysis failed, using fallback scoring:', aiError);
        
        // Fallback scoring based on keyword matching
        const titleWords = article.title.toLowerCase().split(/\s+/);
        const descWords = article.description.toLowerCase().split(/\s+/);
        const allWords = [...titleWords, ...descWords];
        
        const matchingKeywords = keywords.filter(k => 
          allWords.some(word => word.includes(k.keyword.toLowerCase()) || k.keyword.toLowerCase().includes(word))
        );
        
        const storedArticle: StoredNewsArticle = {
          id: `article-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: article.title,
          description: article.description,
          url: article.url,
          urlToImage: article.urlToImage || null,
          publishedAt: article.publishedAt,
          source: {
            id: article.source.id || null,
            name: article.source.name
          },
          relevanceScore: Math.min(95, 30 + (matchingKeywords.length * 20)),
          keywords: matchingKeywords.map(k => k.keyword),
          campaignId
        };

        articlesWithScores.push(storedArticle);
      }
    }

    // Sort by relevance score descending, then by publish date descending
    articlesWithScores.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    // Store articles for this campaign
    const existingArticles = campaignArticles.get(campaignId) || [];
    const newArticles = articlesWithScores.filter(article => 
      !existingArticles.some(existing => existing.url === article.url)
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

// Get articles for campaign
router.get('/articles/:campaignId', requireAuth, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.user!.id;

    // Verify campaign ownership
    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const articles = campaignArticles.get(campaignId) || [];
    
    // Sort by publish date descending (newest first)
    articles.sort((a, b) => 
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

    // Verify campaign ownership
    const campaign = await db.query.campaigns.findFirst({
      where: and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId))
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const articles = campaignArticles.get(campaignId) || [];
    const articlesToTransfer = articles.filter(article => articleIds.includes(article.id));

    if (articlesToTransfer.length === 0) {
      return res.status(400).json({ error: 'No articles found to transfer' });
    }

    // Scrape full content for each article and transfer to Module 6
    for (const article of articlesToTransfer) {
      try {
        // Simulate content scraping with sample content
        const fullContent = `This is the full article content for: ${article.title}. 
        
        ${article.description}
        
        This article was published by ${article.source.name} and discusses important industry developments that could be relevant for NewsJacking opportunities. The content provides insights into current market trends and could serve as a foundation for creating timely, relevant content that connects your brand to breaking news.
        
        Key takeaways from this article include strategic implications for businesses in the digital marketing space, potential opportunities for thought leadership, and emerging trends that savvy marketers should monitor for NewsJacking potential.`;

        // Insert into news items (Module 6 format)
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

        console.log(`Transferred article "${article.title}" to Module 6`);
      } catch (transferError) {
        console.error(`Failed to transfer article ${article.id}:`, transferError);
      }
    }

    // Remove transferred articles from Module 5 storage
    const remainingArticles = articles.filter(article => !articleIds.includes(article.id));
    campaignArticles.set(campaignId, remainingArticles);

    res.json({ 
      count: articlesToTransfer.length,
      transferred: articlesToTransfer.map(a => ({ id: a.id, title: a.title }))
    });
  } catch (error) {
    console.error('Error transferring articles:', error);
    res.status(500).json({ error: 'Failed to transfer articles' });
  }
});

// Delete articles from Module 5
router.delete('/articles', requireAuth, async (req, res) => {
  try {
    const { articleIds } = req.body;

    if (!articleIds || articleIds.length === 0) {
      return res.status(400).json({ error: 'No article IDs provided' });
    }

    let deletedCount = 0;

    // Remove articles from all campaigns
    for (const [campaignId, articles] of campaignArticles.entries()) {
      const originalLength = articles.length;
      const remainingArticles = articles.filter(article => !articleIds.includes(article.id));
      
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