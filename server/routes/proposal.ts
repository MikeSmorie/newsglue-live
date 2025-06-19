import express from "express";
import { db } from "../../db/index.js";
import { campaigns, newsItems } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { generateProposalHTML } from "../templates/proposal-template.js";
// import puppeteer from "puppeteer"; // Disabled due to Replit compatibility issues
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { createWriteStream, unlinkSync, existsSync } from "fs";
import path from "path";

const router = express.Router();

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

    // Prepare template data
    const proposalDate = new Date().toLocaleDateString();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

    const templateData = {
      clientName,
      proposalDate,
      validUntil,
      campaignData: campaign,
      newsItems: newsItemsWithContent,
      platformOutputs: []
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

    // Prepare template data
    const proposalDate = new Date().toLocaleDateString();
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

    const templateData = {
      clientName,
      proposalDate,
      validUntil,
      campaignData: campaign,
      newsItems: newsItemsWithContent,
      platformOutputs: []
    };

    const html = generateProposalHTML(templateData);

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="${clientName.replace(/\s+/g, '-')}-proposal.html"`);
      return res.send(html);
    }

    if (format === 'pdf') {
      // Create a browser-optimized page for PDF printing with print-specific CSS
      const pdfOptimizedHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Strategic NewsJack Proposal - ${clientName}</title>
          <style>
            @page { 
              margin: 0.75in; 
              size: A4;
            }
            
            @media print {
              body { 
                margin: 0; 
                font-size: 11px; 
                line-height: 1.3;
                color: #000 !important;
                background: white !important;
              }
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
              .container { padding: 0; max-width: none; }
              h1 { font-size: 18px; margin: 12px 0 8px 0; }
              h2 { font-size: 16px; margin: 10px 0 6px 0; }
              h3 { font-size: 14px; margin: 8px 0 5px 0; }
              h4 { font-size: 12px; margin: 6px 0 4px 0; }
              p { margin: 4px 0; }
              .logo { max-width: 120px; }
              .platform-content {
                background: #f5f5f5 !important;
                border-left: 2px solid #333 !important;
                padding: 6px !important;
                margin: 4px 0 !important;
              }
              .highlight-box {
                background: #f9f9f9 !important;
                border: 1px solid #ccc !important;
                padding: 6px !important;
                margin: 4px 0 !important;
              }
            }
            
            @media screen {
              body { 
                font-family: Arial, sans-serif; 
                line-height: 1.5; 
                color: #333; 
                background: white; 
                margin: 20px;
              }
              .no-print {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #007bff;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 1000;
                box-shadow: 0 4px 8px rgba(0,0,0,0.2);
              }
              .print-button {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 14px;
                font-weight: bold;
              }
              .print-button:hover {
                text-decoration: underline;
              }
            }
            
            h1, h2, h3, h4 { 
              color: #2563eb; 
              font-weight: bold;
            }
            .logo { 
              max-width: 200px; 
              height: auto;
              margin-bottom: 15px; 
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
            }
            .section { 
              margin-bottom: 25px; 
            }
            .platform-content { 
              background: #f8f9fa; 
              padding: 12px; 
              margin: 10px 0; 
              border-left: 4px solid #2563eb; 
              border-radius: 4px;
            }
            .highlight-box {
              background: #f0f8ff;
              padding: 15px;
              margin: 15px 0;
              border: 1px solid #ddd;
              border-radius: 6px;
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button class="print-button" onclick="window.print()">
              📄 Save as PDF (Ctrl+P)
            </button>
          </div>
          
          ${html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<!DOCTYPE[^>]*>|<html[^>]*>|<\/html>|<head[^>]*>[\s\S]*?<\/head>|<body[^>]*>|<\/body>/gi, '')}
          
          <script>
            // Auto-trigger print dialog after page loads
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.print();
              }, 1500);
            });
            
            // Handle keyboard shortcut
            document.addEventListener('keydown', function(e) {
              if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                window.print();
              }
            });
          </script>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="${clientName.replace(/\s+/g, '-')}-proposal-${Date.now()}.html"`);
      return res.send(pdfOptimizedHtml);
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