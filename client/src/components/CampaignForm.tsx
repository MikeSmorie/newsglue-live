'use client';
import { useState } from 'react';

export default function CampaignForm() {
  const [form, setForm] = useState({
    campaignName: '',
    description: '',
    targetAudience: '',
    brandVoice: '',
    keyBenefits: '',
    keywords: '',
    campaignGoals: '',
    campaignUrl: '',
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const res = await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const result = await res.json();
    alert(res.ok ? 'Campaign Created!' : `Error: ${result.error}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {Object.keys(form).map((key) => (
        <div key={key}>
          <label className="block capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
          <input name={key} value={form[key as keyof typeof form]} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
      ))}
      <button type="submit" className="bg-blue-600 text-white p-2 rounded">Create Campaign</button>
    </form>
  );
}