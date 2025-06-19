import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Globe, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SeoLandingPageButtonProps {
  newsjackId: string;
  initialStatus?: 'unpublished' | 'generating' | 'published';
  initialUrl?: string;
}

export function SeoLandingPageButton({ 
  newsjackId, 
  initialStatus = 'unpublished',
  initialUrl 
}: SeoLandingPageButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [url, setUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Auto-refresh status every 10 seconds after toggle
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (status === 'generating') {
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/landing-page/${newsjackId}/status`);
          if (response.ok) {
            const data = await response.json();
            setStatus(data.status);
            setUrl(data.url);
            
            if (data.status === 'published') {
              clearInterval(interval);
              toast({
                title: "Blog Published",
                description: "Your SEO-optimized blog post is now live!",
              });
            }
          }
        } catch (error) {
          console.error('Failed to check status:', error);
        }
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, newsjackId, toast]);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/landing-page/${newsjackId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data.status);
        setUrl(data.url);
        
        if (data.status === 'published') {
          toast({
            title: "Blog Published",
            description: "Your SEO-optimized blog post is now live!",
          });
        } else if (data.status === 'generating') {
          toast({
            title: "Publishing Blog",
            description: "Creating your SEO-optimized landing page...",
          });
        }
      } else {
        throw new Error('Failed to toggle landing page');
      }
    } catch (error) {
      console.error('Error toggling landing page:', error);
      toast({
        title: "Error",
        description: "Failed to publish blog post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case 'generating':
        return (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating...
          </>
        );
      case 'published':
        return (
          <>
            <Globe className="w-4 h-4 mr-2" />
            Published ✅
          </>
        );
      default:
        return (
          <>
            <ExternalLink className="w-4 h-4 mr-2" />
            Create SEO Blog
          </>
        );
    }
  };

  const handleClick = () => {
    if (status === 'published' && url) {
      window.open(url, '_blank');
    } else {
      handleToggle();
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading || status === 'generating'}
      variant={status === 'published' ? 'default' : 'outline'}
      size="sm"
      className={status === 'published' ? 'bg-green-600 hover:bg-green-700' : ''}
    >
      {getButtonContent()}
    </Button>
  );
}