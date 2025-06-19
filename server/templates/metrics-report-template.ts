interface MetricsReportData {
  campaign: any;
  metrics: any;
  outputs: any[];
  generatedAt: string;
  totalGenerationTime: number;
}

export function generateMetricsReportHTML(data: MetricsReportData): string {
  const { campaign, metrics, outputs, generatedAt, totalGenerationTime } = data;
  
  // Calculate platform distribution
  const platformStats = outputs.reduce((acc: any, output) => {
    const platform = output.platform;
    if (!acc[platform]) {
      acc[platform] = { count: 0, totalTime: 0 };
    }
    acc[platform].count += 1;
    acc[platform].totalTime += output.generationDurationSeconds;
    return acc;
  }, {});

  const platformData = Object.entries(platformStats).map(([platform, stats]: [string, any]) => ({
    platform: platform.charAt(0).toUpperCase() + platform.slice(1),
    count: stats.count,
    avgTime: Math.round(stats.totalTime / stats.count)
  }));

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NewsGlue Metrics Report - ${campaign.campaignName || 'Campaign'}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Open Sans', Arial, sans-serif;
            line-height: 1.6;
            color: #333333 !important;
            background: #ffffff !important;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4A90E2;
        }
        
        .logo {
            max-width: 200px;
            height: auto;
        }
        
        .header-info {
            text-align: right;
            font-size: 14px;
            color: #666;
        }
        
        .header-info h3 {
            color: #333;
            margin-bottom: 10px;
            font-size: 18px;
        }
        
        .report-title {
            text-align: center;
            margin: 30px 0 40px 0;
        }
        
        .report-title h1 {
            font-size: 32px;
            color: #333;
            font-weight: 700;
            margin-bottom: 10px;
        }
        
        .report-title h2 {
            font-size: 20px;
            color: #4A90E2;
            font-weight: 400;
        }
        
        .section {
            margin-bottom: 40px;
        }
        
        .section h3 {
            font-size: 20px;
            color: #333333 !important;
            margin-bottom: 15px;
            font-weight: 600;
            border-bottom: 2px solid #4A90E2;
            padding-bottom: 5px;
        }
        
        .summary-box {
            background: #f8f9fa;
            border-left: 4px solid #4A90E2;
            padding: 20px;
            margin: 20px 0;
            border-radius: 6px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 20px;
            margin: 25px 0;
        }
        
        .metric-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .metric-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 8px;
            font-weight: 500;
            text-transform: uppercase;
        }
        
        .metric-value {
            font-size: 24px;
            font-weight: 700;
            color: #4A90E2;
        }
        
        .chart-container {
            background: #f9f9f9;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .chart-title {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .platform-chart {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
        }
        
        .platform-bar {
            background: white;
            border-radius: 6px;
            padding: 15px;
            text-align: center;
            border-left: 4px solid #4A90E2;
        }
        
        .platform-name {
            font-weight: 600;
            color: #333;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .platform-count {
            font-size: 20px;
            font-weight: 700;
            color: #4A90E2;
            margin-bottom: 3px;
        }
        
        .platform-time {
            font-size: 12px;
            color: #666;
        }
        
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .data-table th {
            background: #4A90E2;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
        }
        
        .data-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 11px;
        }
        
        .data-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .footer {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 2px solid #4A90E2;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        
        .logo-text {
            font-weight: 700;
            color: #4A90E2;
            font-size: 14px;
        }
        
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo">
                <div class="logo-text" style="font-size: 24px; font-weight: 700; color: #4A90E2;">NewsGlue</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">Cementing your brand to the news cycle</div>
            </div>
            <div class="header-info">
                <h3>Performance Report</h3>
                <p><strong>Campaign:</strong> ${campaign.campaignName || 'Unknown Campaign'}</p>
                <p><strong>Generated:</strong> ${generatedAt}</p>
                <p><strong>Contact:</strong> Team@NewsGlue.io</p>
            </div>
        </div>
        
        <!-- Report Title -->
        <div class="report-title">
            <h1>📊 NewsGlue AI Performance Report</h1>
            <h2>${campaign.campaignName || 'Campaign Metrics'}</h2>
        </div>
        
        <!-- Executive Summary -->
        <div class="section">
            <h3>Executive Summary</h3>
            <div class="summary-box">
                <p>NewsGlue AI successfully generated <strong>${metrics.totalOutputs || 0} content outputs</strong> across multiple platforms in <strong>${totalGenerationTime} seconds</strong>, saving an estimated <strong>${Math.round((metrics.totalTimeSavedSeconds || 0) / 3600 * 10) / 10} hours</strong> and <strong>$${metrics.totalCostSaved || '0.00'}</strong> at $${metrics.hourlyRate || '40.00'}/hour.</p>
                
                <p style="margin-top: 15px;">The AI-powered system achieved a <strong>${metrics.efficiencyScore || '0.00'}% efficiency score</strong> with <strong>${metrics.complianceScore || '0.00'}% compliance</strong> and <strong>${metrics.ctaPresenceRate || '0.00'}% CTA inclusion rate</strong>, demonstrating significant time and cost savings while maintaining high quality standards.</p>
            </div>
        </div>
        
        <!-- Key Metrics -->
        <div class="section">
            <h3>Key Performance Metrics</h3>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-label">Total Outputs</div>
                    <div class="metric-value">${metrics.totalOutputs || 0}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Time Saved</div>
                    <div class="metric-value">${Math.round((metrics.totalTimeSavedSeconds || 0) / 60)}m</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Cost Saved</div>
                    <div class="metric-value">$${metrics.totalCostSaved || '0.00'}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Efficiency</div>
                    <div class="metric-value">${metrics.efficiencyScore || '0.00'}%</div>
                </div>
            </div>
        </div>
        
        <!-- Platform Distribution -->
        ${platformData.length > 0 ? `
        <div class="section">
            <h3>Platform Performance Distribution</h3>
            <div class="chart-container">
                <div class="chart-title">Content Output by Platform</div>
                <div class="platform-chart">
                    ${platformData.map(platform => `
                    <div class="platform-bar">
                        <div class="platform-name">${platform.platform}</div>
                        <div class="platform-count">${platform.count}</div>
                        <div class="platform-time">${platform.avgTime}s avg</div>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>
        ` : ''}
        
        <!-- Compliance & Quality -->
        <div class="section">
            <h3>Quality & Compliance Metrics</h3>
            <div class="metrics-grid" style="grid-template-columns: 1fr 1fr 1fr;">
                <div class="metric-card">
                    <div class="metric-label">Compliance Score</div>
                    <div class="metric-value">${metrics.complianceScore || '0.00'}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">CTA Inclusion</div>
                    <div class="metric-value">${metrics.ctaPresenceRate || '0.00'}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Avg Quality</div>
                    <div class="metric-value">${outputs.length > 0 ? Math.round(outputs.reduce((acc, m) => acc + parseFloat(m.qualityRating || '0'), 0) / outputs.length * 10) / 10 : 0}/5</div>
                </div>
            </div>
        </div>
        
        <!-- Detailed Output Data -->
        ${outputs.length > 0 ? `
        <div class="section page-break">
            <h3>Detailed Output Metrics</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Platform</th>
                        <th>Gen Time</th>
                        <th>Human Est</th>
                        <th>Time Saved</th>
                        <th>Cost Saved</th>
                        <th>CTA</th>
                        <th>Compliance</th>
                        <th>Quality</th>
                    </tr>
                </thead>
                <tbody>
                    ${outputs.slice(0, 20).map(output => `
                    <tr>
                        <td>${output.platform.charAt(0).toUpperCase() + output.platform.slice(1)}</td>
                        <td>${output.generationDurationSeconds}s</td>
                        <td>${output.estimatedHumanTimeMinutes}m</td>
                        <td>${Math.round(output.timeSavedSeconds / 60)}m</td>
                        <td>$${output.costSaved}</td>
                        <td>${output.ctaPresent ? '✓' : '✗'}</td>
                        <td>${output.complianceCheck ? '✓' : '✗'}</td>
                        <td>${output.qualityRating || 'N/A'}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
            ${outputs.length > 20 ? `<p style="text-align: center; margin-top: 10px; font-size: 12px; color: #666;">Showing first 20 of ${outputs.length} outputs</p>` : ''}
        </div>
        ` : ''}
        
        <!-- Methodology -->
        <div class="section">
            <h3>Methodology & Assumptions</h3>
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
                <strong>Time Calculations:</strong> Human estimates based on industry standards (15-45 minutes per platform-specific content piece). 
                AI generation times measured from actual processing duration.<br><br>
                <strong>Cost Calculations:</strong> Based on hourly rate of $${metrics.hourlyRate || '40.00'}/hour. 
                Time savings calculated as difference between estimated human time and actual AI generation time.<br><br>
                <strong>Quality Metrics:</strong> Compliance scores based on content guidelines adherence. 
                CTA presence tracked for action-driving content effectiveness.
            </p>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p><span class="logo-text">NewsGlue.io</span> | Team@NewsGlue.io | Cementing your brand to the news cycle</p>
            <p>© ${new Date().getFullYear()} NewsGlue. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
  `;
}