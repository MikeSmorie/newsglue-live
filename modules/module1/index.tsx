import { useState } from 'react';

export default function CampaignBuilder() {
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

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();
      
      if (res.ok) {
        setMessage('Campaign created successfully!');
        setForm({
          campaignName: '',
          description: '',
          targetAudience: '',
          brandVoice: '',
          keyBenefits: '',
          keywords: '',
          campaignGoals: '',
          campaignUrl: '',
        });
      } else {
        setMessage(`Error: ${JSON.stringify(result.error)}`);
      }
    } catch (error) {
      setMessage('Error creating campaign. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">Campaign Builder</h1>
      <p className="text-sm text-gray-400">
        Create marketing campaigns with targeted messaging, audience definition, and strategic goals.
      </p>
      
      {message && (
        <div className={`p-3 rounded ${message.includes('Error') ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {Object.keys(form).map((key) => (
          <div key={key}>
            <label className="block text-white font-medium mb-2 capitalize">
              {key.replace(/([A-Z])/g, ' $1')}
            </label>
            <input 
              name={key} 
              value={form[key as keyof typeof form]} 
              onChange={handleChange} 
              className="w-full p-3 border border-gray-600 rounded bg-gray-800 text-white focus:border-blue-500 focus:outline-none"
              placeholder={`Enter ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
            />
          </div>
        ))}
        <button 
          type="submit" 
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded font-medium"
        >
          {isLoading ? 'Creating Campaign...' : 'Create Campaign'}
        </button>
      </form>
    </div>
  );
}