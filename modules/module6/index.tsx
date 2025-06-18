import { useEffect, useState } from 'react';
import { fetchCampaigns, fetchNewsItems } from '../../lib/newsjack/api';
import { Campaign, NewsItem, Channel } from '../../lib/newsjack/types';
import NewsJackForm from '../../client/src/components/newsjack/NewsJackForm';

export default function ExecutionArena() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    async function loadData() {
      const c = await fetchCampaigns();
      const n = await fetchNewsItems();
      setCampaigns(c);
      setNewsItems(n);
    }
    loadData();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">🧠 NewsJack Engine</h1>
      <p className="text-sm text-gray-400">
        Transform breaking news into brand-aligned social media content. Select a campaign and news item, choose your channel, and generate!
      </p>
      <NewsJackForm campaigns={campaigns} newsItems={newsItems} />
    </div>
  );
}