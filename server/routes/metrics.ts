import express from "express";
import { db } from "../../db/index.js";
import { campaignMetrics, outputMetrics, campaigns, newsItems } from "../../db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { createSampleMetrics } from "../utils/sample-metrics.js";
import puppeteer from "puppeteer";
import { generateMetricsReportHTML } from "../templates/metrics-report-template.js";

const router = express.Router();

// Get campaign metrics
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    let metrics = await db.query.campaignMetrics.findFirst({
      where: eq(campaignMetrics.campaignId, campaignId)
    });

    // Create sample metrics if none exist
    if (!metrics) {
      metrics = await createSampleMetrics(campaignId);
    }

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    res.status(500).json({ error: 'Failed to fetch campaign metrics' });
  }
});

// Get output metrics for a campaign
router.get('/:campaignId/outputs', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const outputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId),
      orderBy: desc(outputMetrics.createdAt)
    });

    res.json(outputs);
  } catch (error) {
    console.error('Error fetching output metrics:', error);
    res.status(500).json({ error: 'Failed to fetch output metrics' });
  }
});

// Initialize campaign metrics
router.post('/initialize', async (req, res) => {
  try {
    const { campaignId, hourlyRate } = req.body;
    
    // Check if metrics already exist
    const existingMetrics = await db.query.campaignMetrics.findFirst({
      where: eq(campaignMetrics.campaignId, campaignId)
    });

    if (existingMetrics) {
      return res.json({ success: true, metrics: existingMetrics });
    }

    // Create new metrics entry
    const [newMetrics] = await db.insert(campaignMetrics).values({
      campaignId,
      hourlyRate: hourlyRate ? hourlyRate.toString() : '40.00',
      humanEstimateMinutes: 45,
      humanAiEstimateMinutes: 30,
      totalOutputs: 0,
      totalTimeSavedSeconds: 0,
      totalCostSaved: '0.00',
      complianceScore: '0.00',
      ctaPresenceRate: '0.00',
      efficiencyScore: '0.00'
    }).returning();

    res.json({ success: true, metrics: newMetrics });
  } catch (error) {
    console.error('Error initializing metrics:', error);
    res.status(500).json({ error: 'Failed to initialize metrics' });
  }
});

// Update campaign metrics
router.put('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { hourlyRate } = req.body;
    
    const [updatedMetrics] = await db.update(campaignMetrics)
      .set({
        hourlyRate: hourlyRate.toString(),
        updatedAt: new Date()
      })
      .where(eq(campaignMetrics.campaignId, campaignId))
      .returning();

    if (!updatedMetrics) {
      return res.status(404).json({ error: 'Campaign metrics not found' });
    }

    res.json({ success: true, metrics: updatedMetrics });
  } catch (error) {
    console.error('Error updating campaign metrics:', error);
    res.status(500).json({ error: 'Failed to update campaign metrics' });
  }
});

// Log output metrics
router.post('/output', async (req, res) => {
  try {
    const {
      campaignId,
      newsItemId,
      platform,
      generationStartTime,
      generationEndTime,
      wordCount,
      characterCount,
      toneMatchRating,
      qualityRating,
      complianceCheck,
      ctaPresent,
      urlPresent,
      estimatedHumanTimeMinutes
    } = req.body;

    const generationDuration = Math.round((new Date(generationEndTime).getTime() - new Date(generationStartTime).getTime()) / 1000);
    const timeSaved = Math.max(0, (estimatedHumanTimeMinutes * 60) - generationDuration);
    
    // Get current hourly rate for campaign
    const metrics = await db.query.campaignMetrics.findFirst({
      where: eq(campaignMetrics.campaignId, campaignId)
    });
    
    const hourlyRate = metrics ? parseFloat(metrics.hourlyRate) : 40.00;
    const costSaved = (timeSaved / 3600 * hourlyRate).toFixed(2);

    const [newOutput] = await db.insert(outputMetrics).values({
      campaignId,
      newsItemId,
      platform,
      generationStartTime: new Date(generationStartTime),
      generationEndTime: new Date(generationEndTime),
      generationDurationSeconds: generationDuration,
      wordCount: wordCount || 0,
      characterCount: characterCount || 0,
      toneMatchRating: toneMatchRating ? parseFloat(toneMatchRating).toFixed(2) : undefined,
      qualityRating: qualityRating ? parseFloat(qualityRating).toFixed(2) : undefined,
      complianceCheck: complianceCheck !== false,
      ctaPresent: ctaPresent === true,
      urlPresent: urlPresent === true,
      estimatedHumanTimeMinutes: estimatedHumanTimeMinutes || 45,
      timeSavedSeconds: timeSaved,
      costSaved
    }).returning();

    res.json({ success: true, output: newOutput });
  } catch (error) {
    console.error('Error logging output metrics:', error);
    res.status(500).json({ error: 'Failed to log output metrics' });
  }
});

// Export metrics as PDF
router.post('/export/pdf', async (req, res) => {
  try {
    const { campaignId } = req.body;
    
    // Get campaign metrics
    const metrics = await db.query.campaignMetrics.findFirst({
      where: eq(campaignMetrics.campaignId, campaignId)
    });

    if (!metrics) {
      return res.status(404).json({ error: 'Campaign metrics not found' });
    }

    // Get output metrics
    const outputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId),
      orderBy: desc(outputMetrics.createdAt)
    });

    // Get campaign details
    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId)
    });

    const reportData = {
      campaign: campaign || { campaignName: 'Unknown Campaign' },
      metrics,
      outputs,
      generatedAt: new Date().toLocaleDateString(),
      totalGenerationTime: outputs.reduce((sum, output) => sum + output.generationDurationSeconds, 0)
    };

    // Generate PDF using the template
    const html = generateMetricsReportHTML(reportData);
    const pdfBuffer = await generateMetricsPDF(html, reportData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="metrics-report-${campaignId}-${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    return res.send(pdfBuffer);

  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Failed to export PDF report' });
  }
});

// Export metrics as CSV
router.post('/export/csv', async (req, res) => {
  try {
    const { campaignId } = req.body;
    
    const outputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId),
      orderBy: desc(outputMetrics.createdAt)
    });

    if (outputs.length === 0) {
      return res.status(404).json({ error: 'No output metrics found for this campaign' });
    }

    // Generate CSV headers
    const headers = [
      'Output ID',
      'Platform',
      'Generation Time (s)',
      'Human Time (min)',
      'Time Saved (s)',
      'Cost Saved ($)',
      'CTA Present',
      'Compliance Score (%)',
      'Tone Match (%)',
      'Quality Rating',
      'Word Count',
      'Character Count',
      'Created At'
    ];

    // Generate CSV rows
    const rows = outputs.map(output => [
      output.id,
      output.platform,
      output.generationDurationSeconds,
      output.estimatedHumanTimeMinutes,
      output.timeSavedSeconds,
      output.costSaved,
      output.ctaPresent ? 'Yes' : 'No',
      output.complianceCheck ? '100' : '0',
      output.toneMatchRating ? (parseFloat(output.toneMatchRating) * 20).toFixed(1) : 'N/A',
      output.qualityRating || 'N/A',
      output.wordCount || 0,
      output.characterCount || 0,
      output.createdAt?.toISOString() || ''
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="metrics-data-${campaignId}-${Date.now()}.csv"`);
    
    return res.send(csvContent);

  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV data' });
  }
});

// PDF generation function
async function generateMetricsPDF(html: string, data: any): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

export default router;