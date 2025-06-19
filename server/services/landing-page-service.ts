import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create slug from headline
export function createSlug(headline: string): string {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .substring(0, 60); // Limit length for SEO
}

// Generate comprehensive landing page content with SEO optimization
export async function generateLandingPageContent(
  headline: string, 
  content: string, 
  campaignData?: any
): Promise<string> {
  const slug = createSlug(headline);
  const publishDate = new Date().toISOString();
  const description = content.substring(0, 160).replace(/\n/g, ' ') + '...';
  
  // Extract first paragraph for excerpt
  const excerpt = content.split('\n')[0] || description;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- SEO Meta Tags -->
    <title>${headline} | NewsGlue Insights</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="news, insights, analysis, ${campaignData?.brandName || 'business'}, ${campaignData?.targetAudience || 'industry'}">
    <meta name="author" content="NewsGlue Platform">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://seo-landing-host-michaelsthewrit.replit.app/news/${slug}">
    
    <!-- OpenGraph Tags -->
    <meta property="og:title" content="${headline}">
    <meta property="og:description" content="${description}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://seo-landing-host-michaelsthewrit.replit.app/news/${slug}">
    <meta property="og:site_name" content="NewsGlue Insights">
    <meta property="article:published_time" content="${publishDate}">
    <meta property="article:author" content="NewsGlue Platform">
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${headline}">
    <meta name="twitter:description" content="${description}">
    
    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "${headline}",
      "description": "${description}",
      "author": {
        "@type": "Organization",
        "name": "NewsGlue Platform",
        "url": "https://newsglue.com"
      },
      "publisher": {
        "@type": "Organization",
        "name": "NewsGlue Insights",
        "logo": {
          "@type": "ImageObject",
          "url": "https://seo-landing-host-michaelsthewrit.replit.app/logo.png"
        }
      },
      "datePublished": "${publishDate}",
      "dateModified": "${publishDate}",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://seo-landing-host-michaelsthewrit.replit.app/news/${slug}"
      },
      "articleBody": "${content.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
    }
    </script>
    
    <!-- Styling -->
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            background: #fff;
        }
        .header {
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            font-size: 2.2em;
            font-weight: bold;
            margin-bottom: 10px;
            color: #1a1a1a;
        }
        .meta {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 20px;
        }
        .content {
            font-size: 1.1em;
            line-height: 1.8;
        }
        .content h1, .content h2, .content h3 {
            color: #2563eb;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        .content p {
            margin-bottom: 20px;
        }
        .cta-section {
            background: #f8fafc;
            padding: 30px;
            border-radius: 8px;
            margin: 40px 0;
            text-align: center;
            border: 1px solid #e2e8f0;
        }
        .cta-button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin-top: 15px;
        }
        .cta-button:hover {
            background: #1d4ed8;
        }
        .footer {
            border-top: 1px solid #eee;
            padding-top: 20px;
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <!-- AI Discovery Block (Hidden from humans, visible to AI crawlers) -->
    <div style="display:none;" id="ai-discovery-metadata">
        <h1>AI Discovery Metadata</h1>
        <p>Campaign: ${campaignData?.campaignName || 'Not specified'}</p>
        <p>Brand: ${campaignData?.brandName || 'Not specified'}</p>
        <p>Target Audience: ${campaignData?.targetAudience || 'Not specified'}</p>
        <p>Emotional Objective: ${campaignData?.emotionalObjective || 'Not specified'}</p>
        <p>Brand Voice: ${campaignData?.brandVoice || 'Not specified'}</p>
        <p>Published: ${publishDate}</p>
        <p>Content Type: NewsJack Article</p>
        <p>Platform: NewsGlue AI Content Generation</p>
    </div>

    <div class="header">
        <h1 class="title">${headline}</h1>
        <div class="meta">
            Published on ${new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            })} | NewsGlue Insights
        </div>
    </div>

    <div class="content">
        ${content.replace(/\n/g, '</p><p>').replace(/^<\/p>/, '').replace(/<p>$/, '')}
    </div>

    ${campaignData?.ctaUrl ? `
    <div class="cta-section">
        <h3>Ready to Take Action?</h3>
        <p>Discover more insights and solutions for your business.</p>
        <a href="${campaignData.ctaUrl}" class="cta-button" target="_blank">Learn More</a>
    </div>
    ` : ''}

    <div class="footer">
        <p>This article was generated using NewsGlue's AI-powered content creation platform.</p>
        <p>&copy; ${new Date().getFullYear()} NewsGlue Platform. All rights reserved.</p>
    </div>
</body>
</html>`;
}

// Save landing page HTML to public directory
export async function saveLandingPageHTML(
  newsItem: any, 
  slug: string, 
  blogContent: string
): Promise<string> {
  // Ensure public/landing-pages directory exists
  const publicDir = path.join(process.cwd(), 'public');
  const landingPagesDir = path.join(publicDir, 'landing-pages');
  
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  if (!fs.existsSync(landingPagesDir)) {
    fs.mkdirSync(landingPagesDir, { recursive: true });
  }

  // Get campaign data if available
  let campaignData = null;
  try {
    // This would need to be fetched from database in real implementation
    campaignData = {
      campaignName: 'Default Campaign',
      brandName: 'NewsGlue',
      targetAudience: 'Business professionals',
      emotionalObjective: 'Inform and engage',
      brandVoice: 'Professional and insightful',
      ctaUrl: null
    };
  } catch (error) {
    console.error('Error fetching campaign data:', error);
  }

  // Generate complete HTML content
  const htmlContent = await generateLandingPageContent(
    newsItem.headline,
    blogContent,
    campaignData
  );

  // Save to file
  const filePath = path.join(landingPagesDir, `${slug}.html`);
  fs.writeFileSync(filePath, htmlContent, 'utf8');

  // Return public URL
  const baseUrl = process.env.LANDING_PAGE_BASE_URL || 'https://seo-landing-host-michaelsthewrit.replit.app';
  return `${baseUrl}/news/${slug}`;
}