import { db } from '../../db/index.js';
import { newsItems } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

export async function createSampleAIDiscoverabilityData(campaignId: string) {
  // Create sample blog-style news items with AI discoverability data
  const sampleBlogs = [
    {
      headline: "Revolutionary AI Tool Transforms Content Marketing",
      content: "Artificial intelligence continues to reshape the digital marketing landscape...",
      sourceUrl: "https://example.com/ai-marketing-revolution",
      contentType: "blog",
      platformOutputs: JSON.stringify({
        blog: {
          slug: "ai-tool-transforms-content-marketing",
          title: "Revolutionary AI Tool Transforms Content Marketing",
          content: "Complete blog content here...",
          canonicalTag: true,
          openGraph: true,
          jsonLD: true,
          aiDiscoveryBlock: true,
          sitemapInclusion: true,
          publishedUrl: "/landing-pages/ai-tool-transforms-content-marketing.html"
        }
      }),
      lastAICrawlAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      metadataScore: 5,
      sitemapStatus: "included",
      indexable: true
    },
    {
      headline: "Small Business SEO Strategy Updates for 2025",
      content: "Search engine optimization continues to evolve with new AI-driven algorithms...",
      sourceUrl: "https://example.com/seo-strategy-2025",
      contentType: "blog",
      platformOutputs: JSON.stringify({
        blog: {
          slug: "small-business-seo-strategy-2025",
          title: "Small Business SEO Strategy Updates for 2025",
          content: "Complete blog content here...",
          canonicalTag: true,
          openGraph: false,
          jsonLD: true,
          aiDiscoveryBlock: true,
          sitemapInclusion: true,
          publishedUrl: "/landing-pages/small-business-seo-strategy-2025.html"
        }
      }),
      lastAICrawlAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      metadataScore: 4,
      sitemapStatus: "included",
      indexable: true
    },
    {
      headline: "Digital Privacy Laws Impact Content Creation",
      content: "New privacy regulations require content creators to adapt their strategies...",
      sourceUrl: "https://example.com/privacy-laws-content",
      contentType: "blog",
      platformOutputs: JSON.stringify({
        blog: {
          slug: "digital-privacy-laws-content-creation",
          title: "Digital Privacy Laws Impact Content Creation",
          content: "Complete blog content here...",
          canonicalTag: false,
          openGraph: true,
          jsonLD: false,
          aiDiscoveryBlock: false,
          sitemapInclusion: false,
          publishedUrl: "/landing-pages/digital-privacy-laws-content-creation.html"
        }
      }),
      lastAICrawlAt: null, // Never crawled
      metadataScore: 2,
      sitemapStatus: "excluded",
      indexable: false
    }
  ];

  // Insert sample blog data
  for (const blog of sampleBlogs) {
    await db.insert(newsItems).values({
      campaignId,
      headline: blog.headline,
      content: blog.content,
      sourceUrl: blog.sourceUrl,
      contentType: blog.contentType,
      platformOutputs: blog.platformOutputs,
      lastAICrawlAt: blog.lastAICrawlAt,
      metadataScore: blog.metadataScore,
      sitemapStatus: blog.sitemapStatus,
      indexable: blog.indexable,
      status: 'active'
    });
  }

  console.log(`Created ${sampleBlogs.length} sample blog items for AI discoverability testing`);
}

export async function createSampleSitemapFile() {
  const fs = require('fs');
  const path = require('path');
  
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://newsglue.replit.app/landing-pages/ai-tool-transforms-content-marketing.html</loc>
    <lastmod>2025-06-17T00:00:00Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://newsglue.replit.app/landing-pages/small-business-seo-strategy-2025.html</loc>
    <lastmod>2025-06-14T00:00:00Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

  const sitemapPath = path.join(process.cwd(), 'public', 'ai-sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemapContent);
  
  console.log('Created sample AI sitemap file');
}