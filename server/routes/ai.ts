import express from "express";
import axios from "axios";
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

    const response = await axios.post("https://api.openai.com/v1/chat/completions", {
      model: "gpt-3.5-turbo",
      messages: [{ 
        role: "user", 
        content: `Suggest a module workflow for app: ${description}. Return as JSON with names and purposes.` 
      }],
      max_tokens: 100,
    }, {
      headers: { 
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const suggestions = response.data.choices[0].message.content;
    console.log("[DEBUG] AI Suggestions:", suggestions);

    // Log activity
    await db.insert(activityLogs).values({
      action: "ai_module_suggestion",
      userId: req.user?.id || 0,
      details: description,
      timestamp: new Date()
    });

    res.json(JSON.parse(suggestions));
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

// Process the AI request (mock implementation)
async function processAIRequest(data: any) {
  try {
    // Here we would process the request with your AI service
    // This is a placeholder implementation
    console.log("[INFO] Processing AI request:", data);
    
    return {
      success: true,
      answer: `Response to query: ${data.query}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error("[ERROR] AI processing error:", error);
    throw error;
  }
}

export default router;