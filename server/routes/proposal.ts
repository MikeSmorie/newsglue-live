import express from "express";
import { db } from "../../db/index.js";
import { campaigns, newsItems, campaignMetrics, outputMetrics } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { generateProposalHTML } from "../templates/proposal-template.js";
import puppeteer from "puppeteer";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { createWriteStream, unlinkSync, existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();

// Get system Chromium path
const getChromiumPath = () => {
  const possiblePaths = [
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
    '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome'
  ];
  
  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        return path;
      }
    } catch (e) {
      continue;
    }
  }
  return null; // Use default puppeteer chrome
};

// Generate binary PDF using Puppeteer
const generateProposalPDF = async (clientName: string, htmlContent: string, templateData: any): Promise<Buffer> => {
  let browser;
  
  try {
    const chromiumPath = getChromiumPath();
    console.log(`Using Chromium at: ${chromiumPath || 'default puppeteer chrome'}`);
    
    // Configure launch options
    const launchOptions: any = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-default-apps',
        '--no-zygote',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-blink-features=AutomationControlled',
        '--disable-ipc-flooding-protection'
      ],
      timeout: 20000
    };
    
    // Only set executablePath if we found a system chromium
    if (chromiumPath) {
      launchOptions.executablePath = chromiumPath;
    }
    
    // Launch browser
    browser = await puppeteer.launch(launchOptions);

    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 1600 });
    
    // Generate clean HTML with PDF-optimized styling
    const pdfHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Strategic NewsJack Proposal - ${clientName}</title>
    <style>
        @page { 
            size: A4; 
            margin: 0.75in; 
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body { 
            font-family: 'Arial', sans-serif; 
            font-size: 11pt; 
            line-height: 1.4; 
            color: #333; 
            background: white;
        }
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #2563eb; 
            padding-bottom: 20px; 
        }
        .header h1 {
            font-size: 24pt;
            color: #2563eb;
            margin-bottom: 10px;
            font-weight: bold;
        }
        .header .subtitle {
            font-size: 14pt;
            color: #666;
            margin-bottom: 5px;
        }
        .section { 
            margin-bottom: 25px; 
            page-break-inside: avoid;
        }
        h1 { 
            font-size: 20pt; 
            color: #2563eb; 
            margin: 20px 0 12px 0; 
            font-weight: bold;
        }
        h2 { 
            font-size: 16pt; 
            color: #333; 
            margin: 16px 0 10px 0; 
            font-weight: bold;
        }
        h3 { 
            font-size: 14pt; 
            color: #2563eb; 
            margin: 14px 0 8px 0; 
            font-weight: bold;
        }
        h4 { 
            font-size: 12pt; 
            color: #333; 
            margin: 12px 0 6px 0; 
            font-weight: bold;
        }
        p { 
            margin: 6px 0; 
            line-height: 1.5;
        }
        .platform-output, .platform-content { 
            background: #f8fafc; 
            padding: 12px; 
            margin: 8px 0; 
            border-left: 4px solid #2563eb; 
            border-radius: 3px;
            page-break-inside: avoid;
        }
        .highlight-box, .insight-box, .methodology-box { 
            background: #f0f8ff; 
            padding: 12px; 
            margin: 10px 0; 
            border: 1px solid #ddd; 
            border-radius: 4px;
            page-break-inside: avoid;
        }
        .logo { 
            max-width: 180px; 
            height: auto; 
            margin-bottom: 15px; 
        }
        .footer { 
            text-align: center; 
            margin-top: 30px; 
            font-size: 10pt; 
            color: #666; 
            border-top: 1px solid #eee;
            padding-top: 15px;
        }
        .cta-highlight {
            background: #fff3cd;
            padding: 2px 4px;
            border-radius: 2px;
        }
        .metrics {
            font-size: 9pt;
            color: #666;
            margin-top: 5px;
        }
        .metrics span {
            margin-right: 15px;
        }
        ul, ol {
            margin: 8px 0 8px 20px;
        }
        li {
            margin: 3px 0;
        }
        strong {
            font-weight: bold;
            color: #2563eb;
        }
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="container">
        ${htmlContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<!DOCTYPE[^>]*>|<html[^>]*>|<\/html>|<head[^>]*>[\s\S]*?<\/head>|<body[^>]*>|<\/body>/gi, '')}
    </div>
</body>
</html>`;

    // Set content and wait for it to load
    await page.setContent(pdfHtml, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Generate PDF with optimized settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '0.75in',
        right: '0.75in',
        bottom: '0.75in',
        left: '0.75in'
      },
      printBackground: true,
      preferCSSPageSize: true,
      timeout: 30000
    });

    return Buffer.from(pdfBuffer);

  } catch (error: any) {
    console.error('PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

// POST /api/proposal/generate - Generate proposal HTML
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const { campaignId, clientName } = req.body;
    const userId = req.user!.id;

    if (!campaignId || !clientName) {
      return res.status(400).json({ error: 'Campaign ID and client name are required' });
    }

    // Fetch campaign data with ownership verification
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });

    if (!campaign || campaign.userId !== userId) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    // Fetch news items with generated content
    const campaignNewsItems = await db.query.newsItems.findMany({
      where: eq(newsItems.campaignId, campaignId),
      orderBy: (newsItems, { desc }) => [desc(newsItems.updatedAt)],
      limit: 5
    });

    // Filter items that have generated platform outputs
    const newsItemsWithContent = campaignNewsItems.filter(item => 
      item.platformOutputs && Object.keys(item.platformOutputs as any).length > 0
    );

    if (newsItemsWithContent.length === 0) {
      return res.status(400).json({ 
        error: 'No generated content found for this campaign. Please generate NewsJack content first.' 
      });
    }

    // Fetch campaign metrics from Module 8
    let metrics = await db.query.campaignMetrics.findFirst({
      where: eq(campaignMetrics.campaignId, campaignId)
    });

    // Get output metrics for detailed calculations
    const outputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId)
    });

    // Calculate real-time metrics if outputs exist
    if (outputs.length > 0 && metrics) {
      const totalOutputs = outputs.length;
      const totalTimeSaved = outputs.reduce((sum, output) => sum + output.timeSavedSeconds, 0);
      const totalCostSaved = outputs.reduce((sum, output) => sum + parseFloat(output.costSaved), 0);
      const complianceCount = outputs.filter(output => output.complianceCheck).length;
      const ctaCount = outputs.filter(output => output.ctaPresent).length;
      
      const complianceScore = (complianceCount / totalOutputs * 100).toFixed(2);
      const ctaPresenceRate = (ctaCount / totalOutputs * 100).toFixed(2);
      const efficiencyScore = Math.min(100, (totalTimeSaved / (totalOutputs * 1800) * 100)).toFixed(2);
      
      // Update metrics object with calculated values
      metrics = {
        ...metrics,
        totalOutputs,
        totalTimeSavedSeconds: totalTimeSaved,
        totalCostSaved: totalCostSaved.toFixed(2),
        complianceScore,
        ctaPresenceRate,
        efficiencyScore
      };
    }

    // Prepare template data
    const proposalDate = new Date().toLocaleDateString();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

    const templateData = {
      clientName,
      proposalDate,
      validUntil,
      campaignData: campaign,
      newsItems: newsItemsWithContent,
      platformOutputs: [],
      metrics: metrics || null,
      outputs: outputs || []
    };

    // Generate HTML
    const html = generateProposalHTML(templateData);

    res.json({
      success: true,
      html,
      clientName,
      proposalDate,
      validUntil,
      campaignData: campaign
    });

  } catch (error) {
    console.error('Error generating proposal:', error);
    res.status(500).json({ error: 'Failed to generate proposal' });
  }
});

// POST /api/proposal/download/:format - Download proposal in specified format
router.post('/download/:format', requireAuth, async (req, res) => {
  try {
    const { format } = req.params;
    const { campaignId, clientName } = req.body;
    const userId = req.user!.id;

    if (!['pdf', 'html', 'docx'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Supported: pdf, html, docx' });
    }

    // Fetch campaign data with ownership verification
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId),
    });

    if (!campaign || campaign.userId !== userId) {
      return res.status(404).json({ error: 'Campaign not found or access denied' });
    }

    // Fetch news items with generated content
    const campaignNewsItems = await db.query.newsItems.findMany({
      where: eq(newsItems.campaignId, campaignId),
      orderBy: (newsItems, { desc }) => [desc(newsItems.updatedAt)],
      limit: 5
    });

    const newsItemsWithContent = campaignNewsItems.filter(item => 
      item.platformOutputs && Object.keys(item.platformOutputs as any).length > 0
    );

    // Fetch campaign metrics from Module 8
    let metrics = await db.query.campaignMetrics.findFirst({
      where: eq(campaignMetrics.campaignId, campaignId)
    });

    // Get output metrics for detailed calculations
    const outputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId)
    });

    // Calculate real-time metrics if outputs exist
    if (outputs.length > 0 && metrics) {
      const totalOutputs = outputs.length;
      const totalTimeSaved = outputs.reduce((sum, output) => sum + output.timeSavedSeconds, 0);
      const totalCostSaved = outputs.reduce((sum, output) => sum + parseFloat(output.costSaved), 0);
      const complianceCount = outputs.filter(output => output.complianceCheck).length;
      const ctaCount = outputs.filter(output => output.ctaPresent).length;
      
      const complianceScore = (complianceCount / totalOutputs * 100).toFixed(2);
      const ctaPresenceRate = (ctaCount / totalOutputs * 100).toFixed(2);
      const efficiencyScore = Math.min(100, (totalTimeSaved / (totalOutputs * 1800) * 100)).toFixed(2);
      
      // Update metrics object with calculated values
      metrics = {
        ...metrics,
        totalOutputs,
        totalTimeSavedSeconds: totalTimeSaved,
        totalCostSaved: totalCostSaved.toFixed(2),
        complianceScore,
        ctaPresenceRate,
        efficiencyScore
      };
    }

    // Prepare template data
    const proposalDate = new Date().toLocaleDateString();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

    const templateData = {
      clientName,
      proposalDate,
      validUntil,
      campaignData: campaign,
      newsItems: newsItemsWithContent,
      platformOutputs: [],
      metrics: metrics || null,
      outputs: outputs || []
    };

    const html = generateProposalHTML(templateData);

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${clientName.replace(/\s+/g, '-')}-proposal.html"`);
      return res.send(html);
    }

    if (format === 'pdf') {
      try {
        console.log(`Generating PDF for client: ${clientName}`);
        
        // Generate binary PDF using Puppeteer
        const pdfBuffer = await generateProposalPDF(clientName, html, templateData);
        
        // Set proper headers for binary PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${clientName.replace(/\s+/g, '-')}-proposal-${Date.now()}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        
        console.log(`PDF generated successfully, size: ${pdfBuffer.length} bytes`);
        return res.send(pdfBuffer);
        
      } catch (error: any) {
        console.error('PDF generation failed:', error);
        return res.status(500).json({ 
          error: 'PDF generation failed', 
          details: error.message 
        });
      }
    }

    if (format === 'docx') {
      // Create comprehensive DOCX document
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: `Strategic NewsJack Proposal`,
              heading: HeadingLevel.HEADING_1,
            }),
            new Paragraph({
              text: `For ${clientName}`,
              heading: HeadingLevel.HEADING_2,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Proposal Date: ${proposalDate}`,
                  break: 1,
                }),
                new TextRun({
                  text: `Valid Until: ${validUntil}`,
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              text: `Campaign Overview: ${templateData.campaignData.campaignName}`,
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Strategic Insight: We understand that ${clientName} needs content that not only informs but strategically positions your brand™.`,
                }),
              ],
            }),
            new Paragraph({
              text: `Our Approach`,
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              text: `The NewsJack Methodology`,
              heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `NewsJacking is the art and science of real-time content marketing that injects your brand into trending news conversations. Our methodology ensures your content captures attention while building brand authority.`,
                }),
              ],
            }),
            new Paragraph({
              text: `Core Benefits:`,
              heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `• Real-time content relevance`,
                  break: 1,
                }),
                new TextRun({
                  text: `• Enhanced brand visibility`,
                  break: 1,
                }),
                new TextRun({
                  text: `• Strategic audience engagement`,
                  break: 1,
                }),
                new TextRun({
                  text: `• Multi-platform content distribution`,
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              text: `Campaign Analysis`,
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Website: ${templateData.campaignData.websiteUrl || 'Not specified'}`,
                  break: 1,
                }),
                new TextRun({
                  text: `Target Audience: ${templateData.campaignData.audiencePain || 'Strategic positioning focus'}`,
                  break: 1,
                }),
                new TextRun({
                  text: `Emotional Objective: ${templateData.campaignData.emotionalObjective || 'Brand authority and engagement'}`,
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              text: `Executive Summary`,
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `NewsGlue specializes in cementing brands to the news cycle through our proprietary NewsJack methodology. By strategically linking your brand messaging to trending news events, we create authentic, timely content that drives engagement and builds authority.`,
                }),
              ],
            }),
            new Paragraph({
              text: `Multi-Platform Distribution`,
              heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `We create platform-optimized content for maximum reach:`,
                  break: 1,
                }),
                new TextRun({
                  text: `• Blog Articles: In-depth thought leadership pieces (1200-2000 words)`,
                  break: 1,
                }),
                new TextRun({
                  text: `• Social Media: Platform-specific posts for Twitter, LinkedIn, Instagram, Facebook`,
                  break: 1,
                }),
                new TextRun({
                  text: `• SEO Landing Pages: Search-optimized content for organic discovery`,
                  break: 1,
                }),
                new TextRun({
                  text: `• Email Content: Newsletter-ready formats for direct engagement`,
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              text: `NewsJack Content Examples`,
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Below are examples of how we transform news events into strategic content for ${clientName}:`,
                }),
              ],
            }),
            // Add NewsJack examples if available
            ...templateData.newsItems.flatMap((item: any) => {
              const platformOutputs = item.platformOutputs as any || {};
              const examples = [];
              
              examples.push(new Paragraph({
                text: `News Event: ${item.headline}`,
                heading: HeadingLevel.HEADING_4,
              }));
              
              examples.push(new Paragraph({
                children: [
                  new TextRun({
                    text: `Source: ${item.sourceUrl}`,
                    break: 1,
                  }),
                ],
              }));

              Object.keys(platformOutputs).forEach(platform => {
                const output = platformOutputs[platform];
                if (output && output.content) {
                  examples.push(new Paragraph({
                    children: [
                      new TextRun({
                        text: `${platform.toUpperCase()}:`,
                        bold: true,
                        break: 1,
                      }),
                      new TextRun({
                        text: output.content.substring(0, 200) + '...',
                        break: 1,
                      }),
                      new TextRun({
                        text: `CTA: ${output.cta || 'Learn more'}`,
                        break: 1,
                      }),
                    ],
                  }));
                }
              });
              
              return examples;
            }),
            new Paragraph({
              text: `Content Performance`,
              heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Our NewsJack methodology typically achieves 40-60% higher engagement rates compared to traditional content, as it leverages the natural momentum of trending topics while maintaining authentic brand messaging.`,
                }),
              ],
            }),
            new Paragraph({
              text: `Next Steps`,
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              text: `Immediate Actions`,
              heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `1. Campaign Setup: Configure your NewsJack monitoring and content generation`,
                  break: 1,
                }),
                new TextRun({
                  text: `2. Content Calendar: Establish posting schedules across all platforms`,
                  break: 1,
                }),
                new TextRun({
                  text: `3. Team Training: Brief your team on the NewsJack methodology`,
                  break: 1,
                }),
                new TextRun({
                  text: `4. Launch: Begin real-time news monitoring and content creation`,
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              text: `Timeline`,
              heading: HeadingLevel.HEADING_4,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `• Week 1: Platform setup and team onboarding`,
                  break: 1,
                }),
                new TextRun({
                  text: `• Week 2: First NewsJack content deployment`,
                  break: 1,
                }),
                new TextRun({
                  text: `• Week 3-4: Optimization based on performance data`,
                  break: 1,
                }),
                new TextRun({
                  text: `• Ongoing: Continuous news monitoring and content generation`,
                  break: 1,
                }),
              ],
            }),
            new Paragraph({
              text: `Investment & Next Steps`,
              heading: HeadingLevel.HEADING_3,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Ready to transform your content strategy? Let's discuss how NewsGlue can cement your brand to the news cycle.`,
                }),
                new TextRun({
                  text: `Contact: Team@NewsGlue.io`,
                  break: 2,
                }),
                new TextRun({
                  text: `NewsGlue.io - Cementing your brand to the news cycle`,
                  break: 1,
                }),
              ],
            }),
          ],
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${clientName.replace(/\s+/g, '-')}-proposal.docx"`);
      return res.send(buffer);
    }

  } catch (error) {
    console.error('Error downloading proposal:', error);
    res.status(500).json({ error: 'Failed to download proposal' });
  }
});

export default router;