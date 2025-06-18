// Prompt 5 of X — Register NewsJack Engine API Route

import express from 'express';
import { Campaign, NewsItem, Channel } from '../../lib/newsjack/types';
import { estimateContentLength, truncateText } from '../../lib/newsjack/helpers';
import { generateNewsjackContent } from './newsjack-exec';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { campaign, newsItem, channel }: {
      campaign: Campaign;
      newsItem: NewsItem;
      channel: Channel;
    } = req.body;

    if (!campaign || !newsItem || !channel) {
      return res.status(400).json({ error: 'Missing required input' });
    }

    const result = await generateNewsjackContent(campaign, newsItem, channel);

    return res.status(200).json({ content: result });
  } catch (error) {
    console.error('[NewsJack] Generation Error:', error);
    return res.status(500).json({ error: 'NewsJack content generation failed.' });
  }
});

export default router;