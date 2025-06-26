import CampaignForm from '@/components/CampaignForm';

export default function CampaignPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-white">Campaign Builder</h1>
      <p className="text-sm text-gray-400">
        Create and manage your marketing campaigns with targeted messaging and goals.
      </p>
      <CampaignForm />
    </div>
  );
}