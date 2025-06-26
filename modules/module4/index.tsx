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
  X,
  Eye
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

export default function Module4NewsAggregator() {
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

  // Fetch full campaign data for resilience
  const { data: fullCampaignData } = useQuery({
    queryKey: ['/api/campaigns', activeCampaign?.id, 'full'],
    queryFn: async () => {
      const response = await fetch(`/api/campaigns/${activeCampaign?.id}`);
      if (!response.ok) throw new Error('Failed to fetch campaign');
      return response.json();
    },
    enabled: !!activeCampaign?.id,
  });

  // Fetch campaign keywords
  const { data: keywords = [], isLoading: keywordsLoading } = useQuery({
    queryKey: ['/api/campaigns', activeCampaign?.id, 'keywords'],
    queryFn: async () => {
      const response = await fetch(`/api/news-aggregator/keywords/${activeCampaign?.id}`);
      if (!response.ok) throw new Error('Failed to fetch keywords');
      return response.json();
    },
    enabled: !!activeCampaign?.id,
  });

  // Fetch news articles
  const { data: articles = [], isLoading: articlesLoading, refetch: refetchArticles } = useQuery({
    queryKey: ['/api/news-aggregator', activeCampaign?.id, 'articles'],
    queryFn: async () => {
      const response = await fetch(`/api/news-aggregator/articles/${activeCampaign?.id}`);
      if (!response.ok) throw new Error('Failed to fetch articles');
      return response.json();
    },
    enabled: !!activeCampaign?.id,
  });

  // Add keyword mutation
  const addKeywordMutation = useMutation({
    mutationFn: async (keyword: string) => {
      const response = await fetch(`/api/news-aggregator/keywords/${activeCampaign?.id}`, {
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
      const response = await fetch(`/api/news-aggregator/suggest-keywords/${activeCampaign?.id}`, {
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
      const response = await fetch(`/api/news-aggregator/keywords/${keywordId}`, {
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
      const response = await fetch(`/api/news-aggregator/search/${activeCampaign?.id}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to search articles');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-aggregator', activeCampaign?.id, 'articles'] });
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
          fetch(`/api/news-aggregator/keywords/${keyword.id}`, { method: 'DELETE' })
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
      const response = await fetch(`/api/news-aggregator/keywords/${keywordId}`, {
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

  // Search single keyword mutation
  const searchKeywordMutation = useMutation({
    mutationFn: async (keywordId: string) => {
      const response = await fetch(`/api/news-aggregator/search-keyword/${activeCampaign?.id}/${keywordId}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to search keyword');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-aggregator', activeCampaign?.id, 'articles'] });
      toast({
        title: "Keyword search completed",
        description: `Found ${data.count} articles for "${data.keyword}"`,
      });
      setActivePanel('results'); // Switch to results panel
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to search keyword",
        variant: "destructive",
      });
    },
  });

  // Transfer articles mutation
  const transferArticlesMutation = useMutation({
    mutationFn: async (articleIds: string[]) => {
      const response = await fetch(`/api/news-aggregator/transfer/${activeCampaign?.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds }),
      });
      if (!response.ok) throw new Error('Failed to transfer articles');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-aggregator', activeCampaign?.id, 'articles'] });
      setSelectedArticles([]);
      toast({ 
        title: "Sent to Execution Module", 
        description: `${data.count} articles transferred successfully` 
      });
    },
    onError: () => {
      toast({ title: "Transfer failed", variant: "destructive" });
    },
  });

  // Delete articles mutation
  const deleteArticlesMutation = useMutation({
    mutationFn: async (articleIds: string[]) => {
      const response = await fetch(`/api/news-aggregator/articles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds }),
      });
      if (!response.ok) throw new Error('Failed to delete articles');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/news-aggregator', activeCampaign?.id, 'articles'] });
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
            Module 4: News Aggregator Search
          </CardTitle>
          <CardDescription>
            Search news aggregators using campaign keywords to find relevant articles for NewsJacking
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
                  <span className="text-sm">Loading keywords...</span>
                </div>
              ) : keywords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No keywords configured</p>
                  <p className="text-xs">Add keywords or use AI suggestions</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Search All Button */}
                  <Button
                    variant="outline"
                    onClick={() => searchArticlesMutation.mutate()}
                    disabled={isSearching || keywords.length === 0}
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
                        Search All Keywords ({keywords.length})
                      </>
                    )}
                  </Button>

                  {/* Individual Keywords */}
                  {keywords.map((keyword: SearchKeyword) => (
                    <div
                      key={keyword.id}
                      className="flex items-center gap-2 p-3 border rounded-lg bg-background hover:bg-muted/50"
                    >
                      {editingKeyword === keyword.id ? (
                        <div className="flex gap-1 flex-1">
                          <Input
                            value={editKeywordText}
                            onChange={(e) => setEditKeywordText(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                editKeywordMutation.mutate({
                                  keywordId: keyword.id,
                                  newText: editKeywordText,
                                });
                              }
                              if (e.key === 'Escape') {
                                setEditingKeyword(null);
                                setEditKeywordText("");
                              }
                            }}
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              editKeywordMutation.mutate({
                                keywordId: keyword.id,
                                newText: editKeywordText,
                              });
                            }}
                            disabled={editKeywordMutation.isPending}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingKeyword(null);
                              setEditKeywordText("");
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <span className="text-sm font-medium text-foreground">{keyword.keyword}</span>
                            {keyword.isDefault && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingKeyword(keyword.id);
                                    setEditKeywordText(keyword.keyword);
                                  }}
                                  disabled={false}
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>📎 Edit keyword</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => searchKeywordMutation.mutate(keyword.id)}
                                  disabled={searchKeywordMutation.isPending}
                                >
                                  <Search className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>🔍 Search keyword</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeKeywordMutation.mutate(keyword.id)}
                                  disabled={removeKeywordMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>🗑️ Delete keyword</TooltipContent>
                            </Tooltip>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Panel - Only show when Search Results is active */}
      {activePanel === 'results' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Search Results {articles.length > 0 && `(${articles.length} articles)`}
              </CardTitle>
              {articles.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSelectAll}
                  >
                    {selectedArticles.length === articles.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  {selectedArticles.length > 0 && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => transferArticlesMutation.mutate(selectedArticles)}
                        disabled={transferArticlesMutation.isPending}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Send to Module 6 ({selectedArticles.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteArticlesMutation.mutate(selectedArticles)}
                        disabled={deleteArticlesMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete ({selectedArticles.length})
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {articlesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading articles...</span>
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No articles found</p>
                <p className="text-sm">Switch to Search Panel to configure keywords and run searches</p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article: NewsArticle) => (
                  <div
                    key={article.id}
                    className="p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedArticles.includes(article.id)}
                        onCheckedChange={(checked) => handleArticleSelect(article.id)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-base leading-tight text-foreground">
                            {article.title}
                          </h3>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              className={`text-xs font-medium ${getRelevanceBadgeColor(article.relevanceScore)}`}
                            >
                              {article.relevanceScore}% match
                            </Badge>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  asChild
                                >
                                  <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>🔗 Open source article</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        
                        {article.description && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {article.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              {article.source.name}
                            </Badge>
                            
                            <span className={`text-xs font-medium ${getArticleAge(article.publishedAt).color}`}>
                              {getArticleAge(article.publishedAt).text}
                            </span>
                          </div>
                          
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => transferArticlesMutation.mutate([article.id])}
                                  disabled={transferArticlesMutation.isPending}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Send to Module 6
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>🡆 Send to Module 6</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => deleteArticlesMutation.mutate([article.id])}
                                  disabled={deleteArticlesMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>🗑️ Delete article</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
      </div>
    </TooltipProvider>
  );
}