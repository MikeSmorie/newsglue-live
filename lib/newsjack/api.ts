import axios from 'axios';
import { Campaign, NewsItem } from './types';

export async function fetchCampaigns(): Promise<Campaign[]> {
  const response = await axios.get('/api/campaigns');
  return response.data;
}

export async function fetchNewsItems(): Promise<NewsItem[]> {
  const response = await axios.get('/api/newsitems');
  return response.data;
}