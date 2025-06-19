interface ProposalTemplateData {
  clientName: string;
  proposalDate: string;
  validUntil: string;
  campaignData: any;
  newsItems: any[];
  platformOutputs: any[];
}

export function generateProposalHTML(data: ProposalTemplateData): string {
  const { clientName, proposalDate, validUntil, campaignData, newsItems, platformOutputs } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strategic NewsJack Proposal - ${clientName}</title>
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
            margin-bottom: 60px;
            padding-bottom: 30px;
            border-bottom: 3px solid #4A90E2;
        }
        
        .logo {
            max-width: 300px;
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
        
        .header-info p {
            margin: 5px 0;
        }
        
        .proposal-title {
            text-align: center;
            margin: 40px 0 60px 0;
        }
        
        .proposal-title h1 {
            font-size: 36px;
            color: #333;
            font-weight: 700;
            margin-bottom: 15px;
        }
        
        .proposal-title h2 {
            font-size: 24px;
            color: #4A90E2;
            font-weight: 400;
        }
        
        .section {
            margin-bottom: 50px;
        }
        
        .section h3 {
            font-size: 24px;
            color: #333333 !important;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #F0C041;
        }
        
        .section p, .section li {
            color: #333333 !important;
        }
        
        .insight-box {
            background: #f8f9fa !important;
            color: #333333 !important;
            border-left: 4px solid #4A90E2;
            padding: 20px;
            margin: 20px 0;
        }
        
        .methodology-box {
            background: #fff8e1 !important;
            color: #333333 !important;
            border: 1px solid #F0C041;
            padding: 25px;
            margin: 20px 0;
            border-radius: 8px;
        }
        
        .section h4 {
            font-size: 18px;
            color: #4A90E2;
            margin: 25px 0 15px 0;
            font-weight: 600;
        }
        
        .section p {
            margin-bottom: 15px;
            font-size: 16px;
            line-height: 1.7;
        }
        
        .highlight-box {
            background: #f8f9fa;
            border-left: 5px solid #4A90E2;
            padding: 20px;
            margin: 25px 0;
            border-radius: 0 5px 5px 0;
        }
        
        .news-sample {
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 25px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .news-sample h5 {
            color: #333;
            font-size: 18px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .platform-output {
            background: #f9f9f9;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
            border-left: 4px solid #F0C041;
        }
        
        .platform-name {
            font-weight: 600;
            color: #4A90E2;
            text-transform: uppercase;
            font-size: 12px;
            margin-bottom: 8px;
        }
        
        .metrics {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #e0e0e0;
            font-size: 14px;
            color: #666;
        }
        
        .cta-highlight {
            background: #4A90E2;
            color: white;
            padding: 3px 8px;
            border-radius: 4px;
            font-weight: 600;
        }
        
        .footer {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 2px solid #f0f0f0;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        
        .footer .logo-text {
            color: #4A90E2;
            font-weight: 600;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        @media print {
            .container {
                padding: 20px;
            }
            .page-break {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <img src="/assets/01 Logo-C-slogan.png" alt="NewsGlue Logo" class="logo" />
            <div class="header-info">
                <h3>Prepared For: ${clientName}</h3>
                <p><strong>Prepared By:</strong> NewsGlue</p>
                <p><strong>Tagline:</strong> Cementing your brand to the news cycle</p>
                <p><strong>Website:</strong> NewsGlue.io</p>
                <p><strong>Email:</strong> Team@NewsGlue.io</p>
                <p><strong>Date:</strong> ${proposalDate}</p>
                <p><strong>Valid Until:</strong> ${validUntil}</p>
            </div>
        </div>
        
        <!-- Title -->
        <div class="proposal-title">
            <h1>Strategic NewsJack Proposal</h1>
            <h2>Amplifying ${clientName}'s Brand Through News-Driven Content</h2>
        </div>
        
        <!-- Executive Summary -->
        <div class="section">
            <h3>Executive Summary</h3>
            <p>NewsGlue specializes in cementing brands to the news cycle through our proprietary NewsJack methodology. By strategically linking your brand messaging to trending news events, we create authentic, timely content that drives engagement and builds authority.</p>
            
            <div class="highlight-box">
                <p><strong>Our Approach:</strong> Transform breaking news into brand opportunities. Every news event becomes a strategic touchpoint for ${clientName} to demonstrate thought leadership and connect with your audience.</p>
            </div>
            
            <p>This proposal outlines how we'll leverage our proven NewsJack framework to amplify ${clientName}'s brand presence across multiple platforms, using real-time news intelligence and AI-powered content generation.</p>
        </div>
        
        <!-- Client Understanding -->
        <div class="section">
            <h3>Client Understanding</h3>
            
            <h4>Campaign Overview: ${campaignData.campaignName}</h4>
            ${campaignData.websiteUrl ? `<p><strong>Website:</strong> <a href="${campaignData.websiteUrl}" target="_blank">${campaignData.websiteUrl}</a></p>` : ''}
            ${campaignData.ctaUrl ? `<p><strong>Primary CTA:</strong> <span class="cta-highlight">${campaignData.ctaUrl}</span></p>` : ''}
            
            ${campaignData.emotionalObjective ? `
            <h4>Emotional Positioning</h4>
            <p>${campaignData.emotionalObjective}</p>
            ` : ''}
            
            ${campaignData.audiencePain ? `
            <h4>Audience Pain Points</h4>
            <p>${campaignData.audiencePain}</p>
            ` : ''}
            
            <div class="highlight-box">
                <p><strong>Strategic Insight:</strong> We understand that ${clientName} needs content that not only informs but strategically positions your brand as a thought leader. Our NewsJack methodology ensures every piece of content serves dual purposes: relevance and brand advancement.</p>
            </div>
        </div>
        
        <!-- Our Approach -->
        <div class="section">
            <h3>Our Approach</h3>
            
            <h4>The NewsJack Methodology</h4>
            <p>Our proven 5-step framework transforms news events into brand opportunities:</p>
            
            <div style="margin: 25px 0;">
                <p><strong>1. News Intelligence:</strong> Real-time monitoring of relevant news trends</p>
                <p><strong>2. Strategic Framing:</strong> Positioning your brand within the news narrative</p>
                <p><strong>3. Tension Creation:</strong> Highlighting the implications and urgency</p>
                <p><strong>4. Brand Integration:</strong> Seamlessly introducing your solution</p>
                <p><strong>5. Call-to-Action:</strong> Driving immediate engagement</p>
            </div>
            
            <h4>Multi-Platform Distribution</h4>
            <p>We create platform-optimized content for maximum reach and engagement:</p>
            <p>• <strong>Blog Articles:</strong> In-depth thought leadership pieces (1200-2000 words)</p>
            <p>• <strong>Social Media:</strong> Platform-specific posts for Twitter, LinkedIn, Instagram, Facebook</p>
            <p>• <strong>SEO Landing Pages:</strong> Search-optimized content for organic discovery</p>
            <p>• <strong>Email Content:</strong> Newsletter-ready formats for direct engagement</p>
        </div>
        
        <!-- Sample NewsJack Outputs -->
        <div class="section page-break">
            <h3>Sample NewsJack Outputs</h3>
            <p>Below are examples of how we transform news events into strategic content for ${clientName}:</p>
            
            ${newsItems.slice(0, 2).map(newsItem => `
            <div class="news-sample">
                <h5>News Event: ${newsItem.headline}</h5>
                <p><strong>Source:</strong> <a href="${newsItem.sourceUrl}" target="_blank">${newsItem.sourceUrl}</a></p>
                
                ${Object.entries(newsItem.platformOutputs || {}).slice(0, 3).map(([platform, output]: [string, any]) => `
                <div class="platform-output">
                    <div class="platform-name">${platform}</div>
                    <div>${output.content ? output.content.substring(0, 300) + (output.content.length > 300 ? '...' : '') : ''}</div>
                    ${output.cta ? `<p style="margin-top: 10px;"><strong>CTA:</strong> <span class="cta-highlight">${output.cta}</span></p>` : ''}
                    
                    <div class="metrics">
                        <span>News Focus: ${output.metrics?.newsPercentage || 50}%</span>
                        <span>Brand Focus: ${output.metrics?.campaignPercentage || 50}%</span>
                        <span>Est. Engagement: ${output.metrics?.estimatedEngagement || 'High'}</span>
                    </div>
                </div>
                `).join('')}
            </div>
            `).join('')}
            
            <div class="highlight-box">
                <p><strong>Content Performance:</strong> Our NewsJack methodology typically achieves 40-60% higher engagement rates compared to traditional content, as it leverages the natural momentum of trending topics while maintaining authentic brand messaging.</p>
            </div>
        </div>
        
        <!-- Next Steps -->
        <div class="section">
            <h3>Next Steps</h3>
            
            <h4>Immediate Actions</h4>
            <p>1. <strong>Campaign Setup:</strong> Configure your NewsJack monitoring and content generation</p>
            <p>2. <strong>Content Calendar:</strong> Establish posting schedules across all platforms</p>
            <p>3. <strong>Team Training:</strong> Brief your team on the NewsJack methodology</p>
            <p>4. <strong>Launch:</strong> Begin real-time news monitoring and content creation</p>
            
            <h4>Timeline</h4>
            <p>• <strong>Week 1:</strong> Platform setup and team onboarding</p>
            <p>• <strong>Week 2:</strong> First NewsJack content deployment</p>
            <p>• <strong>Week 3-4:</strong> Optimization based on performance data</p>
            <p>• <strong>Ongoing:</strong> Continuous news monitoring and content generation</p>
            
            <div class="highlight-box">
                <p><strong>Ready to Start:</strong> Contact us at Team@NewsGlue.io to begin cementing ${clientName} to the news cycle. This proposal is valid until ${validUntil}.</p>
            </div>
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