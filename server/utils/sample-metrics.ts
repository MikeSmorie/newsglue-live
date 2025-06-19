import { db } from "../../db/index.js";
import { campaignMetrics, outputMetrics, campaigns } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export async function createSampleMetrics(campaignId: string) {
  try {
    // Create campaign metrics if not exists
    const existingMetrics = await db.query.campaignMetrics.findFirst({
      where: eq(campaignMetrics.campaignId, campaignId)
    });

    if (!existingMetrics) {
      await db.insert(campaignMetrics).values({
        campaignId,
        hourlyRate: "40.00",
        humanEstimateMinutes: 45,
        humanAiEstimateMinutes: 15,
        totalOutputs: 0,
        totalTimeSavedSeconds: 0,
        totalCostSaved: "0.00",
        complianceScore: "0.00",
        ctaPresenceRate: "0.00",
        efficiencyScore: "0.00"
      });
    }

    // Create sample output metrics
    const platforms = ['blog', 'twitter', 'linkedin', 'facebook', 'instagram'];
    const sampleOutputs = [];

    for (let i = 0; i < 15; i++) {
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const generationTime = Math.floor(Math.random() * 30) + 5; // 5-35 seconds
      const wordCount = platform === 'blog' ? Math.floor(Math.random() * 800) + 200 : Math.floor(Math.random() * 150) + 50;
      const humanTime = platform === 'blog' ? 45 : 15; // minutes
      const timeSaved = (humanTime * 60) - generationTime;
      const costSaved = (timeSaved / 3600 * 40).toFixed(2);

      const startTime = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)); // Random time in last 7 days
      const endTime = new Date(startTime.getTime() + generationTime * 1000);

      sampleOutputs.push({
        campaignId,
        newsItemId: null,
        platform,
        generationStartTime: startTime,
        generationEndTime: endTime,
        generationDurationSeconds: generationTime,
        wordCount,
        characterCount: wordCount * 5,
        toneMatchRating: (Math.random() * 2 + 3).toFixed(2), // 3.0-5.0
        qualityRating: (Math.random() * 2 + 3).toFixed(2), // 3.0-5.0
        complianceCheck: Math.random() > 0.1, // 90% compliance
        ctaPresent: Math.random() > 0.3, // 70% have CTA
        urlPresent: Math.random() > 0.2, // 80% have URL
        estimatedHumanTimeMinutes: humanTime,
        timeSavedSeconds: timeSaved,
        costSaved
      });
    }

    // Check if sample data already exists
    const existingOutputs = await db.query.outputMetrics.findMany({
      where: eq(outputMetrics.campaignId, campaignId)
    });

    if (existingOutputs.length === 0) {
      await db.insert(outputMetrics).values(sampleOutputs);
      console.log(`Created ${sampleOutputs.length} sample metrics for campaign ${campaignId}`);
      
      // Calculate and update campaign metrics with real aggregated values
      const totalOutputs = sampleOutputs.length;
      const totalTimeSaved = sampleOutputs.reduce((sum, output) => sum + output.timeSavedSeconds, 0);
      const totalCostSaved = sampleOutputs.reduce((sum, output) => sum + parseFloat(output.costSaved), 0);
      const complianceCount = sampleOutputs.filter(output => output.complianceCheck).length;
      const ctaCount = sampleOutputs.filter(output => output.ctaPresent).length;
      
      const complianceScore = (complianceCount / totalOutputs * 100).toFixed(2);
      const ctaPresenceRate = (ctaCount / totalOutputs * 100).toFixed(2);
      const efficiencyScore = Math.min(100, (totalTimeSaved / (totalOutputs * 1800) * 100)).toFixed(2);
      
      // Update the campaign metrics with calculated values
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
        
      console.log(`Updated campaign metrics: ${totalOutputs} outputs, ${Math.round(totalTimeSaved/60)}m saved, $${totalCostSaved.toFixed(2)} cost saved`);
    }

    return true;
  } catch (error) {
    console.error('Error creating sample metrics:', error);
    return false;
  }
}