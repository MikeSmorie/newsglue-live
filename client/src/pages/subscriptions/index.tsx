import { useState } from "react";

const SubscriptionPage = () => {
  const [subscription, setSubscription] = useState("Free");

  const handleUpgrade = (plan) => {
    setSubscription(plan);
    alert(`Upgraded to ${plan} plan!`);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Manage Subscription</h1>
      <p>Current Plan: <strong>{subscription}</strong></p>
      <button onClick={() => handleUpgrade("Standard")} className="p-2 bg-blue-500 text-white rounded">Upgrade to Standard</button>
      <button onClick={() => handleUpgrade("Premium")} className="p-2 bg-green-500 text-white rounded ml-4">Upgrade to Premium</button>
    </div>
  );
};

export default SubscriptionPage;
