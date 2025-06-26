import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { HelpCircle, Twitter, Linkedin, Instagram, Facebook, Youtube, Video } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface Platform {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLength: number;
  style: string;
}

interface Channel {
  id: number;
  campaignId: string;
  platform: string;
  enabled: boolean;
}

interface SocialChannelsSelectorProps {
  campaignId?: string;
  selectedPlatforms?: string[];
  onSelectionChange?: (platforms: string[]) => void;
  disabled?: boolean;
}

const platformIcons: Record<string, React.ComponentType<any>> = {
  Twitter,
  Linkedin,
  Instagram,
  Facebook,
  Youtube,
  Video, // for TikTok
};

export default function SocialChannelsSelector({ 
  campaignId, 
  selectedPlatforms = [], 
  onSelectionChange,
  disabled = false 
}: SocialChannelsSelectorProps) {
  const [localSelection, setLocalSelection] = useState<string[]>(selectedPlatforms);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available platforms
  const { data: platforms = [], isLoading: platformsLoading } = useQuery<Platform[]>({
    queryKey: ['platforms'],
    queryFn: async () => {
      const res = await fetch('/api/campaign-channels/platforms', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch platforms');
      return res.json();
    },
  });

  // Fetch current campaign channels if campaignId is provided
  const { data: currentChannels = [] } = useQuery<Channel[]>({
    queryKey: ['campaign-channels', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const res = await fetch(`/api/campaign-channels/${campaignId}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch campaign channels');
      return res.json();
    },
    enabled: !!campaignId,
  });

  // Initialize local selection only once to prevent loops
  React.useEffect(() => {
    if (selectedPlatforms.length > 0) {
      setLocalSelection(selectedPlatforms);
    }
  }, [selectedPlatforms.join(',')]);

  React.useEffect(() => {
    if (currentChannels.length > 0 && !campaignId) {
      const enabledPlatforms = currentChannels
        .filter(channel => channel.enabled)
        .map(channel => channel.platform);
      setLocalSelection(enabledPlatforms);
    }
  }, [currentChannels.length, campaignId]);

  // Update channels mutation
  const updateChannelsMutation = useMutation({
    mutationFn: async (platforms: string[]) => {
      if (!campaignId) return;
      const res = await fetch(`/api/campaign-channels/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ platforms }),
      });
      if (!res.ok) throw new Error('Failed to update channels');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-channels', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast({
        title: 'Channels Updated',
        description: 'Social platform selection has been saved.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update social platforms.',
        variant: 'destructive',
      });
    },
  });

  const handlePlatformToggle = (platformId: string, checked: boolean) => {
    const newSelection = checked
      ? [...localSelection, platformId]
      : localSelection.filter(id => id !== platformId);

    setLocalSelection(newSelection);
    onSelectionChange?.(newSelection);

    // If we have a campaignId, update immediately
    if (campaignId) {
      updateChannelsMutation.mutate(newSelection);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = platformIcons[iconName] || HelpCircle;
    return <IconComponent className="h-4 w-4" />;
  };

  if (platformsLoading) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Target Social Platforms
        </h3>
        <div className="text-sm text-gray-500">Loading platforms...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">
          Target Social Platforms
        </h3>
        <p className="text-xs text-foreground">
          Select platforms where this campaign will be distributed. Each platform has unique content style requirements.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {platforms.map((platform) => {
            const isSelected = localSelection.includes(platform.id);
            
            return (
              <div
                key={platform.id}
                className={`
                  flex items-start space-x-3 p-3 rounded-lg border transition-colors
                  ${isSelected 
                    ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                onClick={() => !disabled && handlePlatformToggle(platform.id, !isSelected)}
              >
                <Checkbox
                  id={platform.id}
                  checked={isSelected}
                  onCheckedChange={(checked) => 
                    !disabled && handlePlatformToggle(platform.id, !!checked)
                  }
                  disabled={disabled}
                  className="mt-1"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getIcon(platform.icon)}
                    <Label 
                      htmlFor={platform.id}
                      className="font-medium text-sm cursor-pointer"
                    >
                      {platform.name}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-2">
                          <p>{platform.description}</p>
                          <div className="text-xs text-gray-500">
                            <strong>Style:</strong> {platform.style}
                          </div>
                          <div className="text-xs text-gray-500">
                            <strong>Max Length:</strong> {platform.maxLength.toLocaleString()} chars
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-foreground mt-1">
                    {platform.style}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {localSelection.length > 0 && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded-md">
            <p className="text-xs text-green-700 dark:text-green-300">
              Selected: {localSelection.length} platform{localSelection.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}