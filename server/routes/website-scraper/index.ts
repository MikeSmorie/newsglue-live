import express from 'express';
import { z } from 'zod';

const router = express.Router();

const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

const scrapeSchema = z.object({
  url: z.string().url('Must be a valid URL'),
});

// POST /api/website-scraper/scrape - Scrape website content
router.post('/scrape', requireAuth, async (req, res) => {
  try {
    const validatedData = scrapeSchema.parse(req.body);
    const { url } = validatedData;

    // Basic fetch to get website content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsJack-Bot/1.0)',
      },
    });

    if (!response.ok) {
      return res.status(400).json({ 
        error: 'Failed to fetch website',
        details: `HTTP ${response.status}: ${response.statusText}`
      });
    }

    const html = await response.text();
    
    // Extract basic metadata using regex patterns
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    
    // Extract Open Graph data
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const ogDescriptionMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
    
    // Extract main text content (basic approach)
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract first 1000 characters as preview
    const contentPreview = textContent.substring(0, 1000);

    const scrapedData = {
      url,
      title: titleMatch?.[1] || ogTitleMatch?.[1] || 'No title found',
      description: descriptionMatch?.[1] || ogDescriptionMatch?.[1] || 'No description found',
      keywords: keywordsMatch?.[1]?.split(',').map(k => k.trim()) || [],
      ogImage: ogImageMatch?.[1] || null,
      contentPreview,
      scrapedAt: new Date().toISOString(),
      status: 'success'
    };

    res.json(scrapedData);
  } catch (error) {
    console.error('Website scraping error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    res.status(500).json({ 
      error: 'Failed to scrape website',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;