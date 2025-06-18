import { Router } from 'express';

const router = Router();

// Sample news items data
const newsItems = [
  {
    id: 1,
    headline: "Major Tech Company Announces Breakthrough in AI",
    sourceUrl: "https://example.com/ai-breakthrough",
    content: "Leading technology company unveils revolutionary AI capabilities that could transform industry standards. The new system demonstrates unprecedented accuracy in natural language processing and real-time decision making.",
    summary: "Tech company reveals game-changing AI technology with industry-transforming potential.",
    publishedAt: "2024-06-18T10:00:00Z",
    relevanceScore: 0.95,
    sentiment: "positive",
    keywords: ["AI", "technology", "breakthrough", "innovation"]
  },
  {
    id: 2,
    headline: "Global Climate Summit Reaches Historic Agreement",
    sourceUrl: "https://example.com/climate-summit",
    content: "World leaders commit to ambitious new targets for carbon reduction and renewable energy adoption. The agreement includes binding commitments from major economies and significant funding for developing nations.",
    summary: "World leaders agree on binding climate targets and renewable energy commitments.",
    publishedAt: "2024-06-18T08:30:00Z",
    relevanceScore: 0.88,
    sentiment: "positive",
    keywords: ["climate", "environment", "sustainability", "renewable energy"]
  },
  {
    id: 3,
    headline: "Digital Marketing Trends Reshape Business Strategies",
    sourceUrl: "https://example.com/marketing-trends",
    content: "New research reveals how businesses are adapting their marketing approaches to leverage social media, influencer partnerships, and data-driven personalization. Companies report significant ROI improvements.",
    summary: "Businesses embrace new digital marketing strategies with proven ROI improvements.",
    publishedAt: "2024-06-18T06:15:00Z",
    relevanceScore: 0.82,
    sentiment: "positive",
    keywords: ["digital marketing", "social media", "ROI", "personalization"]
  }
];

router.get('/', (req, res) => {
  res.json(newsItems);
});

router.get('/:id', (req, res) => {
  const newsItem = newsItems.find(n => n.id === parseInt(req.params.id));
  if (!newsItem) {
    return res.status(404).json({ error: 'News item not found' });
  }
  res.json(newsItem);
});

export default router;