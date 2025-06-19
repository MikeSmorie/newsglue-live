import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileText } from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLength: number;
  style: string;
}

interface SimplePlatformSelectorProps {
  selectedPlatforms?: string[];
  onSelectionChange?: (platforms: string[]) => void;
  disabled?: boolean;
}

export default function SimplePlatformSelector({ 
  selectedPlatforms = [],
  onSelectionChange,
  disabled = false 
}: SimplePlatformSelectorProps) {
  const [selected, setSelected] = useState<string[]>(selectedPlatforms);

  const { data: platforms = [], isLoading } = useQuery<Platform[]>({
    queryKey: ['platforms'],
    queryFn: async () => {
      const res = await fetch('/api/campaign-channels/platforms', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch platforms');
      return res.json();
    },
  });

  const handleChange = (platformId: string, checked: boolean) => {
    const newSelected = checked
      ? [...selected, platformId]
      : selected.filter(id => id !== platformId);
    
    setSelected(newSelected);
    if (onSelectionChange) {
      onSelectionChange(newSelected);
    }
  };

  if (isLoading) {
    return <div>Loading platforms...</div>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Target Social Platforms</h3>
      <p className="text-xs text-gray-500">
        Select platforms for your campaign distribution.
      </p>
      
      <div className="space-y-2">
        {platforms.map((platform) => (
          <div key={platform.id} className="flex items-center space-x-2 p-2 border rounded">
            <Checkbox
              id={platform.id}
              checked={selected.includes(platform.id)}
              onCheckedChange={(checked) => handleChange(platform.id, !!checked)}
              disabled={disabled}
            />
            <Label htmlFor={platform.id} className="text-sm">
              {platform.name}
            </Label>
            <span className="text-xs text-gray-500">
              ({platform.maxLength} chars)
            </span>
          </div>
        ))}
      </div>
      
      {selected.length > 0 && (
        <div className="text-xs text-green-600">
          Selected: {selected.length} platform{selected.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}