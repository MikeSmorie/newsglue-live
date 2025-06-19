import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Clock, DollarSign, Target, Download, Copy, FileText, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useCampaignContext } from "@/hooks/use-campaign-context";

interface CampaignMetrics {
  id: number;
  campaignId: string;
  hourlyRate: string;
  humanEstimateMinutes: number;
  humanAiEstimateMinutes: number;
  totalOutputs: number;
  totalTimeSavedSeconds: number;
  totalCostSaved: string;
  complianceScore: string;
  ctaPresenceRate: string;
  efficiencyScore: string;
  createdAt: string;
  updatedAt: string;
}

interface OutputMetrics {
  id: number;
  campaignId: string;
  platform: string;
  generationDurationSeconds: number;
  wordCount: number;
  characterCount: number;
  toneMatchRating: string;
  qualityRating: string;
  complianceCheck: boolean;
  ctaPresent: boolean;
  urlPresent: boolean;
  estimatedHumanTimeMinutes: number;
  timeSavedSeconds: number;
  costSaved: string;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
}

const PLATFORM_COLORS = {
  'facebook': '#1877f2',
  'twitter': '#1da1f2',
  'linkedin': '#0077b5',
  'instagram': '#8dd1e1',
  'youtube': '#d084d0'
};

export default function Module8() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hourlyRate, setHourlyRate] = useState<string>("40.00");
  const { activeCampaignId, activeCampaign } = useCampaignContext();

  // Fetch campaign metrics
  const { data: campaignMetrics, isLoading: metricsLoading } = useQuery<CampaignMetrics>({
    queryKey: ['/api/metrics/campaign', activeCampaignId],
    queryFn: async () => {
      const response = await fetch(`/api/metrics/campaign/${activeCampaignId}`);
      if (!response.ok) throw new Error('Failed to fetch campaign metrics');
      return response.json();
    },
    enabled: !!activeCampaignId
  });

  // Fetch output metrics
  const { data: outputMetrics = [], isLoading: outputLoading } = useQuery<OutputMetrics[]>({
    queryKey: ['/api/metrics/outputs', activeCampaignId],
    queryFn: async () => {
      const response = await fetch(`/api/metrics/outputs/${activeCampaignId}`);
      if (!response.ok) throw new Error('Failed to fetch output metrics');
      return response.json();
    },
    enabled: !!activeCampaignId
  });

  // Update hourly rate mutation
  const updateRateMutation = useMutation({
    mutationFn: async ({ campaignId, hourlyRate }: { campaignId: string; hourlyRate: string }) => {
      const response = await fetch('/api/metrics/update-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaignId, hourlyRate })
      });
      if (!response.ok) throw new Error('Failed to update hourly rate');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/campaign', activeCampaignId] });
      toast({ title: "Hourly rate updated successfully" });
    }
  });

  const handleUpdateRate = () => {
    if (!activeCampaignId || !hourlyRate) return;
    updateRateMutation.mutate({ campaignId: activeCampaignId, hourlyRate });
  };

  const handleExportReport = async () => {
    if (!activeCampaignId || !campaignMetrics) return;
    
    try {
      const response = await fetch('/api/metrics/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaignId: activeCampaignId })
      });

      if (!response.ok) throw new Error('Failed to export report');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `metrics-report-${activeCampaignId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({ title: "Report exported successfully" });
    } catch (error) {
      toast({ 
        title: "Export failed", 
        description: "Failed to export metrics report",
        variant: "destructive" 
      });
    }
  };

  const handleExportCSV = async () => {
    if (!activeCampaignId) return;
    
    try {
      const response = await fetch(`/api/metrics/export/${activeCampaignId}/csv`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to export CSV');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `metrics-report-${activeCampaignId}-${Date.now()}.csv`;
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

  const handleCopyMetrics = () => {
    if (!campaignMetrics) return;
    
    const metricsText = `Campaign Metrics Summary:
Total Outputs: ${campaignMetrics.totalOutputs}
Time Saved: ${Math.round(campaignMetrics.totalTimeSavedSeconds / 60)} minutes
Cost Saved: $${campaignMetrics.totalCostSaved}
Compliance Score: ${campaignMetrics.complianceScore}%
CTA Presence: ${campaignMetrics.ctaPresenceRate}%
Efficiency Score: ${campaignMetrics.efficiencyScore}%`;

    navigator.clipboard.writeText(metricsText);
    toast({ title: "Metrics copied to clipboard" });
  };

  // Transform data for charts
  const platformData = outputMetrics.reduce((acc: any[], metric) => {
    const existing = acc.find(item => item.platform === metric.platform);
    if (existing) {
      existing.outputs += 1;
      existing.timeSaved += metric.timeSavedSeconds;
      existing.costSaved += parseFloat(metric.costSaved);
    } else {
      acc.push({
        platform: metric.platform,
        outputs: 1,
        timeSaved: metric.timeSavedSeconds,
        costSaved: parseFloat(metric.costSaved)
      });
    }
    return acc;
  }, []);

  const pieData = platformData.map(item => ({
    name: item.platform.charAt(0).toUpperCase() + item.platform.slice(1),
    value: item.outputs,
    fill: PLATFORM_COLORS[item.platform as keyof typeof PLATFORM_COLORS] || '#8884d8'
  }));

  if (!activeCampaignId) {
    return (
      <div className="container max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <BarChart3 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Campaign Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Create a campaign in Module 1 to view performance metrics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-green-600" />
            Module 8: Metrics Engine
          </h1>
          <p className="text-gray-600 mt-2">
            Performance analytics and efficiency tracking for NewsJack campaigns
          </p>
          {activeCampaign && (
            <p className="text-sm text-gray-500 mt-1">
              Active Campaign: <span className="font-medium">{activeCampaign.campaignName}</span>
            </p>
          )}
        </div>
      </div>

      {metricsLoading || outputLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaignMetrics ? (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Outputs</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{campaignMetrics.totalOutputs}</p>
                  </div>
                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Time Saved</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {Math.round(campaignMetrics.totalTimeSavedSeconds / 60)}m
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Cost Saved</p>
                    <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-400">
                      ${campaignMetrics.totalCostSaved}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-emerald-800 dark:text-emerald-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Efficiency</p>
                    <p className="text-3xl font-bold text-purple-800 dark:text-purple-400">
                      {campaignMetrics.efficiencyScore}%
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-800 dark:text-purple-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration and Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Rate Configuration</CardTitle>
                <CardDescription>Update hourly rate for cost calculations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hourly-rate">Hourly Rate ($)</Label>
                  <Input
                    id="hourly-rate"
                    type="number"
                    step="0.01"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="40.00"
                  />
                </div>
                <Button 
                  onClick={handleUpdateRate}
                  disabled={updateRateMutation.isPending}
                  className="w-full"
                >
                  Update Rate
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Metrics</CardTitle>
                <CardDescription>Quality and compliance tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Compliance Score</span>
                  <Badge variant="secondary">{campaignMetrics.complianceScore}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">CTA Presence</span>
                  <Badge variant="secondary">{campaignMetrics.ctaPresenceRate}%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Quality Rating</span>
                  <Badge variant="secondary">
                    {outputMetrics.length > 0 
                      ? Math.round(outputMetrics.reduce((acc, m) => acc + parseFloat(m.qualityRating), 0) / outputMetrics.length * 10) / 10
                      : 0}/5
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Export Options</CardTitle>
                <CardDescription>Download or share metrics data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={handleExportReport} className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF Report
                </Button>
                <Button onClick={handleExportCSV} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV Data
                </Button>
                <Button onClick={handleCopyMetrics} variant="outline" className="w-full">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Summary
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          {outputMetrics.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Performance</CardTitle>
                  <CardDescription>Output generation by platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={platformData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="platform" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="outputs" fill="#3b82f6" name="Outputs" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Platform Distribution</CardTitle>
                  <CardDescription>Content distribution across platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Detailed Output Metrics */}
          {outputMetrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Output Metrics</CardTitle>
                <CardDescription>Individual content generation performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Platform</th>
                        <th className="text-left p-2">Duration</th>
                        <th className="text-left p-2">Words</th>
                        <th className="text-left p-2">Quality</th>
                        <th className="text-left p-2">Compliance</th>
                        <th className="text-left p-2">Time Saved</th>
                        <th className="text-left p-2">Cost Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outputMetrics.map((metric) => (
                        <tr key={metric.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 capitalize">{metric.platform}</td>
                          <td className="p-2">{metric.generationDurationSeconds}s</td>
                          <td className="p-2">{metric.wordCount}</td>
                          <td className="p-2">{metric.qualityRating}/5</td>
                          <td className="p-2">
                            <Badge variant={metric.complianceCheck ? "default" : "destructive"}>
                              {metric.complianceCheck ? "✓" : "✗"}
                            </Badge>
                          </td>
                          <td className="p-2">{Math.round(metric.timeSavedSeconds / 60)}m</td>
                          <td className="p-2">${metric.costSaved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Metrics Available</h3>
            <p className="text-gray-500">
              Generate content in other modules to see performance metrics here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}