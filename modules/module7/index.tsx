import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Copy, Loader2, Users } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useCampaign } from '@/contexts/campaign-context';

interface Campaign {
  id: string;
  campaignName: string;
  websiteUrl?: string;
  ctaUrl?: string;
  emotionalObjective?: string;
  audiencePain?: string;
  socialSettings?: any;
}

interface ProposalData {
  html: string;
  clientName: string;
  proposalDate: string;
  validUntil: string;
  campaignData: Campaign;
}

export default function Module7() {
  const [clientName, setClientName] = useState('');
  const [proposalData, setProposalData] = useState<ProposalData | null>(null);
  const [activeTab, setActiveTab] = useState('form');
  const { toast } = useToast();
  const { selectedCampaignId, selectedCampaign } = useCampaign();

  // Generate proposal mutation
  const generateProposalMutation = useMutation({
    mutationFn: async (clientName: string) => {
      if (!selectedCampaignId) {
        throw new Error('No active campaign available');
      }
      
      const response = await fetch('/api/proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaignId: selectedCampaignId, clientName })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate proposal');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProposalData(data);
      setActiveTab('preview');
      toast({
        title: "Proposal Generated",
        description: "Professional strategic proposal has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Download handlers
  const handleDownload = async (format: 'pdf' | 'html' | 'docx') => {
    if (!proposalData || !selectedCampaignId) return;
    
    try {
      const response = await fetch(`/api/proposal/download/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          campaignId: selectedCampaignId,
          clientName: proposalData.clientName
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to download ${format.toUpperCase()}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `proposal-${proposalData.clientName}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: `${format.toUpperCase()} proposal is downloading.`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: `Failed to download ${format.toUpperCase()} proposal.`,
        variant: "destructive"
      });
    }
  };

  const handleCopyProposal = () => {
    if (proposalData?.html) {
      navigator.clipboard.writeText(proposalData.html);
      toast({
        title: "Copied",
        description: "Proposal HTML copied to clipboard.",
      });
    }
  };

  const handleGenerateProposal = () => {
    if (!selectedCampaignId || !clientName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter client name and ensure a campaign is available.",
        variant: "destructive"
      });
      return;
    }

    generateProposalMutation.mutate(clientName.trim());
  };

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Module 7: Proposal Builder
          </h1>
          <p className="text-foreground mt-2">
            Generate professional NewsJack proposals for rapid client acquisition
          </p>
          {selectedCampaign && (
            <p className="text-sm text-foreground mt-1">
              Active Campaign: <span className="font-medium">{selectedCampaign.campaignName}</span>
            </p>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form">Create Proposal</TabsTrigger>
          <TabsTrigger value="preview" disabled={!proposalData}>
            Preview & Download
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Proposal Configuration</CardTitle>
              <CardDescription>
                Configure your strategic NewsJack proposal for client presentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedCampaignId ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Campaign Available
                  </h3>
                  <p className="text-foreground mb-4">
                    Create a campaign in Module 1 to generate proposals.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="client-name">Client Name *</Label>
                      <Input
                        id="client-name"
                        placeholder="Enter client or company name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Proposal Will Include:
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <li>• NewsJack methodology overview and case studies</li>
                      <li>• Campaign-specific strategy and emotional positioning</li>
                      <li>• Platform-specific content examples and CTAs</li>
                      <li>• Performance metrics and efficiency demonstrations</li>
                      <li>• Professional pricing and timeline structure</li>
                    </ul>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleGenerateProposal}
                      disabled={!clientName.trim() || generateProposalMutation.isPending}
                      className="min-w-[160px]"
                    >
                      {generateProposalMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="mr-2 h-4 w-4" />
                          Generate Proposal
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {proposalData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Preview</CardTitle>
                  <CardDescription>
                    Professional NewsJack proposal for {proposalData.clientName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3 mb-6">
                    <Button 
                      onClick={() => handleDownload('pdf')}
                      className="min-w-[120px]"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button 
                      onClick={() => handleDownload('docx')}
                      variant="outline"
                      className="min-w-[120px]"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download DOCX
                    </Button>
                    <Button 
                      onClick={handleCopyProposal}
                      variant="outline"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy HTML
                    </Button>
                  </div>

                  <div 
                    className="prose max-w-none border rounded-lg p-6 bg-white shadow-sm"
                    dangerouslySetInnerHTML={{ __html: proposalData.html }}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}