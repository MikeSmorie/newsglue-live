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
      // For now, return HTML that can be printed to PDF by the browser
      // This provides better compatibility across environments
      const printableHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Proposal - ${clientName}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
              .page-break { page-break-before: always; }
            }
          </style>
          ${html.match(/<style[^>]*>[\s\S]*?<\/style>/gi)?.join('') || ''}
        </head>
        <body>
          <div class="no-print" style="position: fixed; top: 10px; right: 10px; background: #007bff; color: white; padding: 10px; border-radius: 5px; z-index: 1000;">
            <button onclick="window.print()" style="background: none; border: none; color: white; cursor: pointer;">
              📄 Print to PDF
            </button>
          </div>
          ${html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<!DOCTYPE[^>]*>|<html[^>]*>|<\/html>|<head[^>]*>[\s\S]*?<\/head>|<body[^>]*>|<\/body>/gi, '')}
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="${clientName.replace(/\s+/g, '-')}-proposal-printable.html"`);
      return res.send(printableHtml);
    }

    if (format === 'docx') {
      // Create proper DOCX document
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