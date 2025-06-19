import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Copy, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [clientName, setClientName] = useState('');
  const [proposalData, setProposalData] = useState<ProposalData | null>(null);
  const [activeTab, setActiveTab] = useState('form');
  const { toast } = useToast();

  // Fetch campaigns
  const { data: campaigns = [] } = useQuery({
    queryKey: ['/api/campaigns'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch campaigns');
      return res.json();
    }
  });

  // Generate proposal mutation
  const generateProposalMutation = useMutation({
    mutationFn: async ({ campaignId, clientName }: { campaignId: string; clientName: string }) => {
      const response = await fetch('/api/proposal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ campaignId, clientName })
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
    if (!proposalData || !selectedCampaign) return;
    
    try {
      const response = await fetch(`/api/proposal/download/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          clientName: proposalData.clientName
        })
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${proposalData.clientName.replace(/\s+/g, '-')}-proposal-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Complete",
        description: `Proposal downloaded as ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download proposal. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCopyRichText = () => {
    if (!proposalData) return;
    
    // Convert HTML to plain text for clipboard
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = proposalData.html;
    const richText = tempDiv.textContent || tempDiv.innerText || '';
    
    navigator.clipboard.writeText(richText).then(() => {
      toast({
        title: "Copied to Clipboard",
        description: "Rich text proposal copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard.",
        variant: "destructive"
      });
    });
  };

  const handleGenerate = () => {
    if (!selectedCampaign || !clientName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a campaign and enter a client name.",
        variant: "destructive"
      });
      return;
    }
    
    generateProposalMutation.mutate({
      campaignId: selectedCampaign.id,
      clientName: clientName.trim()
    });
  };

  const currentDate = new Date().toLocaleDateString();
  const validUntilDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            7 Proposal Builder
          </CardTitle>
          <CardDescription>
            Generate professional strategic proposals for rapid client acquisition using live campaign data and newsjack outputs.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="form">Generate Proposal</TabsTrigger>
              <TabsTrigger value="preview" disabled={!proposalData}>Preview & Download</TabsTrigger>
            </TabsList>
            
            <TabsContent value="form" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaign">Select Campaign</Label>
                  <Select 
                    value={selectedCampaign?.id || ''} 
                    onValueChange={(value) => {
                      const campaign = campaigns.find((c: Campaign) => c.id === value);
                      setSelectedCampaign(campaign || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a campaign to base the proposal on" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign: Campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.campaignName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Enter client/company name"
                    className="mt-1"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Proposal Date</Label>
                    <Input value={currentDate} disabled className="mt-1" />
                  </div>
                  <div>
                    <Label>Valid Until</Label>
                    <Input value={validUntilDate} disabled className="mt-1" />
                  </div>
                </div>
                
                {selectedCampaign && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-medium mb-2">Campaign Summary</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Campaign:</strong> {selectedCampaign.campaignName}</p>
                      {selectedCampaign.websiteUrl && (
                        <p><strong>Website:</strong> {selectedCampaign.websiteUrl}</p>
                      )}
                      {selectedCampaign.emotionalObjective && (
                        <p><strong>Objective:</strong> {selectedCampaign.emotionalObjective}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <Button 
                  onClick={handleGenerate}
                  disabled={generateProposalMutation.isPending || !selectedCampaign || !clientName.trim()}
                  className="w-full"
                  size="lg"
                >
                  {generateProposalMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Proposal...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Proposal
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="space-y-6">
              {proposalData && (
                <>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => handleDownload('pdf')} variant="default">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button onClick={() => handleDownload('html')} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download HTML
                    </Button>
                    <Button onClick={() => handleDownload('docx')} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Download Word
                    </Button>
                    <Button onClick={handleCopyRichText} variant="outline">
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Rich Text
                    </Button>
                  </div>
                  
                  <div className="border rounded-lg bg-white dark:bg-gray-900 p-6 max-h-96 overflow-y-auto">
                    <div 
                      className="proposal-preview"
                      dangerouslySetInnerHTML={{ __html: proposalData.html }}
                    />
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}