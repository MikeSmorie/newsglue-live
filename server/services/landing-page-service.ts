import fs from 'fs';
import path from 'path';
import { db } from '../../db/index.js';
import { newsItems } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

// Create slug from headline
function createSlug(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
}

// Build landing page HTML content
function buildLandingPageHtml(newsjack: any, campaign: any): string {
  const blogContent = newsjack.platformOutputs?.blog?.content || '';
  const headline = newsjack.headline || 'NewsJack Content';
  const slug = createSlug(headline);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${headline}</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="${blogContent.substring(0, 160).replace(/"/g, '&quot;')}" />
    <meta name="keywords" content="news, insights, analysis, ${campaign?.campaignName || ''}" />
    <meta name="author" content="NewsGlue Platform" />
    
    <!-- Open Graph Tags -->
    <meta property="og:title" content="${headline}" />
    <meta property="og:description" content="${blogContent.substring(0, 160).replace(/"/g, '&quot;')}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${process.env.REPLIT_DEV_DOMAIN || 'https://newsglue.com'}/news/${slug}" />
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${headline}" />
    <meta name="twitter:description" content="${blogContent.substring(0, 160).replace(/"/g, '&quot;')}" />
    
    <!-- Schema.org Markup -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "${headline}",
      "description": "${blogContent.substring(0, 160).replace(/"/g, '&quot;')}",
      "author": {
        "@type": "Organization",
        "name": "NewsGlue Platform"
      },
      "publisher": {
        "@type": "Organization",
        "name": "NewsGlue Platform"
      },
      "datePublished": "${new Date().toISOString()}",
      "dateModified": "${new Date().toISOString()}"
    }
    </script>
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 20px;
        }
        
        .header h1 {
            font-size: 2.5rem;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 10px;
        }
        
        .header .meta {
            color: #6b7280;
            font-size: 0.9rem;
        }
        
        .content {
            font-size: 1.1rem;
            line-height: 1.8;
            margin-bottom: 40px;
        }
        
        .content h1, .content h2, .content h3 {
            color: #1f2937;
            margin-top: 2rem;
            margin-bottom: 1rem;
        }
        
        .content h1 { font-size: 2rem; }
        .content h2 { font-size: 1.5rem; }
        .content h3 { font-size: 1.25rem; }
        
        .content p {
            margin-bottom: 1.5rem;
        }
        
        .cta {
            background: #2563eb;
            color: white;
            padding: 15px 30px;
            border-radius: 8px;
            text-decoration: none;
            display: inline-block;
            font-weight: bold;
            margin: 20px 0;
            transition: background 0.3s ease;
        }
        
        .cta:hover {
            background: #1d4ed8;
            color: white;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 0.9rem;
        }
        
        .source-link {
            margin-top: 20px;
            padding: 15px;
            background: #f9fafb;
            border-left: 4px solid #10b981;
            border-radius: 4px;
        }
        
        .source-link a {
            color: #059669;
            text-decoration: none;
        }
        
        .source-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${headline}</h1>
        <div class="meta">
            Published ${new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })} | NewsGlue Platform
        </div>
    </div>
    
    <div class="content">
        ${blogContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>')}
    </div>
    
    ${newsjack.platformOutputs?.blog?.ctaUrl && newsjack.platformOutputs.blog.ctaUrl !== 'null' ? `
    <div style="text-align: center;">
        <a href="${newsjack.platformOutputs.blog.ctaUrl}" class="cta" target="_blank" rel="noopener">
            ${newsjack.platformOutputs?.blog?.cta || 'Learn More'}
        </a>
    </div>
    ` : ''}
    
    ${newsjack.sourceUrl ? `
    <div class="source-link">
        <strong>Source:</strong> <a href="${newsjack.sourceUrl}" target="_blank" rel="noopener">${newsjack.sourceUrl}</a>
    </div>
    ` : ''}
    
    <div class="footer">
        <p>Powered by NewsGlue Platform | AI-Driven Content Intelligence</p>
    </div>
</body>
</html>`;
}

// Generate and publish landing page content with dual-path approach
export async function generateLandingPageContent(newsjackId: number): Promise<{ slug: string; url: string; status: string }> {
  try {
    // Fetch the newsjack data
    const newsItem = await db.query.newsItems.findFirst({
      where: eq(newsItems.id, newsjackId),
      with: {
        campaign: true
      }
    });

    if (!newsItem) {
      throw new Error('News item not found');
    }

    // Create slug from headline
    const slug = createSlug(newsItem.headline);
    
    // Build HTML content
    const htmlContent = buildLandingPageHtml(newsItem, newsItem.campaign);
    
    // Ensure landing pages directory exists
    const landingPagesDir = path.join(process.cwd(), 'public', 'landing-pages');
    if (!fs.existsSync(landingPagesDir)) {
      fs.mkdirSync(landingPagesDir, { recursive: true });
    }
    
    // Save locally to public/landing-pages/{slug}.html
    const filePath = path.join(landingPagesDir, `${slug}.html`);
    fs.writeFileSync(filePath, htmlContent, 'utf8');
    
    let externalStatus = 'failed';
    let externalUrl = '';
    
    // Send to external SEO host
    try {
      const response = await fetch('https://seo-landing-host-michaelsthewrit.replit.app/api/landing-page', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'NewsGlue-Platform/1.0'
        },
        body: JSON.stringify({ 
          slug, 
          html: htmlContent,
          headline: newsItem.headline,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        const result = await response.json();
        externalStatus = 'published';
        externalUrl = result.url || `https://seo-landing-host-michaelsthewrit.replit.app/news/${slug}`;
      } else {
        console.warn(`External SEO host returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.warn('Failed to publish to external SEO host:', error);
      // Continue with local success even if external fails
    }
    
    // Update database with landing page info
    const platformOutputs = newsItem.platformOutputs as any;
    await db.update(newsItems)
      .set({
        platformOutputs: {
          ...platformOutputs,
          blog: {
            ...platformOutputs.blog,
            landingPageStatus: 'published',
            landingPageSlug: slug,
            landingPageUrl: `/news/${slug}`,
            externalUrl: externalUrl,
            externalStatus: externalStatus,
            publishedAt: new Date().toISOString()
          }
        }
      })
      .where(eq(newsItems.id, newsjackId));
    
    return {
      slug,
      url: `/news/${slug}`,
      status: 'published'
    };
    
  } catch (error) {
    console.error('Error generating landing page content:', error);
    throw error;
  }
}

// Legacy function for backward compatibility
export async function generateLandingPageContentLegacy(headline: string, content: string, campaignData: any): Promise<string> {
  const mockNewsItem = {
    headline,
    content,
    sourceUrl: '',
    platformOutputs: {
      blog: {
        content,
        cta: 'Learn More',
        ctaUrl: campaignData?.websiteUrl || ''
      }
    }
  };
  
  return buildLandingPageHtml(mockNewsItem, campaignData);
}