import { Router } from 'express';
import { db } from '../../db/index.js';
import { newsItems } from '../../db/schema.js';
import { isNotNull } from 'drizzle-orm';

const router = Router();

// GET /ai-sitemap.xml - Dynamic sitemap for published landing pages
router.get('/ai-sitemap.xml', async (req, res) => {
  try {
    // Fetch all news items with published landing pages
    const publishedItems = await db.query.newsItems.findMany({
      where: isNotNull(newsItems.platformOutputs),
      orderBy: (newsItems, { desc }) => [desc(newsItems.updatedAt)]
    });

    // Filter items that have published landing pages
    const landingPageItems = publishedItems.filter(item => {
      const platformOutputs = item.platformOutputs as any;
      return platformOutputs?.blog?.landingPageStatus === 'published' && 
             platformOutputs?.blog?.landingPageSlug;
    });

    // Generate sitemap XML
    const baseUrl = process.env.LANDING_PAGE_BASE_URL || 'https://seo-landing-host-michaelsthewrit.replit.app';
    const currentDate = new Date().toISOString();
    
    const sitemapEntries = landingPageItems.map(item => {
      const platformOutputs = item.platformOutputs as any;
      const slug = platformOutputs.blog.landingPageSlug;
      const lastMod = item.updatedAt ? item.updatedAt.toISOString() : currentDate;
      
      return `  <url>
    <loc>${baseUrl}/news/${slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join('\n');

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- AI-Discoverable NewsGlue Content Sitemap -->
  <!-- Generated: ${currentDate} -->
  <!-- Total URLs: ${landingPageItems.length} -->
  
  <!-- Main landing page -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Published NewsJack articles -->
${sitemapEntries}
  
  <!-- AI Discovery endpoints -->
  <url>
    <loc>${baseUrl}/ai-discovery</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

    res.set({
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      'X-Robots-Tag': 'noindex' // Don't index the sitemap itself
    });
    
    res.send(sitemapXml);

  } catch (error) {
    console.error('Error generating AI sitemap:', error);
    res.status(500).set('Content-Type', 'application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Error generating sitemap -->
</urlset>`);
  }
});

// GET /robots.txt - Robots file for SEO
router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.LANDING_PAGE_BASE_URL || 'https://seo-landing-host-michaelsthewrit.replit.app';
  
  const robotsTxt = `User-agent: *
Allow: /news/
Allow: /ai-discovery
Disallow: /admin/
Disallow: /api/

# AI and Search Engine Discovery
User-agent: GPTBot
Allow: /news/
Allow: /ai-discovery
Allow: /ai-sitemap.xml

User-agent: Google-Extended
Allow: /news/
Allow: /ai-discovery

User-agent: ChatGPT-User
Allow: /news/
Allow: /ai-discovery

User-agent: CCBot
Allow: /news/
Allow: /ai-discovery

Sitemap: ${baseUrl}/ai-sitemap.xml

# NewsGlue AI Content Platform
# Last updated: ${new Date().toISOString()}`;

  res.set('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

export default router;