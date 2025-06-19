import express from "express";
import { db } from "../../db/index.js";
import { campaigns, newsItems } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { generateProposalHTML } from "../templates/proposal-template.js";
import puppeteer from "puppeteer";
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
      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });

      try {
        const page = await browser.newPage();
        
        // Set content with base URL for assets
        await page.setContent(html, { 
          waitUntil: 'networkidle0',
          timeout: 30000 
        });

        // Generate PDF
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '20mm',
            right: '20mm',
            bottom: '20mm',
            left: '20mm'
          },
          displayHeaderFooter: true,
          headerTemplate: '<div></div>',
          footerTemplate: `
            <div style="font-size: 10px; color: #666; text-align: center; width: 100%; margin: 0 20mm;">
              <span>NewsGlue.io | Team@NewsGlue.io | Cementing your brand to the news cycle</span>
              <span style="float: right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
            </div>
          `
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${clientName.replace(/\s+/g, '-')}-proposal.pdf"`);
        return res.send(pdfBuffer);

      } catch (pdfError) {
        await browser.close();
        throw pdfError;
      }
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