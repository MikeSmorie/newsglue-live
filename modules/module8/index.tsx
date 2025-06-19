import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Clock, DollarSign, Target, Download, Copy, FileText, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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
  'blog': '#8884d8',
  'twitter': '#82ca9d',
  'linkedin': '#ffc658',
  'facebook': '#ff7300',
  'instagram': '#8dd1e1',
  'youtube': '#d084d0'
};

export default function Module8() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [hourlyRate, setHourlyRate] = useState<string>("40.00");

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
    queryFn: async () => {
      const response = await fetch('/api/campaigns');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json();
    }
  });

  // Fetch campaign metrics
  const { data: campaignMetrics, isLoading: metricsLoading } = useQuery<CampaignMetrics>({
    queryKey: ['/api/metrics/campaign', selectedCampaign],
    queryFn: async () => {
      const response = await fetch(`/api/metrics/campaign/${selectedCampaign}`);
      if (!response.ok) throw new Error('Failed to fetch campaign metrics');
      return response.json();
    },
    enabled: !!selectedCampaign
  });

  // Fetch output metrics
  const { data: outputMetrics = [], isLoading: outputLoading } = useQuery<OutputMetrics[]>({
    queryKey: ['/api/metrics/outputs', selectedCampaign],
    queryFn: async () => {
      const response = await fetch(`/api/metrics/outputs/${selectedCampaign}`);
      if (!response.ok) throw new Error('Failed to fetch output metrics');
      return response.json();
    },
    enabled: !!selectedCampaign
  });

  // Update hourly rate mutation
  const updateHourlyRateMutation = useMutation({
    mutationFn: async ({ campaignId, rate }: { campaignId: string; rate: string }) => {
      const response = await fetch(`/api/metrics/campaign/${campaignId}/rate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hourlyRate: rate })
      });
      if (!response.ok) throw new Error('Failed to update hourly rate');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/campaign', selectedCampaign] });
      toast({ title: "Hourly rate updated successfully" });
    }
  });

  // Export metrics mutation
  const exportMetricsMutation = useMutation({
    mutationFn: async ({ campaignId, format }: { campaignId: string; format: 'pdf' | 'csv' }) => {
      const response = await fetch(`/api/metrics/export/${campaignId}/${format}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to export metrics');
      return response.blob();
    },
    onSuccess: (blob, variables) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `metrics-${selectedCampaign}.${variables.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: `Metrics exported as ${variables.format.toUpperCase()}` });
    }
  });

  // Generate sample metrics mutation
  const generateSampleMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const response = await fetch(`/api/metrics/generate-sample/${campaignId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to generate sample metrics');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/campaign', selectedCampaign] });
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/outputs', selectedCampaign] });
      toast({ title: "Sample metrics generated successfully" });
    }
  });

  const handleUpdateRate = () => {
    if (selectedCampaign && hourlyRate) {
      updateHourlyRateMutation.mutate({ campaignId: selectedCampaign, rate: hourlyRate });
    }
  };

  const handleExport = (format: 'pdf' | 'csv') => {
    if (selectedCampaign) {
      exportMetricsMutation.mutate({ campaignId: selectedCampaign, format });
    }
  };

  const handleGenerateSample = () => {
    if (selectedCampaign) {
      generateSampleMutation.mutate(selectedCampaign);
    }
  };

  const copyMetricsSummary = () => {
    if (!campaignMetrics) return;
    
    const summary = `
Campaign Metrics Summary:
• Total Outputs: ${campaignMetrics.totalOutputs}
• Time Saved: ${Math.round(campaignMetrics.totalTimeSavedSeconds / 60)} minutes
• Cost Saved: $${campaignMetrics.totalCostSaved}
• Compliance Score: ${campaignMetrics.complianceScore}%
• CTA Presence Rate: ${campaignMetrics.ctaPresenceRate}%
• Efficiency Score: ${campaignMetrics.efficiencyScore}%
    `.trim();
    
    navigator.clipboard.writeText(summary);
    toast({ title: "Metrics summary copied to clipboard" });
  };

  // Prepare chart data
  const timeComparisonData = outputMetrics.length > 0 ? [
    {
      name: 'NewsGlue AI',
      time: Math.round(outputMetrics.reduce((acc, item) => acc + item.generationDurationSeconds, 0) / outputMetrics.length / 60)
    },
    {
      name: 'Human Only',
      time: Math.round(outputMetrics.reduce((acc, item) => acc + item.estimatedHumanTimeMinutes, 0) / outputMetrics.length)
    },
    {
      name: 'Human + AI',
      time: campaignMetrics?.humanAiEstimateMinutes || 15
    }
  ] : [];

  const platformData = outputMetrics.reduce((acc, item) => {
    const existing = acc.find(p => p.name === item.platform);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: item.platform, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            Module 8: Metrics Engine
          </h1>
          <p className="text-gray-600 mt-2">Track campaign performance and efficiency metrics</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-select">Select Campaign</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger id="campaign-select">
                  <SelectValue placeholder="Choose a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="hourly-rate">Hourly Rate ($)</Label>
              <div className="flex gap-2">
                <Input
                  id="hourly-rate"
                  type="number"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="40.00"
                />
                <Button 
                  onClick={handleUpdateRate}
                  disabled={!selectedCampaign || updateHourlyRateMutation.isPending}
                  size="sm"
                >
                  Update
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Export Options</Label>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  disabled={!selectedCampaign || exportMetricsMutation.isPending}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExport('csv')}
                  disabled={!selectedCampaign || exportMetricsMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyMetricsSummary}
                  disabled={!campaignMetrics}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedCampaign ? (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Select a campaign to view metrics</p>
          </CardContent>
        </Card>
      ) : metricsLoading || outputLoading ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading metrics...</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Outputs</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignMetrics?.totalOutputs || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across all platforms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((campaignMetrics?.totalTimeSavedSeconds || 0) / 60)} min
                </div>
                <p className="text-xs text-muted-foreground">
                  Total time efficiency
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cost Saved</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${campaignMetrics?.totalCostSaved || "0.00"}</div>
                <p className="text-xs text-muted-foreground">
                  At ${hourlyRate}/hour
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efficiency Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaignMetrics?.efficiencyScore || "0"}%</div>
                <p className="text-xs text-muted-foreground">
                  Overall campaign rating
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Generation Time Comparison</CardTitle>
                <CardDescription>Average time per output (minutes)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="time" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Platform Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Output Platform Breakdown</CardTitle>
                <CardDescription>Content distribution by platform</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {platformData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={PLATFORM_COLORS[entry.name as keyof typeof PLATFORM_COLORS] || '#8884d8'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Compliance & Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Quality & Compliance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {campaignMetrics?.complianceScore || "0"}%
                  </div>
                  <p className="text-sm text-gray-600">Compliance Score</p>
                  <p className="text-xs text-gray-500">Word/character limits met</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {campaignMetrics?.ctaPresenceRate || "0"}%
                  </div>
                  <p className="text-sm text-gray-600">CTA Presence Rate</p>
                  <p className="text-xs text-gray-500">Outputs with call-to-action</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {outputMetrics.filter(m => m.urlPresent).length}
                  </div>
                  <p className="text-sm text-gray-600">URLs Included</p>
                  <p className="text-xs text-gray-500">Outputs with source links</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Output Details Table */}
          {outputMetrics.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Output Details</CardTitle>
                <CardDescription>Individual output performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Platform</th>
                        <th className="text-left p-2">Generation Time</th>
                        <th className="text-left p-2">Word Count</th>
                        <th className="text-left p-2">Time Saved</th>
                        <th className="text-left p-2">Cost Saved</th>
                        <th className="text-left p-2">Quality</th>
                        <th className="text-left p-2">Compliance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {outputMetrics.slice(0, 10).map((output, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">
                            <Badge variant="outline">{output.platform}</Badge>
                          </td>
                          <td className="p-2">{output.generationDurationSeconds}s</td>
                          <td className="p-2">{output.wordCount}</td>
                          <td className="p-2">{Math.round(output.timeSavedSeconds / 60)}m</td>
                          <td className="p-2">${output.costSaved}</td>
                          <td className="p-2">
                            {output.qualityRating ? `${output.qualityRating}/5` : "N/A"}
                          </td>
                          <td className="p-2">
                            <Badge variant={output.complianceCheck ? "default" : "destructive"}>
                              {output.complianceCheck ? "✓" : "✗"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {outputMetrics.length > 10 && (
                    <p className="text-center text-gray-500 mt-4">
                      Showing 10 of {outputMetrics.length} outputs
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}