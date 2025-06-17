import express from "express";
import { sendAIRequest, isAnyProviderAvailable, getBestModel } from "../../lib/ai/router";

const router = express.Router();

// Authentication middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Not authenticated" });
};

// GPT Support Agent endpoint - requires authentication
router.post("/chat", requireAuth, async (req, res) => {
  try {
    const { message, context } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Check if AI services are available
    if (!(await isAnyProviderAvailable())) {
      return res.status(503).json({ 
        error: "Support assistant is temporarily unavailable",
        fallback: "Please try again in a moment or contact our support team directly."
      });
    }

    // Create comprehensive system prompt based on user role
    const systemPrompt = `You are the Omega-V9 Support Assistant, providing helpful guidance for platform users.

Platform Overview:
- Omega-V9 with OmegaAIR multiplexer system
- Features: Dashboard, 10 modules, AI assistance, subscription management
- User roles: user (basic), admin (management), supergod (full access)
- Tech stack: React frontend, Express backend, PostgreSQL database

Current User Context:
- Username: ${user.username}
- Role: ${user.role}
- Access Level: ${user.role === 'supergod' ? 'Full system administration including AI provider configuration' : user.role === 'admin' ? 'Administrative functions and user management' : 'Standard platform features'}

Support Guidelines:
- Be helpful, professional, and concise
- Provide step-by-step instructions when appropriate
- Focus on practical platform guidance
- For technical issues, suggest contacting administrators if needed
${user.role === 'supergod' ? '- Include advanced system administration topics as relevant' : ''}
${user.role === 'admin' ? '- Cover user management and monitoring capabilities' : ''}

User Question: ${message}`;

    const bestProvider = await getBestModel();
    const response = await sendAIRequest(message, {
      temperature: 0.7,
      maxTokens: 600,
      systemPrompt: systemPrompt
    });

    res.json({
      response,
      provider: bestProvider,
      timestamp: new Date().toISOString(),
      context: {
        userRole: user.role,
        platformVersion: "Omega-V9"
      }
    });

  } catch (error) {
    console.error("Support agent error:", error);
    res.status(500).json({
      error: "Support assistant encountered an error",
      fallback: "Please try again or contact support if the issue persists."
    });
  }
});

// Get support agent status
router.get("/status", requireAuth, async (req, res) => {
  try {
    const [available, bestProvider, user] = await Promise.all([
      isAnyProviderAvailable(),
      getBestModel().catch(() => null),
      Promise.resolve(req.user)
    ]);

    res.json({
      available,
      bestProvider,
      userRole: user?.role,
      features: {
        basicSupport: true,
        roleSpecificGuidance: user?.role === 'admin' || user?.role === 'supergod',
        systemAdministration: user?.role === 'supergod'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Support status error:", error);
    res.status(500).json({ error: "Failed to get support status" });
  }
});

export { router as supportAgentRouter };