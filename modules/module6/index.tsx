import { useEffect, useState } from 'react';

export default function ExecutionArena() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/newsjack/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign: {
            campaignName: "Tech Innovation 2024",
            description: "Promoting cutting-edge technology solutions",
            targetAudience: "Tech enthusiasts, early adopters",
            brandVoice: "Innovation-focused, forward-thinking"
          },
          newsItem: {
            headline: "Major Tech Company Announces Breakthrough in AI",
            content: "Leading technology company unveils revolutionary AI capabilities",
            sourceUrl: "https://example.com/ai-breakthrough"
          },
          channel: {
            name: "Twitter",
            maxLength: 280,
            tone: "engaging"
          }
        })
      });
      
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult('Error generating content: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">NewsJack Engine</h1>
      <p className="text-sm text-gray-400">
        Transform breaking news into brand-aligned social media content. Test the NewsJack generation system.
      </p>
      
      <div className="space-y-4">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Generating...' : 'Generate Sample Content'}
        </button>
        
        {result && (
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="text-white font-semibold mb-2">Generated Content:</h3>
            <pre className="text-gray-300 text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}
      </div>
    </div>
  );
}