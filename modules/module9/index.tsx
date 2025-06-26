import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Search, 
  Globe, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  FileText, 
  Eye, 
  Activity,
  HelpCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCampaignContext } from "@/hooks/use-campaign-context";

interface BlogMetadata {
  id: string;
  slug: string;
  title: string;
  status: 'published' | 'missing' | 'error';
  sitemapEntry: boolean;
  metadataScore: number;
  lastAICrawlAt: string | null;
  canonicalTag: boolean;
  openGraph: boolean;
  jsonLD: boolean;
  aiDiscoveryBlock: boolean;
  sitemapInclusion: boolean;
  publishedAt: string;
  indexable: boolean;
}

interface SitemapData {
  entryCount: number;
  lastModified: string;
  entries: Array<{
    url: string;
    lastmod: string;
    slug: string;
  }>;
}

export default function Module9() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCampaignId } = useCampaignContext();
  const [selectedBlog, setSelectedBlog] = useState<BlogMetadata | null>(null);

  // Fetch discoverability audit data
  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['/api/discoverability/audit', activeCampaignId],
    queryFn: async () => {
      const response = await fetch(`/api/discoverability/audit?campaignId=${activeCampaignId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch audit data');
      return response.json();
    },
    enabled: !!activeCampaignId
  });

  // Fetch sitemap data
  const { data: sitemapData, isLoading: sitemapLoading } = useQuery({
    queryKey: ['/api/discoverability/sitemap'],
    queryFn: async () => {
      const response = await fetch('/api/discoverability/sitemap', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch sitemap data');
      return response.json();
    }
  });

  // Re-ping mutation
  const repingMutation = useMutation({
    mutationFn: async (newsjackId: string) => {
      const response = await fetch(`/api/discoverability/reping/${newsjackId}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to re-ping');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discoverability/audit'] });
      toast({ title: "Re-ping successful", description: "AI indexing signals sent" });
    },
    onError: () => {
      toast({ 
        title: "Re-ping failed", 
        description: "Failed to send indexing signals",
        variant: "destructive" 
      });
    }
  });

  const handleExportPDF = async () => {
    try {
      const response = await fetch('/api/discoverability/export/pdf', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to export PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ai-indexing-report-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: "PDF exported successfully" });
    } catch (error) {
      toast({ 
        title: "Export failed", 
        description: "Failed to export PDF report",
        variant: "destructive" 
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/discoverability/export/csv', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to export CSV');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `metadata-validation-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: "CSV exported successfully" });
    } catch (error) {
      toast({ 
        title: "Export failed", 
        description: "Failed to export CSV data",
        variant: "destructive" 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800">Published</Badge>;
      case 'missing':
        return <Badge variant="destructive">Missing</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getMetadataScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-yellow-600";
    return "text-red-600";
  };

  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "< 1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  if (!activeCampaignId) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <Search className="mx-auto h-16 w-16 text-foreground mb-4" />
          <h3 className="text-xl font-medium text-foreground dark:text-foreground mb-2">
            No Campaign Available
          </h3>
          <p className="text-foreground dark:text-foreground mb-6">
            Create a campaign to monitor AI discoverability of published content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Search className="h-8 w-8 text-blue-600" />
              Module 9: AI Discoverability Engine
            </h1>
            <p className="text-foreground mt-2">
              Track AI and SEO indexing status of your published content
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-foreground dark:text-foreground">Published Blogs</p>
                    <UITooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white border-gray-700">
                        <p className="text-sm">Total number of blog-style NewsJack outputs published for AI discovery.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {auditData?.blogs?.length || 0}
                  </p>
                </div>
                <Globe className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-foreground dark:text-foreground">Indexability Rate</p>
                    <UITooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white border-gray-700">
                        <p className="text-sm">Percentage of published blogs that are properly indexable by AI crawlers.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {auditData?.indexabilityRate || 0}%
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-foreground dark:text-foreground">Avg. Metadata Score</p>
                    <UITooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white border-gray-700">
                        <p className="text-sm">Average metadata completeness score across all published blogs (1-5 scale).</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                    {auditData?.avgMetadataScore?.toFixed(1) || 0}/5
                  </p>
                </div>
                <Activity className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-foreground dark:text-foreground">Sitemap Entries</p>
                    <UITooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-3 w-3 text-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-900 text-white border-gray-700">
                        <p className="text-sm">Number of published blogs included in the AI sitemap for crawler discovery.</p>
                      </TooltipContent>
                    </UITooltip>
                  </div>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {sitemapData?.entryCount || 0}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Published Blogs Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Published Blogs</CardTitle>
                <CardDescription>Monitor AI discoverability status of your content</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : auditData?.blogs?.length > 0 ? (
                  <div className="space-y-4">
                    {auditData.blogs.map((blog: BlogMetadata) => (
                      <div
                        key={blog.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedBlog?.id === blog.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => setSelectedBlog(blog)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{blog.slug}</h4>
                              {getStatusBadge(blog.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-foreground dark:text-foreground">
                              <span>Sitemap: {blog.sitemapEntry ? '✅ Yes' : '❌ No'}</span>
                              <span className={`font-medium ${getMetadataScoreColor(blog.metadataScore)}`}>
                                Score: {blog.metadataScore}/5
                              </span>
                              <span>Last AI Ping: {formatRelativeTime(blog.lastAICrawlAt)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/landing-pages/${blog.slug}.html`, '_blank');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                repingMutation.mutate(blog.id);
                              }}
                              disabled={repingMutation.isPending}
                            >
                              <RefreshCw className={`h-4 w-4 ${repingMutation.isPending ? 'animate-spin' : ''}`} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Globe className="mx-auto h-12 w-12 text-foreground mb-4" />
                    <p className="text-foreground dark:text-foreground">
                      No published blogs found. Create and publish content to see AI discoverability status.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Metadata Health & Export Options */}
          <div className="space-y-6">
            {/* Metadata Health Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Metadata Health Audit</CardTitle>
                <CardDescription>
                  {selectedBlog ? `Analysis for ${selectedBlog.slug}` : 'Select a blog to view metadata health'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedBlog ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Canonical Tag</span>
                      {selectedBlog.canonicalTag ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">OpenGraph</span>
                      {selectedBlog.openGraph ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">JSON-LD Schema</span>
                      {selectedBlog.jsonLD ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">AI Discovery Block</span>
                      {selectedBlog.aiDiscoveryBlock ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Sitemap Inclusion</span>
                      {selectedBlog.sitemapInclusion ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <Separator />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(`/landing-pages/${selectedBlog.slug}.html`, '_blank')}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Content
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="mx-auto h-12 w-12 text-foreground mb-4" />
                    <p className="text-foreground dark:text-foreground">
                      Select a blog from the list to view its metadata health
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sitemap Monitor */}
            <Card>
              <CardHeader>
                <CardTitle>Sitemap Monitor</CardTitle>
                <CardDescription>AI sitemap status and entries</CardDescription>
              </CardHeader>
              <CardContent>
                {sitemapLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : sitemapData ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Entries</span>
                      <Badge variant="secondary">{sitemapData.entryCount}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Last Modified</span>
                      <span className="text-sm text-foreground dark:text-foreground">
                        {formatRelativeTime(sitemapData.lastModified)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open('/ai-sitemap.xml', '_blank')}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Sitemap
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <XCircle className="mx-auto h-8 w-8 text-red-400 mb-2" />
                    <p className="text-sm text-foreground dark:text-foreground">
                      Sitemap not accessible
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>Download discoverability reports</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleExportPDF} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF Report
                </Button>
                <Button onClick={handleExportCSV} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}