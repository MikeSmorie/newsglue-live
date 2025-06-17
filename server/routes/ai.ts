import express from "express";
import { sendAIRequest, isAnyProviderAvailable } from "../../lib/ai/router";
import { db } from "@db";
import { activityLogs } from "@db/schema";
import { validateJsonInput, validateRequiredProps } from "../utils/validation";

const router = express.Router();

// Handle module suggestions
router.post("/suggest-modules", async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    // Check if any AI provider is available
    if (!(await isAnyProviderAvailable())) {
      return res.status(503).json({ error: "AI services are currently unavailable" });
    }

    const prompt = `Suggest a module workflow for app: ${description}. Return as JSON with names and purposes.`;
    
    const suggestions = await sendAIRequest(prompt, {
      temperature: 0.7,
      maxTokens: 100
    });

    console.log("[DEBUG] AI Suggestions:", suggestions);

    // Log activity
    await db.insert(activityLogs).values({
      action: "ai_module_suggestion",
      userId: req.user?.id || 0,
      details: description,
      timestamp: new Date()
    });

    try {
      // Try to parse as JSON, fallback to plain text if it fails
      const parsedSuggestions = JSON.parse(suggestions);
      res.json(parsedSuggestions);
    } catch (parseError) {
      // If response isn't valid JSON, return it as a text response
      res.json({ 
        suggestions: suggestions,
        note: "Response was not in JSON format"
      });
    }
  } catch (error) {
    console.error("[ERROR] AI suggestion failed:", error);
    res.status(500).json({ error: "AI suggestion failed" });
  }
});

// AI Assistant API endpoint with improved input validation
router.post("/ai-assistant", async (req, res) => {
  console.log("[DEBUG] AI Assistant request received:", req.body);
  
  try {
    // Handle direct query from request body (new approach)
    if (req.body.query !== undefined) {
      const userQuery = req.body.query;
      
      if (!userQuery || userQuery.trim() === "") {
        return res.status(400).json({ message: 'Query cannot be empty' });
      }
      
      console.log("[INFO] Processing direct query:", userQuery);
      
      // Get user ID from request or use default
      const userId = req.user?.id || 0;
      
      // Process the query and provide a response
      const aiResponse = await processAIRequest({
        query: userQuery,
        userId,
        type: req.user?.role || 'user'
      });
      
      if (!aiResponse) {
        return res.status(500).json({ message: 'Error processing your query' });
      }
      
      // Log the AI assistant usage
      await db.insert(activityLogs).values({
        action: "ai_assistant_query",
        userId,
        details: userQuery,
        timestamp: new Date()
      });
      
      return res.json(aiResponse);
    }
    
    // Handle JSON string in input field (backward compatibility)
    const inputData = req.body.input;
    console.log("[DEBUG] Input data:", inputData, typeof inputData);
    
    if (typeof inputData !== 'string') {
      console.log("[DEBUG] Invalid input type:", typeof inputData);
      return res.status(400).json({ message: 'Input must be a JSON string' });
    }
    
    // Validate and parse the input
    const validatedData = validateJsonInput(inputData);
    if (!validatedData) {
      return res.status(400).json({ message: 'Invalid input format' });
    }
    
    // Check for required properties
    const requiredProps = ['query', 'userId'];
    if (!validateRequiredProps(validatedData, requiredProps)) {
      return res.status(400).json({ 
        message: 'Missing required properties',
        requiredProps
      });
    }

    // Process the validated input
    const response = await processAIRequest(validatedData);
    
    // Log the AI assistant usage
    await db.insert(activityLogs).values({
      action: "ai_assistant_query",
      userId: validatedData.userId || 0,
      details: validatedData.query,
      timestamp: new Date()
    });
    
    res.json(response);
  } catch (error) {
    console.error("[ERROR] AI assistant request failed:", error);
    res.status(500).json({ error: "AI processing failed" });
  }
});

// Process the AI request with improved response logic
async function processAIRequest(data: any) {
  try {
    // Log request information
    console.log("[INFO] Processing AI request:", data);
    
    const userQuery = data.query.toLowerCase();
    let answer;

    // Provide clear, helpful responses based on the user's query
    if (userQuery.includes('what is this system') || 
        userQuery.includes('what does this system do') || 
        userQuery.includes('about this system')) {
      answer = `
NewsGlue is an AI-powered social media marketing tool that automates the process of newsjacking. 
By integrating the latest news and trending topics, NewsGlue generates relevant, high-quality content 
faster than traditional methods—up to 30x quicker—while also ensuring accuracy and human-like engagement.
Our system allows businesses to leverage the power of automation, saving valuable time and improving productivity.
With built-in performance metrics and real-time reporting, you can track the efficiency and effectiveness of each newsjacked post.`;
    } 
    else if (userQuery.includes('feature') || userQuery.includes('can it do')) {
      answer = `
NewsGlue offers several powerful features:
1. Automated content generation based on trending topics
2. AI-powered writing that matches your brand voice
3. Real-time performance metrics and analytics
4. Integration with major social media platforms
5. Customizable content templates for different industries
6. Schedule and publish posts directly from the platform`;
    }
    else if (userQuery.includes('pricing') || userQuery.includes('subscription') || userQuery.includes('cost')) {
      answer = `
We offer flexible pricing plans designed to meet your needs:
- Basic: $29/month - Up to 25 posts per month
- Pro: $79/month - Up to 100 posts per month with advanced analytics
- Enterprise: Custom pricing for unlimited usage and dedicated support

All plans include a 14-day free trial to get started.`;
    }
    else {
      // Default response for queries we don't specifically handle
      answer = `I'm sorry, I couldn't find specific information about "${data.query}". Would you like to know about our features, pricing, or something else?`;
    }
    
    return {
      success: true,
      answer,
      timestamp: new Date().toISOString(),
      suggestions: [
        "Tell me about NewsGlue features",
        "What are the pricing options?",
        "How does the system work?"
      ]
    };
  } catch (error) {
    console.error("[ERROR] AI processing error:", error);
    throw error;
  }
}

export default router;