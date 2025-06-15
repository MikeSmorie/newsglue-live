import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, Zap, AlertTriangle, RefreshCw, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AnalyticsSummary {
  period: string;
  summary: {
    totalRewrites: number;
    totalTokens: number;
    avgTokensPerRewrite: number;
    uniqueUsers: number;
  };
  detectionDistribution: Array<{
    rating: string;
    count: number;
  }>;
}

interface TopUser {
  userId: number;
  username: string;
  email: string;
  rewriteCount: number;
  totalTokens: number;
  avgTokensPerRewrite: number;
}

interface DetectionStats {
  period: string;
  detectionBreakdown: Array<{
    rating: string;
    count: number;
    avgTokens: number;
  }>;
  dailyStats: Array<{
    date: string;
    count: number;
    totalTokens: number;
  }>;
  effectiveness: {
    humanizationRate: number;
    totalProcessed: number;
  };
}

interface UserActivity {
  userId: number;
  activities: Array<{
    id: string;
    originalText: string;
    wordCount: number;
    tone: string;
    dialect: string;
    styleLabel: string;
    tokensUsed: number;
    detectionRating: string;
    createdAt: string;
  }>;
}

export default function AdminAnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('7');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  // Analytics summary query
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics-summary', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/summary?period=${selectedPeriod}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics summary');
      }
      return response.json();
    }
  });

  // Top users query
  const { data: topUsersData, isLoading: topUsersLoading } = useQuery<{ topUsers: TopUser[] }>({
    queryKey: ['analytics-top-users', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/top-users?period=${selectedPeriod}&limit=10`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch top users');
      }
      return response.json();
    }
  });

  // Detection stats query
  const { data: detectionStats, isLoading: detectionLoading } = useQuery<DetectionStats>({
    queryKey: ['analytics-detection', selectedPeriod],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/detection-stats?period=${selectedPeriod}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch detection stats');
      }
      return response.json();
    }
  });

  // User activity query (only when user is selected)
  const { data: userActivity, isLoading: activityLoading } = useQuery<UserActivity>({
    queryKey: ['analytics-user-activity', selectedUserId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics/user-activity?userId=${selectedUserId}&limit=20`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch user activity');
      }
      return response.json();
    },
    enabled: !!selectedUserId
  });

  const getDetectionBadge = (rating: string) => {
    const variants = {
      'Human': 'default',
      'Likely Human': 'secondary',
      'Likely AI': 'destructive',
      'Detectable': 'destructive'
    } as const;
    
    return <Badge variant={variants[rating as keyof typeof variants] || 'outline'}>{rating}</Badge>;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (summaryLoading) {
    return <div className="p-6">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into AI output and humanization effectiveness
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Day</SelectItem>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetchSummary()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewrites</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary?.summary.totalRewrites || 0)}</div>
            <p className="text-xs text-muted-foreground">
              in the last {summary?.period || '7 days'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tokens Used</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary?.summary.totalTokens || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.summary.avgTokensPerRewrite || 0} avg per rewrite
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(summary?.summary.uniqueUsers || 0)}</div>
            <p className="text-xs text-muted-foreground">
              unique users active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Humanization Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {detectionStats?.effectiveness.humanizationRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              content rated as human-like
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="top-users">Top Users</TabsTrigger>
          <TabsTrigger value="detection">Detection Analysis</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Detection Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Detection Rating Distribution</CardTitle>
                <CardDescription>
                  How AI outputs are being classified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary?.detectionDistribution.map((item) => (
                    <div key={item.rating} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getDetectionBadge(item.rating || 'Unknown')}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatNumber(item.count)}</div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round((item.count / (summary?.summary.totalRewrites || 1)) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity Trend</CardTitle>
                <CardDescription>
                  Recent activity breakdown by day
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detectionLoading ? (
                  <div className="text-center py-8">Loading daily stats...</div>
                ) : (
                  <div className="space-y-3">
                    {detectionStats?.dailyStats.slice(-7).map((day) => (
                      <div key={day.date} className="flex items-center justify-between">
                        <div className="text-sm">{day.date}</div>
                        <div className="text-right">
                          <div className="font-medium">{formatNumber(day.count)} rewrites</div>
                          <div className="text-xs text-muted-foreground">
                            {formatNumber(day.totalTokens)} tokens
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="top-users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Users by Volume</CardTitle>
              <CardDescription>
                Users generating the most AI content in the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topUsersLoading ? (
                <div className="text-center py-8">Loading top users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Rewrites</TableHead>
                      <TableHead>Total Tokens</TableHead>
                      <TableHead>Avg Tokens</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topUsersData?.topUsers.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{user.username}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(user.rewriteCount)}</TableCell>
                        <TableCell>{formatNumber(user.totalTokens)}</TableCell>
                        <TableCell>{user.avgTokensPerRewrite}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUserId(user.userId.toString())}
                          >
                            View Activity
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detection Effectiveness Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of AI detection ratings and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detectionLoading ? (
                <div className="text-center py-8">Loading detection stats...</div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {detectionStats?.effectiveness.humanizationRate}%
                      </div>
                      <div className="text-sm text-muted-foreground">Humanization Success</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {formatNumber(detectionStats?.effectiveness.totalProcessed || 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Processed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {Math.round((detectionStats?.detectionBreakdown.reduce((sum, item) => sum + item.avgTokens, 0) || 0) / (detectionStats?.detectionBreakdown.length || 1))}
                      </div>
                      <div className="text-sm text-muted-foreground">Avg Tokens/Output</div>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Detection Rating</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Avg Tokens</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detectionStats?.detectionBreakdown.map((item) => (
                        <TableRow key={item.rating}>
                          <TableCell>{getDetectionBadge(item.rating || 'Unknown')}</TableCell>
                          <TableCell>{formatNumber(item.count)}</TableCell>
                          <TableCell>
                            {Math.round((item.count / (detectionStats?.effectiveness.totalProcessed || 1)) * 100)}%
                          </TableCell>
                          <TableCell>{item.avgTokens}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Timeline</CardTitle>
              <CardDescription>
                Detailed activity log for a specific user
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a user to view activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {topUsersData?.topUsers.map((user) => (
                      <SelectItem key={user.userId} value={user.userId.toString()}>
                        {user.username} ({user.rewriteCount} rewrites)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUserId && (
                <>
                  {activityLoading ? (
                    <div className="text-center py-8">Loading user activity...</div>
                  ) : (
                    <div className="space-y-4">
                      {userActivity?.activities.map((activity) => (
                        <div key={activity.id} className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {getDetectionBadge(activity.detectionRating || 'Unknown')}
                              <span className="text-sm text-muted-foreground">
                                {activity.wordCount} words
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {activity.tokensUsed} tokens
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </div>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Original:</span> {activity.originalText}...
                          </div>
                          {(activity.tone || activity.dialect || activity.styleLabel) && (
                            <div className="flex items-center space-x-2 text-xs">
                              {activity.tone && <Badge variant="outline">{activity.tone}</Badge>}
                              {activity.dialect && <Badge variant="outline">{activity.dialect}</Badge>}
                              {activity.styleLabel && <Badge variant="outline">{activity.styleLabel}</Badge>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}