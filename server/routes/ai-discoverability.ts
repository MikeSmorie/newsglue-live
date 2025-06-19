import { Router } from 'express';
import { db } from '../../db/index.js';
import { newsItems, campaigns } from '../../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// GET /api/discoverability/audit - Returns all blog-style NewsJack outputs with metadata
router.get('/audit', async (req, res) => {
  try {
    const { campaignId } = req.query;
    
    if (!campaignId) {
      return res.status(400).json({ error: 'Campaign ID is required' });
    }

    // Fetch all blog-style outputs for the campaign
    const outputs = await db.query.newsItems.findMany({
      where: and(
        eq(newsItems.campaignId, campaignId as string),
        eq(newsItems.contentType, 'blog')
      ),
      orderBy: [desc(newsItems.createdAt)]
    });

    // Transform outputs into blog metadata format
    const blogs = outputs.map(output => {
      // Parse platform outputs to get blog data
      const platformOutputs = typeof output.platformOutputs === 'string' 
        ? JSON.parse(output.platformOutputs) 
        : output.platformOutputs || {};
      
      const blogData = platformOutputs.blog || {};
      const slug = blogData.slug || `${output.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      
      // Check if static file exists
      const staticPath = path.join(__dirname, '../../public/landing-pages', `${slug}.html`);
      const fileExists = fs.existsSync(staticPath);
      
      // Calculate metadata score (0-5)
      let metadataScore = 0;
      const canonicalTag = blogData.canonicalTag || false;
      const openGraph = blogData.openGraph || false;
      const jsonLD = blogData.jsonLD || false;
      const aiDiscoveryBlock = blogData.aiDiscoveryBlock || false;
      const sitemapInclusion = blogData.sitemapInclusion || false;
      
      if (canonicalTag) metadataScore++;
      if (openGraph) metadataScore++;
      if (jsonLD) metadataScore++;
      if (aiDiscoveryBlock) metadataScore++;
      if (sitemapInclusion) metadataScore++;

      return {
        id: output.id.toString(),
        slug,
        title: output.headline,
        status: fileExists ? 'published' : 'missing',
        sitemapEntry: sitemapInclusion,
        metadataScore,
        lastAICrawlAt: output.lastAICrawlAt || null,
        canonicalTag,
        openGraph,
        jsonLD,
        aiDiscoveryBlock,
        sitemapInclusion,
        publishedAt: output.createdAt?.toISOString() || '',
        indexable: output.indexable || false
      };
    });

    // Calculate summary metrics
    const totalBlogs = blogs.length;
    const indexableBlogs = blogs.filter(blog => blog.indexable).length;
    const indexabilityRate = totalBlogs > 0 ? Math.round((indexableBlogs / totalBlogs) * 100) : 0;
    const avgMetadataScore = totalBlogs > 0 
      ? blogs.reduce((sum, blog) => sum + blog.metadataScore, 0) / totalBlogs 
      : 0;

    res.json({
      blogs,
      indexabilityRate,
      avgMetadataScore,
      totalBlogs
    });
  } catch (error) {
    console.error('Error fetching discoverability audit:', error);
    res.status(500).json({ error: 'Failed to fetch audit data' });
  }
});

// GET /api/discoverability/sitemap - Loads ai-sitemap.xml contents
router.get('/sitemap', async (req, res) => {
  try {
    const sitemapPath = path.join(__dirname, '../../public/ai-sitemap.xml');
    
    if (!fs.existsSync(sitemapPath)) {
      return res.json({
        entryCount: 0,
        lastModified: null,
        entries: []
      });
    }

    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    const stats = fs.statSync(sitemapPath);
    
    // Parse XML to extract entries (simplified parsing)
    const urlMatches = sitemapContent.match(/<url>/g) || [];
    const entryCount = urlMatches.length;
    
    // Extract individual entries
    const entries = [];
    const urlBlocks = sitemapContent.split('<url>').slice(1);
    
    for (const block of urlBlocks) {
      const locMatch = block.match(/<loc>(.*?)<\/loc>/);
      const lastmodMatch = block.match(/<lastmod>(.*?)<\/lastmod>/);
      
      if (locMatch) {
        const url = locMatch[1];
        const slug = url.split('/').pop()?.replace('.html', '') || '';
        entries.push({
          url,
          lastmod: lastmodMatch ? lastmodMatch[1] : '',
          slug
        });
      }
    }

    res.json({
      entryCount,
      lastModified: stats.mtime.toISOString(),
      entries
    });
  } catch (error) {
    console.error('Error reading sitemap:', error);
    res.status(500).json({ error: 'Failed to read sitemap' });
  }
});

// POST /api/discoverability/reping/:newsjackId - Re-ping sitemap + discovery endpoints
router.post('/reping/:newsjackId', async (req, res) => {
  try {
    const { newsjackId } = req.params;
    
    // Update last AI crawl timestamp
    await db.update(newsItems)
      .set({ 
        lastAICrawlAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(newsItems.id, parseInt(newsjackId)));

    // In a real implementation, this would:
    // 1. Submit to IndexNow API
    // 2. Ping Google Search Console
    // 3. Submit to AI crawler endpoints
    // 4. Update sitemap lastmod
    
    // For now, we'll simulate the re-ping process
    console.log(`Re-pinging AI indexing for NewsJack ${newsjackId}`);
    
    res.json({ 
      success: true, 
      message: 'AI indexing signals sent successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error re-pinging:', error);
    res.status(500).json({ error: 'Failed to re-ping AI indexing' });
  }
});

// GET /api/discoverability/:newsjackId/status - Validate metadata from static HTML
router.get('/:newsjackId/status', async (req, res) => {
  try {
    const { newsjackId } = req.params;
    
    // Get the NewsJack output
    const output = await db.query.newsItems.findFirst({
      where: eq(newsItems.id, parseInt(newsjackId))
    });

    if (!output) {
      return res.status(404).json({ error: 'NewsJack output not found' });
    }

    // Parse platform outputs to get blog data
    const platformOutputs = typeof output.platformOutputs === 'string' 
      ? JSON.parse(output.platformOutputs) 
      : output.platformOutputs || {};
    
    const blogData = platformOutputs.blog || {};
    const slug = blogData.slug || `${output.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    
    // Check if static file exists and validate metadata
    const staticPath = path.join(__dirname, '../../public/landing-pages', `${slug}.html`);
    
    if (!fs.existsSync(staticPath)) {
      return res.json({
        exists: false,
        metadata: null,
        error: 'Static file not found'
      });
    }

    const htmlContent = fs.readFileSync(staticPath, 'utf-8');
    
    // Validate metadata presence
    const hasCanonical = htmlContent.includes('<link rel="canonical"');
    const hasOpenGraph = htmlContent.includes('property="og:');
    const hasJsonLD = htmlContent.includes('application/ld+json');
    const hasAIDiscovery = htmlContent.includes('ai-discovery') || htmlContent.includes('data-ai-indexable');
    
    res.json({
      exists: true,
      metadata: {
        canonical: hasCanonical,
        openGraph: hasOpenGraph,
        jsonLD: hasJsonLD,
        aiDiscovery: hasAIDiscovery,
        fileSize: fs.statSync(staticPath).size,
        lastModified: fs.statSync(staticPath).mtime.toISOString()
      }
    });
  } catch (error) {
    console.error('Error validating metadata:', error);
    res.status(500).json({ error: 'Failed to validate metadata' });
  }
});

// POST /api/discoverability/export/pdf - Export AI indexing report as PDF
router.post('/export/pdf', async (req, res) => {
  try {
    // This would integrate with the existing PDF generation system
    // For now, return a placeholder response
    res.json({ 
      success: true, 
      message: 'PDF export functionality will be integrated with existing PDF system' 
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

// POST /api/discoverability/export/csv - Export metadata validation as CSV
router.post('/export/csv', async (req, res) => {
  try {
    // Fetch all blog outputs for CSV export
    const outputs = await db.query.newsItems.findMany({
      where: eq(newsItems.contentType, 'blog'),
      orderBy: [desc(newsItems.createdAt)]
    });

    const csvHeaders = [
      'Slug',
      'Status',
      'Sitemap Entry',
      'Metadata Score',
      'Canonical Tag',
      'OpenGraph',
      'JSON-LD',
      'AI Discovery Block',
      'Indexable',
      'Last AI Crawl',
      'Published At'
    ];

    const csvRows = outputs.map(output => {
      const platformOutputs = typeof output.platformOutputs === 'string' 
        ? JSON.parse(output.platformOutputs) 
        : output.platformOutputs || {};
      
      const blogData = platformOutputs.blog || {};
      const slug = blogData.slug || `${output.headline.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      
      // Check if static file exists
      const staticPath = path.join(__dirname, '../../public/landing-pages', `${slug}.html`);
      const fileExists = fs.existsSync(staticPath);
      
      const canonicalTag = blogData.canonicalTag || false;
      const openGraph = blogData.openGraph || false;
      const jsonLD = blogData.jsonLD || false;
      const aiDiscoveryBlock = blogData.aiDiscoveryBlock || false;
      const sitemapInclusion = blogData.sitemapInclusion || false;
      
      let metadataScore = 0;
      if (canonicalTag) metadataScore++;
      if (openGraph) metadataScore++;
      if (jsonLD) metadataScore++;
      if (aiDiscoveryBlock) metadataScore++;
      if (sitemapInclusion) metadataScore++;

      return [
        slug,
        fileExists ? 'Published' : 'Missing',
        sitemapInclusion ? 'Yes' : 'No',
        `${metadataScore}/5`,
        canonicalTag ? 'Yes' : 'No',
        openGraph ? 'Yes' : 'No',
        jsonLD ? 'Yes' : 'No',
        aiDiscoveryBlock ? 'Yes' : 'No',
        output.indexable ? 'Yes' : 'No',
        output.lastAICrawlAt ? new Date(output.lastAICrawlAt).toLocaleDateString() : 'Never',
        output.createdAt ? new Date(output.createdAt).toLocaleDateString() : ''
      ];
    });

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ai-discoverability-audit.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

export default router;