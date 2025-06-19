import express from "express";
import { db } from "../../db/index.js";
import { campaignMetrics, outputMetrics, campaigns, newsItems } from "../../db/schema.js";
import { eq, desc, and } from "drizzle-orm";

const router = express.Router();

// Get campaign metrics
router.get('/campaign/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    // Get or create campaign metrics
    let metrics = await db.query.campaignMetrics.findFirst({
      where: eq(campaignMetrics.campaignId, campaignId)
    });

    if (!metrics) {
      // Create default metrics for campaign
      const [newMetrics] = await db.insert(campaignMetrics).values({
        campaignId: campaignId,
        hourlyRate: "40.00",
        humanEstimateMinutes: 45,
        humanAiEstimateMinutes: 15,
        totalOutputs: 0,
        totalTimeSavedSeconds: 0,
        totalCostSaved: "0.00",
        complianceScore: "0.00",
        ctaPresenceRate: "0.00",
        efficiencyScore: "0.00"
      }).returning();
      
      metrics = newMetrics;
    }

    // Calculate real-time metrics from output_metrics table
    const outputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId)
    });

    if (outputs.length > 0) {
      const totalOutputs = outputs.length;
      const totalTimeSaved = outputs.reduce((sum, output) => sum + output.timeSavedSeconds, 0);
      const totalCostSaved = outputs.reduce((sum, output) => sum + parseFloat(output.costSaved), 0);
      const complianceCount = outputs.filter(output => output.complianceCheck).length;
      const ctaCount = outputs.filter(output => output.ctaPresent).length;
      
      const complianceScore = (complianceCount / totalOutputs * 100).toFixed(2);
      const ctaPresenceRate = (ctaCount / totalOutputs * 100).toFixed(2);
      const efficiencyScore = Math.min(100, (totalTimeSaved / (totalOutputs * 1800) * 100)).toFixed(2); // Based on 30min avg human time
      
      // Update metrics
      await db.update(campaignMetrics)
        .set({
          totalOutputs,
          totalTimeSavedSeconds: totalTimeSaved,
          totalCostSaved: totalCostSaved.toFixed(2),
          complianceScore,
          ctaPresenceRate,
          efficiencyScore,
          updatedAt: new Date()
        })
        .where(eq(campaignMetrics.campaignId, campaignId));

      // Return updated metrics
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

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    res.status(500).json({ error: 'Failed to fetch campaign metrics' });
  }
});

// Get output metrics for campaign
router.get('/outputs/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const outputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId),
      orderBy: [desc(outputMetrics.createdAt)]
    });

    res.json(outputs);
  } catch (error) {
    console.error('Error fetching output metrics:', error);
    res.status(500).json({ error: 'Failed to fetch output metrics' });
  }
});

// Update hourly rate for campaign
router.put('/campaign/:campaignId/rate', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { hourlyRate } = req.body;

    if (!hourlyRate || isNaN(parseFloat(hourlyRate))) {
      return res.status(400).json({ error: 'Valid hourly rate is required' });
    }

    await db.update(campaignMetrics)
      .set({
        hourlyRate: parseFloat(hourlyRate).toFixed(2),
        updatedAt: new Date()
      })
      .where(eq(campaignMetrics.campaignId, campaignId));

    // Recalculate cost savings for all outputs
    const outputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId)
    });

    const rate = parseFloat(hourlyRate);
    for (const output of outputs) {
      const newCostSaved = (output.timeSavedSeconds / 3600 * rate).toFixed(2);
      await db.update(outputMetrics)
        .set({ costSaved: newCostSaved })
        .where(eq(outputMetrics.id, output.id));
    }

    res.json({ success: true, message: 'Hourly rate updated successfully' });
  } catch (error) {
    console.error('Error updating hourly rate:', error);
    res.status(500).json({ error: 'Failed to update hourly rate' });
  }
});

// Log new output metrics (called by content generation modules)
router.post('/log-output', async (req, res) => {
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
      toneMatchRating: toneMatchRating ? parseFloat(toneMatchRating).toFixed(2) : null,
      qualityRating: qualityRating ? parseFloat(qualityRating).toFixed(2) : null,
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

// Export metrics as CSV
router.post('/export/:campaignId/csv', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const outputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId),
      orderBy: [desc(outputMetrics.createdAt)]
    });

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId)
    });

    // Create CSV content
    const headers = [
      'Platform',
      'Generation Time (seconds)',
      'Word Count',
      'Character Count',
      'Time Saved (minutes)',
      'Cost Saved ($)',
      'Compliance Check',
      'CTA Present',
      'URL Present',
      'Quality Rating',
      'Tone Match Rating',
      'Created At'
    ];

    const csvRows = outputs.map(output => [
      output.platform,
      output.generationDurationSeconds,
      output.wordCount,
      output.characterCount,
      Math.round(output.timeSavedSeconds / 60),
      output.costSaved,
      output.complianceCheck ? 'Yes' : 'No',
      output.ctaPresent ? 'Yes' : 'No',
      output.urlPresent ? 'Yes' : 'No',
      output.qualityRating || 'N/A',
      output.toneMatchRating || 'N/A',
      output.createdAt ? output.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    ]);

    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="metrics-${campaign?.name || campaignId}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Export metrics as PDF
router.post('/export/:campaignId/pdf', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const metrics = await db.query.campaignMetrics.findFirst({
      where: eq(campaignMetrics.campaignId, campaignId)
    });

    const outputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId),
      orderBy: [desc(outputMetrics.createdAt)]
    });

    const campaign = await db.query.campaigns.findFirst({
      where: eq(campaigns.id, campaignId)
    });

    if (!metrics || !campaign) {
      return res.status(404).json({ error: 'Campaign or metrics not found' });
    }

    // Generate HTML for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Campaign Metrics Report - ${campaign.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .header { text-align: center; margin-bottom: 30px; }
            .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0; }
            .metric-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
            .metric-label { font-size: 14px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .summary { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Campaign Metrics Report</h1>
            <h2>${campaign.name}</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="summary">
            <h3>Executive Summary</h3>
            <p>This report shows the performance metrics for the "${campaign.name}" campaign, demonstrating significant time and cost savings through AI-powered content generation.</p>
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${metrics.totalOutputs}</div>
              <div class="metric-label">Total Outputs</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${Math.round(metrics.totalTimeSavedSeconds / 60)} min</div>
              <div class="metric-label">Time Saved</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">$${metrics.totalCostSaved}</div>
              <div class="metric-label">Cost Saved</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${metrics.complianceScore}%</div>
              <div class="metric-label">Compliance Score</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${metrics.ctaPresenceRate}%</div>
              <div class="metric-label">CTA Presence Rate</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${metrics.efficiencyScore}%</div>
              <div class="metric-label">Efficiency Score</div>
            </div>
          </div>

          <h3>Output Details</h3>
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Generation Time</th>
                <th>Words</th>
                <th>Time Saved</th>
                <th>Cost Saved</th>
                <th>Compliance</th>
                <th>CTA</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody>
              ${outputs.slice(0, 20).map(output => `
                <tr>
                  <td>${output.platform}</td>
                  <td>${output.generationDurationSeconds}s</td>
                  <td>${output.wordCount}</td>
                  <td>${Math.round(output.timeSavedSeconds / 60)}m</td>
                  <td>$${output.costSaved}</td>
                  <td>${output.complianceCheck ? '✓' : '✗'}</td>
                  <td>${output.ctaPresent ? '✓' : '✗'}</td>
                  <td>${output.qualityRating || 'N/A'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${outputs.length > 20 ? `<p style="text-align: center; margin-top: 20px; color: #666;">Showing 20 of ${outputs.length} outputs</p>` : ''}
        </body>
      </html>
    `;

    // Use existing PDF generation (reuse from proposal module)
    const puppeteer = await import('puppeteer');
    
    const getChromiumPath = () => {
      const possiblePaths = [
        '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/google-chrome'
      ];
      
      const fs = await import('fs');
      for (const path of possiblePaths) {
        try {
          if (fs.existsSync(path)) {
            return path;
          }
        } catch (e) {
          continue;
        }
      }
      return null;
    };

    const chromiumPath = getChromiumPath();
    console.log('Using Chromium at:', chromiumPath);

    const browser = await puppeteer.launch({
      executablePath: chromiumPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="metrics-${campaign.name}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ error: 'Failed to export PDF' });
  }
});

export default router;