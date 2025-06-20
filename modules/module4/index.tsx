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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Search Configuration */}
          <Card className={`transition-all duration-300 ${activePanel === 'search' ? 'ring-2 ring-blue-500' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Search Panel</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActivePanel('search')}
                  className={activePanel === 'search' ? 'bg-blue-50 dark:bg-blue-900' : ''}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Keyword */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Add Search Keywords</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter keyword..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleAddKeyword();
                      }
                    }}
                    disabled={addKeywordMutation.isPending}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        onClick={handleAddKeyword} 
                        disabled={!newKeyword.trim() || addKeywordMutation.isPending}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add keyword</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* AI Keyword Suggestions */}
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => suggestKeywordsMutation.mutate()}
                      disabled={isSuggestingKeywords || !activeCampaign}
                      className="flex-1"
                    >
                      {isSuggestingKeywords ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Brain className="h-4 w-4 mr-2" />
                      )}
                      {isSuggestingKeywords ? 'Suggesting...' : 'Suggest Keywords'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>AI-powered keyword suggestions</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => clearAllKeywordsMutation.mutate()}
                      disabled={keywords.filter((k: SearchKeyword) => !k.isDefault).length === 0}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Clear all user keywords</TooltipContent>
                </Tooltip>
              </div>

              <Separator />

              {/* Keywords List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Active Keywords ({keywords.length})</label>
                  {keywords.length > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => searchArticlesMutation.mutate()}
                          disabled={isSearching || keywords.length === 0}
                        >
                          {isSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Search className="h-4 w-4 mr-2" />
                          )}
                          {isSearching ? 'Searching...' : 'Search All'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Search all keywords</TooltipContent>
                    </Tooltip>
                  )}
                </div>

                {keywordsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : keywords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No keywords configured</p>
                    <p className="text-xs">Add keywords to start searching</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {keywords.map((keyword: SearchKeyword) => (
                      <div
                        key={keyword.id}
                        className="flex items-center gap-2 p-2 border rounded-lg bg-background hover:bg-muted/50"
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
                              <span className="text-sm font-medium">{keyword.keyword}</span>
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
                                    disabled={keyword.isDefault}
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
                                    disabled={keyword.isDefault || removeKeywordMutation.isPending}
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

          {/* Right Panel - Search Results */}
          <Card className={`transition-all duration-300 ${activePanel === 'results' ? 'ring-2 ring-blue-500' : ''}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Search Results</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActivePanel('results')}
                  className={activePanel === 'results' ? 'bg-blue-50 dark:bg-blue-900' : ''}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {articlesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : articles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No articles found</p>
                  <p className="text-xs">Run a search to find articles</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Bulk Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedArticles.length === articles.length && articles.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm">
                        {selectedArticles.length > 0 
                          ? `${selectedArticles.length} selected`
                          : `${articles.length} articles`
                        }
                      </span>
                    </div>
                    
                    {selectedArticles.length > 0 && (
                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              onClick={() => transferArticlesMutation.mutate(selectedArticles)}
                              disabled={transferArticlesMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send to Module 6
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>🡆 Send to Module 6</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteArticlesMutation.mutate(selectedArticles)}
                              disabled={deleteArticlesMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete selected</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>

                  {/* Articles List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {articles.map((article: NewsArticle) => (
                      <div
                        key={article.id}
                        className="p-3 border rounded-lg bg-background hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedArticles.includes(article.id)}
                            onCheckedChange={(checked) => handleArticleSelect(article.id)}
                          />
                          
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm leading-tight line-clamp-2">
                                {article.title}
                              </h4>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ml-2 p-1 hover:bg-muted rounded"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>🔗 Open source article</TooltipContent>
                              </Tooltip>
                            </div>
                            
                            {article.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {article.description}
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {article.source.name}
                                </Badge>
                                
                                <Badge
                                  className={`text-xs ${getRelevanceBadgeColor(article.relevanceScore)}`}
                                >
                                  {article.relevanceScore}%
                                </Badge>
                                
                                <span className={`text-xs ${getArticleAge(article.publishedAt).color}`}>
                                  {getArticleAge(article.publishedAt).text}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}