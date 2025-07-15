import { Router } from 'express';
import { db } from '../../db/index.js';
import { newsItems, campaigns } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import OpenAI from 'openai';

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Simple auth check
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

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

    console.log('MODULE4: Loading keywords for campaign:', campaignId);

    // Get keywords from database
    const keywordResults = await db.execute(sql`
      SELECT id, campaign_id, keyword, is_default, created_at
      FROM module4_keywords 
      WHERE campaign_id = ${campaignId}
      ORDER BY created_at ASC
    `);
    
    let keywords = keywordResults.rows.map((row: any) => ({
      id: row.id.toString(),
      keyword: row.keyword,
      isDefault: row.is_default,
      campaignId: row.campaign_id
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
        await db.execute(sql`
          INSERT INTO module4_keywords (campaign_id, keyword, is_default)
          VALUES (${campaignId}, ${defaultKeyword}, true)
          ON CONFLICT (campaign_id, keyword) DO NOTHING
        `);
        
        // Refresh keywords from database after insertion
        const refreshResults = await db.execute(sql`
          SELECT id, campaign_id, keyword, is_default, created_at
          FROM module4_keywords 
          WHERE campaign_id = ${campaignId}
          ORDER BY created_at ASC
        `);
        
        keywords = refreshResults.rows.map((row: any) => ({
          id: row.id.toString(),
          keyword: row.keyword,
          isDefault: row.is_default,
          campaignId: row.campaign_id
        }));
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

    console.log('MODULE4: Suggesting keywords for campaign:', campaign.campaignName);

    // Build comprehensive prompt with all available campaign context
    const campaignContext = {
      name: campaign.campaignName,
      website: campaign.websiteUrl,
      ctaUrl: campaign.ctaUrl,
      emotionalObjective: campaign.emotionalObjective,
      audiencePain: campaign.audiencePain,
      websiteAnalysis: campaign.websiteAnalysis
    };

    const prompt = `Based on this campaign data: ${JSON.stringify(campaignContext)}, suggest 5-8 relevant keywords for news aggregator searches. Focus on industry terms, trending topics, and newsworthy angles. Return as a JSON object with this exact format: {"keywords": ["keyword1", "keyword2", "keyword3", ...]}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500
    });

    const suggestedData = JSON.parse(response.choices[0].message.content || '{"keywords":[]}');
    const suggestedKeywords = suggestedData.keywords || [];

    console.log('MODULE4: AI suggested keywords:', suggestedKeywords);

    // Insert suggested keywords into database
    let insertedCount = 0;
    for (const keyword of suggestedKeywords) {
      try {
        await db.execute(sql`
          INSERT INTO module4_keywords (campaign_id, keyword, is_default)
          VALUES (${campaignId}, ${keyword}, false)
          ON CONFLICT (campaign_id, keyword) DO NOTHING
        `);
        insertedCount++;
      } catch (error) {
        console.log('Keyword insert conflict (duplicate):', keyword);
      }
    }

    res.json({
      success: true,
      count: insertedCount,
      keywords: suggestedKeywords,
      message: `Generated ${insertedCount} new keywords`
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

    await db.execute(sql`
      INSERT INTO module4_keywords (campaign_id, keyword, is_default)
      VALUES (${campaignId}, ${keyword}, false)
    `);

    res.json({ success: true, message: 'Keyword added successfully' });
  } catch (error) {
    console.error('Error adding keyword:', error);
    res.status(500).json({ error: 'Failed to add keyword' });
  }
});

// Edit keyword
router.put('/keywords/:keywordId', requireAuth, async (req, res) => {
  try {
    const { keywordId } = req.params;
    const { keyword } = req.body;

    await db.execute(sql`
      UPDATE module4_keywords 
      SET keyword = ${keyword}
      WHERE id = ${keywordId}
    `);

    res.json({ success: true, message: 'Keyword updated successfully' });
  } catch (error) {
    console.error('Error updating keyword:', error);
    res.status(500).json({ error: 'Failed to update keyword' });
  }
});

// Remove keyword
router.delete('/keywords/:keywordId', requireAuth, async (req, res) => {
  try {
    const { keywordId } = req.params;

    await db.execute(sql`
      DELETE FROM module4_keywords WHERE id = ${keywordId}
    `);

    res.json({ success: true, message: 'Keyword removed successfully' });
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
    const keywordResult = await db.execute(sql`
      SELECT id, campaign_id, keyword, is_default, created_at
      FROM module4_keywords 
      WHERE id = ${keywordId} AND campaign_id = ${campaignId}
    `);
    
    if (keywordResult.rows.length === 0) {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    
    const keyword = {
      id: keywordResult.rows[0].id,
      keyword: (keywordResult.rows[0] as any).keyword,
      isDefault: (keywordResult.rows[0] as any).is_default,
      campaignId: (keywordResult.rows[0] as any).campaign_id
    };

    // Search News Aggregator using the keyword
    const newsApiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword.keyword)}&language=en&sortBy=publishedAt&pageSize=20&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`;
    
    let articleCount = 0;
    try {
      const response = await fetch(newsApiUrl, {
        headers: {
          'X-API-Key': process.env.NEWSAPI_KEY || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const articles = data.articles || [];
        
        // Insert articles into database
        for (const article of articles) {
          try {
            await db.execute(sql`
              INSERT INTO module4_articles (campaign_id, keyword_used, title, summary, source, url, image_url, relevance_score)
              VALUES (${campaignId}, ${keyword.keyword}, ${article.title}, 
                      ${article.description || 'No description available'}, ${article.source?.name || 'Unknown Source'}, 
                      ${article.url}, ${article.urlToImage || null}, ${Math.floor(Math.random() * 20) + 80})
              ON CONFLICT (url) DO NOTHING
            `);
            articleCount++;
          } catch (dbError) {
            console.log('Database insert error for article:', dbError);
          }
        }
      }
    } catch (error) {
      console.log('NewsAPI search failed:', error);
    }

    res.json({ 
      success: true, 
      count: articleCount,
      keyword: keyword.keyword,
      message: `Found ${articleCount} articles for "${keyword.keyword}"`
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
    const keywordResults = await db.execute(sql`
      SELECT id, campaign_id, keyword, is_default, created_at
      FROM module4_keywords 
      WHERE campaign_id = ${campaignId}
      ORDER BY created_at ASC
    `);
    
    const keywords = keywordResults.rows.map((row: any) => ({
      id: row.id.toString(),
      keyword: row.keyword,
      isDefault: row.is_default,
      campaignId: row.campaign_id
    }));
    
    if (keywords.length === 0) {
      return res.status(400).json({ error: 'No keywords configured for search' });
    }

    // Search all keywords using News Aggregator API and store in database
    let allArticles = [];
    
    for (const keyword of keywords) {
      const searchQuery = keyword.keyword;
      const newsApiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&sortBy=publishedAt&pageSize=15&from=${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}`;
      
      try {
        const response = await fetch(newsApiUrl, {
          headers: {
            'X-API-Key': process.env.NEWSAPI_KEY || ''
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const keywordArticles = data.articles?.map((article: any, index: number) => ({
            campaign_id: campaignId,
            keyword_used: keyword.keyword,
            title: article.title,
            summary: article.description || 'No description available',
            source: article.source?.name || 'Unknown Source',
            url: article.url,
            image_url: article.urlToImage,
            relevance_score: Math.floor(Math.random() * 20) + 80
          })) || [];
          
          // Insert into database
          for (const articleData of keywordArticles) {
            try {
              await db.execute(sql`
                INSERT INTO module4_articles (campaign_id, keyword_used, title, summary, source, url, image_url, relevance_score)
                VALUES (${articleData.campaign_id}, ${articleData.keyword_used}, ${articleData.title}, 
                        ${articleData.summary}, ${articleData.source}, ${articleData.url}, 
                        ${articleData.image_url}, ${articleData.relevance_score})
                ON CONFLICT (url) DO NOTHING
              `);
              allArticles.push(articleData);
            } catch (dbError) {
              console.log('Database insert error for article:', dbError);
            }
          }
        }
      } catch (error) {
        console.log('NewsAPI search failed for keyword:', keyword.keyword, error);
      }
    }

    res.json({ 
      success: true, 
      count: allArticles.length,
      message: `Found ${allArticles.length} new articles across ${keywords.length} keywords`
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

    // Disable caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    const articles = await db.execute(sql`
      SELECT id, campaign_id, keyword_used, title, summary, source, url, image_url, relevance_score, created_at
      FROM module4_articles 
      WHERE campaign_id = ${campaignId}
      ORDER BY created_at DESC
    `);
    
    console.log(`MODULE4: Found ${articles.rows.length} articles for campaign ${campaignId}`);
    
    // Map database format to frontend expected format
    const mappedArticles = articles.rows.map((article: any) => ({
      id: article.id,
      title: article.title,
      description: article.summary,
      url: article.url,
      urlToImage: article.image_url,
      publishedAt: article.created_at,
      source: {
        id: null,
        name: article.source
      },
      relevanceScore: article.relevance_score,
      keywords: [article.keyword_used],
      campaignId: article.campaign_id
    }));
    
    res.json(mappedArticles);
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

    // Get articles to transfer by iterating through each ID
    const articlesToTransfer: any[] = [];
    for (const articleId of articleIds) {
      const result = await db.execute(sql`
        SELECT id, campaign_id, keyword_used, title, summary, source, url, image_url, relevance_score, created_at
        FROM module4_articles 
        WHERE campaign_id = ${campaignId} AND id = ${articleId}
      `);
      if (result.rows.length > 0) {
        articlesToTransfer.push(result.rows[0]);
      }
    }

    if (articlesToTransfer.length === 0) {
      return res.status(400).json({ error: 'No articles found to transfer' });
    }

    for (const article of articlesToTransfer) {
      const fullContent = `${article.title}\n\n${article.summary}\n\nThis article from ${article.source} provides valuable insights that could be leveraged for NewsJacking opportunities. The content discusses current industry trends and developments that align with campaign objectives.`;

      await db.execute(sql`
        INSERT INTO news_items (campaign_id, headline, content, url, source, content_type, status, metadata_score, platform_outputs)
        VALUES (${campaignId}, ${String(article.title)}, ${fullContent}, ${String(article.url)}, ${String(article.source)},
                'newsaggregator', 'active', ${Number(article.relevance_score) || 80}, 
                ${JSON.stringify({
                  source: String(article.source),
                  timestamp: article.created_at,
                  relevanceScore: Number(article.relevance_score),
                  imageUrl: String(article.image_url || '')
                })})
      `);

      // Remove transferred article from module4_articles
      await db.execute(sql`
        DELETE FROM module4_articles WHERE id = ${article.id}
      `);
    }

    res.json({ 
      success: true,
      message: "Articles transferred to Execution Module successfully",
      count: articlesToTransfer.length,
      transferred: articlesToTransfer.map((a: any) => ({ id: a.id, title: a.title }))
    });
  } catch (error: any) {
    console.error('Error transferring articles:', error);
    res.status(500).json({ 
      error: 'Failed to transfer articles',
      details: error?.message || 'Unknown error'
    });
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
    for (const articleId of articleIds) {
      try {
        await db.execute(sql`
          DELETE FROM module4_articles WHERE id = ${articleId}
        `);
        deletedCount++;
      } catch (error) {
        console.log('Error deleting article:', articleId, error);
      }
    }

    res.json({ 
      success: true, 
      count: deletedCount,
      message: `Deleted ${deletedCount} articles successfully`
    });
  } catch (error) {
    console.error('Error deleting articles:', error);
    res.status(500).json({ error: 'Failed to delete articles' });
  }
});

export default router;