import express from 'express';
import { z } from 'zod';
import { Campaign } from '../../lib/types/campaign';

const router = express.Router();

const CampaignSchema = z.object({
  campaignName: z.string().min(1),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
  brandVoice: z.string().optional(),
  keyBenefits: z.string().optional(),
  keywords: z.string().optional(),
  campaignGoals: z.string().optional(),
  campaignUrl: z.string().url().optional(),
});

const campaigns: Campaign[] = [
  {
    id: "1",
    campaignName: "Tech Innovation 2024",
    description: "Promoting cutting-edge technology solutions",
    targetAudience: "Tech enthusiasts, early adopters",
    brandVoice: "Innovation-focused, forward-thinking",
    keyBenefits: "Latest tech, competitive pricing, expert support",
    keywords: "innovation, technology, digital transformation",
    campaignGoals: "Increase brand awareness, drive product adoption",
    campaignUrl: "https://example.com/tech-innovation"
  },
  {
    id: "2",
    campaignName: "Sustainable Future",
    description: "Environmental responsibility and green solutions",
    targetAudience: "Environmentally conscious consumers",
    brandVoice: "Responsible, caring, authentic",
    keyBenefits: "Eco-friendly, sustainable, carbon neutral",
    keywords: "sustainability, environment, green energy",
    campaignGoals: "Build eco-conscious brand image",
    campaignUrl: "https://example.com/sustainable-future"
  },
  {
    id: "3",
    campaignName: "Digital Marketing Mastery",
    description: "Advanced digital marketing strategies and tools",
    targetAudience: "Marketing professionals, business owners",
    brandVoice: "Expert, results-driven, strategic",
    keyBenefits: "Proven strategies, measurable results, expert guidance",
    keywords: "digital marketing, ROI, conversion optimization",
    campaignGoals: "Generate leads, establish thought leadership",
    campaignUrl: "https://example.com/marketing-mastery"
  }
];

router.get('/', (req, res) => {
  res.json(campaigns);
});

router.post('/', (req, res) => {
  const result = CampaignSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }
  const newCampaign: Campaign = { id: Date.now().toString(), ...result.data };
  campaigns.push(newCampaign);
  res.status(201).json(newCampaign);
});

router.get('/:id', (req, res) => {
  const campaign = campaigns.find(c => c.id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json(campaign);
});

export default router;