import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useCampaignContext } from "@/hooks/use-campaign-context";
import { 
  Search, 
  Plus, 
  Trash2, 
  Send, 
  ChevronDown, 
  ChevronUp,
  Clock,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Grid3X3,
  Brain,
  Edit2,
  X
} from "lucide-react";
import { format } from "date-fns";

interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: {
    id: string | null;
    name: string;
  };
  relevanceScore: number;
  keywords: string[];
  content?: string;
}

interface SearchKeyword {
  id: string;
  keyword: string;
  isDefault: boolean;
  source?: 'user' | 'campaign' | 'AI';
}

export default function Module5GoogleNews() {
  const { activeCampaign } = useCampaignContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newKeyword, setNewKeyword] = useState("");
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [activePanel, setActivePanel] = useState<'search' | 'results'>('search');
  const [isSearching, setIsSearching] = useState(false);
  const [isSuggestingKeywords, setIsSuggestingKeywords] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<string | null>(null);
  const [editKeywordText, setEditKeywordText] = useState("");

  // Fetch campaign keywords
  const { data: keywords = [], isLoading: keywordsLoading } = useQuery({
    queryKey: ['/api/campaigns', activeCampaign?.id, 'keywords'],
    queryFn: async () => {
      const response = await fetch(`/api/google-news/keywords/${activeCampaign?.id}`);
      if (!response.ok) throw new Error('Failed to fetch keywords');
      return response.json();
    },
    enabled: !!activeCampaign?.id,
  });

  // Fetch news articles
  const { data: articles = [], isLoading: articlesLoading, refetch: refetchArticles } = useQuery({
    queryKey: ['/api/google-news', activeCampaign?.id, 'articles'],
    queryFn: async () => {
      const response = await fetch(`/api/google-news/articles/${activeCampaign?.id}`);
      if (!response.ok) throw new Error('Failed to fetch articles');
      return response.json();
    },
    enabled: !!activeCampaign?.id,
  });

  // Add keyword mutation
  const addKeywordMutation = useMutation({
    mutationFn: async (keyword: string) => {
      const response = await fetch(`/api/google-news/keywords/${activeCampaign?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      });
      if (!response.ok) throw new Error('Failed to add keyword');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', activeCampaign?.id, 'keywords'] });
      setNewKeyword("");
      toast({ title: "Keyword added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add keyword", variant: "destructive" });
    },
  });

  // Suggest keywords mutation
  const suggestKeywordsMutation = useMutation({
    mutationFn: async () => {
      setIsSuggestingKeywords(true);
      const response = await fetch(`/api/google-news/suggest-keywords/${activeCampaign?.id}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to suggest keywords');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', activeCampaign?.id, 'keywords'] });
      toast({ 
        title: "Keywords suggested successfully", 
        description: `Added ${data.count} AI-suggested keywords`
      });
      setIsSuggestingKeywords(false);
    },
    onError: () => {
      toast({ title: "Failed to suggest keywords", variant: "destructive" });
      setIsSuggestingKeywords(false);
    },
  });

  // Remove keyword mutation
  const removeKeywordMutation = useMutation({
    mutationFn: async (keywordId: string) => {
      const response = await fetch(`/api/google-news/keywords/${keywordId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove keyword');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', activeCampaign?.id, 'keywords'] });
      toast({ title: "Keyword removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove keyword", variant: "destructive" });
    },
  });

  // Search articles mutation
  const searchArticlesMutation = useMutation({
    mutationFn: async () => {
      setIsSearching(true);
      const response = await fetch(`/api/google-news/search/${activeCampaign?.id}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to search articles');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-news', activeCampaign?.id, 'articles'] });
      toast({ 
        title: "Search completed", 
        description: `Found ${data.count} new articles` 
      });
      setIsSearching(false);
    },
    onError: () => {
      toast({ title: "Search failed", variant: "destructive" });
      setIsSearching(false);
    },
  });

  // Clear all keywords mutation
  const clearAllKeywordsMutation = useMutation({
    mutationFn: async () => {
      const userKeywords = keywords.filter((k: SearchKeyword) => !k.isDefault);
      await Promise.all(
        userKeywords.map((keyword: SearchKeyword) =>
          fetch(`/api/google-news/keywords/${keyword.id}`, { method: 'DELETE' })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', activeCampaign?.id, 'keywords'] });
      toast({
        title: "Success",
        description: "All keywords cleared successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear keywords",
        variant: "destructive",
      });
    },
  });

  // Edit keyword mutation
  const editKeywordMutation = useMutation({
    mutationFn: async ({ keywordId, newText }: { keywordId: string; newText: string }) => {
      const response = await fetch(`/api/google-news/keywords/${keywordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newText }),
      });
      if (!response.ok) throw new Error('Failed to edit keyword');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns', activeCampaign?.id, 'keywords'] });
      setEditingKeyword(null);
      setEditKeywordText("");
      toast({
        title: "Success",
        description: "Keyword updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to edit keyword",
        variant: "destructive",
      });
    },
  });

  // Transfer articles mutation
  const transferArticlesMutation = useMutation({
    mutationFn: async (articleIds: string[]) => {
      const response = await fetch(`/api/google-news/transfer/${activeCampaign?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds }),
      });
      if (!response.ok) throw new Error('Failed to transfer articles');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-news', activeCampaign?.id, 'articles'] });
      setSelectedArticles([]);
      toast({ 
        title: "Articles transferred successfully", 
        description: `${data.count} articles sent to Module 6` 
      });
    },
    onError: () => {
      toast({ title: "Transfer failed", variant: "destructive" });
    },
  });

  // Delete articles mutation
  const deleteArticlesMutation = useMutation({
    mutationFn: async (articleIds: string[]) => {
      const response = await fetch(`/api/google-news/articles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds }),
      });
      if (!response.ok) throw new Error('Failed to delete articles');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/google-news', activeCampaign?.id, 'articles'] });
      setSelectedArticles([]);
      toast({ title: "Articles deleted successfully" });
    },
    onError: () => {
      toast({ title: "Delete failed", variant: "destructive" });
    },
  });

  const handleAddKeyword = () => {
    if (newKeyword.trim()) {
      addKeywordMutation.mutate(newKeyword.trim());
    }
  };

  // Helper function to format article freshness
  const formatFreshness = (publishedTime: string) => {
    const now = new Date();
    const published = new Date(publishedTime);
    const diffMs = now.getTime() - published.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${Math.floor(diffHours / 24)} days ago`;
  };

  // Helper function to get relevance badge variant
  const getRelevanceBadgeVariant = (relevance: number) => {
    if (relevance >= 80) return "default"; // Green
    if (relevance >= 60) return "secondary"; // Amber
    return "destructive"; // Red
  };

  // Helper function to get relevance badge color
  const getRelevanceBadgeColor = (relevance: number) => {
    if (relevance >= 80) return "bg-green-500 text-white";
    if (relevance >= 60) return "bg-amber-500 text-white";
    return "bg-red-500 text-white";
  };

  const handleSelectAll = () => {
    if (selectedArticles.length === articles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(articles.map((article: NewsArticle) => article.id));
    }
  };

  const handleArticleSelect = (articleId: string) => {
    setSelectedArticles(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const getRelevanceColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getArticleAge = (publishedAt: string) => {
    const hours = Math.floor((Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return { text: "Fresh", color: "text-green-600" };
    if (hours < 24) return { text: `${hours}h ago`, color: "text-yellow-600" };
    if (hours < 168) return { text: `${Math.floor(hours / 24)}d ago`, color: "text-orange-600" };
    return { text: "Stale", color: "text-gray-500" };
  };

  if (!activeCampaign) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No campaign selected. Please select a campaign to continue.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Module 5: Google News & Keyword Search
          </CardTitle>
          <CardDescription>
            Search Google News using campaign keywords to find relevant articles for NewsJacking
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Toggle Panel Bar */}
      <Card className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Button
              variant={activePanel === 'search' ? 'default' : 'outline'}
              onClick={() => setActivePanel('search')}
              className="flex-1"
            >
              <Search className="mr-2 h-4 w-4" />
              Search Panel
            </Button>
            <Button
              variant={activePanel === 'results' ? 'default' : 'outline'}
              onClick={() => setActivePanel('results')}
              className="flex-1"
            >
              <Grid3X3 className="mr-2 h-4 w-4" />
              Search Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Keywords Panel - Only show when Search Panel is active */}
      {activePanel === 'search' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Search Keywords</CardTitle>
              <Button
                onClick={() => suggestKeywordsMutation.mutate()}
                disabled={isSuggestingKeywords || suggestKeywordsMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
              >
                {isSuggestingKeywords ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Suggesting...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Suggest Keywords
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Add new keyword..."
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
              />
              <Button 
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim() || addKeywordMutation.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Clear All Keywords Button */}
            {keywords.some((k: SearchKeyword) => !k.isDefault) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => clearAllKeywordsMutation.mutate()}
                disabled={clearAllKeywordsMutation.isPending}
                className="w-full mb-2"
              >
                {clearAllKeywordsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Clearing Keywords...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-3 w-3" />
                    Clear All Keywords
                  </>
                )}
              </Button>
            )}

            {/* Keywords List */}
            <div className="space-y-2">
              {keywordsLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading keywords...</span>
                </div>
              ) : (
                keywords.map((keyword: SearchKeyword) => (
                  <div 
                    key={keyword.id}
                    className="flex items-center gap-2 p-2 border rounded-lg bg-background"
                  >
                    {keyword.source === 'AI' && <Brain className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                    
                    {editingKeyword === keyword.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editKeywordText}
                          onChange={(e) => setEditKeywordText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              editKeywordMutation.mutate({ keywordId: keyword.id, newText: editKeywordText });
                            }
                            if (e.key === 'Escape') {
                              setEditingKeyword(null);
                              setEditKeywordText("");
                            }
                          }}
                          className="text-sm"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          onClick={() => editKeywordMutation.mutate({ keywordId: keyword.id, newText: editKeywordText })}
                          disabled={editKeywordMutation.isPending || !editKeywordText.trim()}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingKeyword(null);
                            setEditKeywordText("");
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <Badge 
                          variant={keyword.source === 'AI' ? "default" : keyword.isDefault ? "outline" : "secondary"}
                          className="flex-1 justify-start"
                        >
                          {keyword.keyword}
                        </Badge>
                        
                        {!keyword.isDefault && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingKeyword(keyword.id);
                                setEditKeywordText(keyword.keyword);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeKeywordMutation.mutate(keyword.id)}
                              className="h-6 w-6 p-0 hover:bg-destructive/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <Button
              onClick={() => searchArticlesMutation.mutate()}
              disabled={isSearching || searchArticlesMutation.isPending}
              className="w-full"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching All Keywords...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search All Keywords
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Articles Results - Only show when Results Panel is active */}
      {activePanel === 'results' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Search Results</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{articles.length} articles</Badge>
              {selectedArticles.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => transferArticlesMutation.mutate(selectedArticles)}
                    disabled={transferArticlesMutation.isPending}
                  >
                    <Send className="mr-1 h-3 w-3" />
                    Send to Module 6
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteArticlesMutation.mutate(selectedArticles)}
                    disabled={deleteArticlesMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {articlesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading articles...</span>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No articles found. Click "Search All Keywords" to find relevant news.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={selectedArticles.length === articles.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Select All ({selectedArticles.length} selected)
                </span>
              </div>
              
              {articles.map((article: NewsArticle) => {
                const age = getArticleAge(article.publishedAt);
                return (
                  <Card key={article.id} className="relative">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedArticles.includes(article.id)}
                          onCheckedChange={() => handleArticleSelect(article.id)}
                        />
                        
                        {article.urlToImage && (
                          <img
                            src={article.urlToImage}
                            alt={article.title}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold line-clamp-2 text-sm">
                              {article.title}
                            </h3>
                            <div className="flex items-center gap-2 ml-2">
                              <Badge variant="outline" className={age.color}>
                                <Clock className="h-3 w-3 mr-1" />
                                {age.text}
                              </Badge>
                            </div>
                          </div>
                          
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {article.description}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {article.source.name}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(article.publishedAt), "MMM dd, yyyy")}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={getRelevanceBadgeVariant(article.relevanceScore)}
                                className={`text-xs ${getRelevanceBadgeColor(article.relevanceScore)}`}
                              >
                                {article.relevanceScore}% match
                              </Badge>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(article.url, '_blank')}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => transferArticlesMutation.mutate([article.id])}
                                disabled={transferArticlesMutation.isPending}
                              >
                                <Send className="h-3 w-3" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteArticlesMutation.mutate([article.id])}
                                disabled={deleteArticlesMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {article.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {article.keywords.map((keyword, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      )}
      </div>
    </TooltipProvider>
  );
}