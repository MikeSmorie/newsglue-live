export interface IPaymentGateway {
  initialize(): Promise<void>;
  processPayment(amount: number, userId: string): Promise<{ success: boolean; transactionId?: string }>;
  refund(transactionId: string): Promise<{ success: boolean }>;
  getStatus(transactionId: string): Promise<string>;
}

export class MockPaymentGateway implements IPaymentGateway {
  async initialize() {
    console.log("[DEBUG] Mock Payment Gateway Initialized");
  }

  async processPayment(amount: number, userId: string) {
    console.log(`[DEBUG] Processing $${amount} for user ${userId}`);
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, transactionId: `mock_${Date.now()}` };
  }

  async refund(transactionId: string) {
    console.log(`[DEBUG] Refunding ${transactionId}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true };
  }

  async getStatus(transactionId: string) {
    console.log(`[DEBUG] Status check for ${transactionId}`);
    return "completed";
  }
}
