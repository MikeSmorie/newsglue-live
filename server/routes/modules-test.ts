import express from "express";
import { generateContent, generateBlogPost } from "../../modules/ContentGenerator/api";
import { analyzeData } from "../../modules/DataAnalyzer/api";
import { reviewCode } from "../../modules/CodeAssistant/api";

const router = express.Router();

// Test content generation with OmegaAIR
router.post("/content", async (req, res) => {
  try {
    const { prompt, type } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    let result;
    if (type === 'blog') {
      const { topic, style } = req.body;
      result = await generateBlogPost(topic || prompt, style);
    } else {
      const content = await generateContent(prompt);
      result = { success: true, content };
    }

    res.json({
      module: "ContentGenerator",
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: "Content generation failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Test data analysis with OmegaAIR
router.post("/analyze", async (req, res) => {
  try {
    const { dataDescription, analysisType } = req.body;

    if (!dataDescription) {
      return res.status(400).json({ error: "Data description is required" });
    }

    const result = await analyzeData(dataDescription, analysisType);

    res.json({
      module: "DataAnalyzer",
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: "Data analysis failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Test code review with OmegaAIR
router.post("/review", async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({ error: "Code and language are required" });
    }

    const result = await reviewCode(code, language);

    res.json({
      module: "CodeAssistant",
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: "Code review failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Test all modules with sample data
router.get("/test-all", async (req, res) => {
  try {
    const tests = [];

    // Test content generation
    try {
      const contentResult = await generateContent("Explain the benefits of microservices architecture");
      tests.push({
        module: "ContentGenerator",
        function: "generateContent",
        success: true,
        result: contentResult.substring(0, 100) + "..."
      });
    } catch (error) {
      tests.push({
        module: "ContentGenerator",
        function: "generateContent",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    // Test blog post generation
    try {
      const blogResult = await generateBlogPost("Artificial Intelligence in Healthcare", "technical");
      tests.push({
        module: "ContentGenerator",
        function: "generateBlogPost",
        success: blogResult.success,
        result: blogResult.success ? "Blog post generated successfully" : blogResult.error
      });
    } catch (error) {
      tests.push({
        module: "ContentGenerator",
        function: "generateBlogPost",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    // Test data analysis
    try {
      const analysisResult = await analyzeData("User engagement metrics: 75% retention, 3.2 avg session time", "trend");
      tests.push({
        module: "DataAnalyzer",
        function: "analyzeData",
        success: analysisResult.success,
        result: analysisResult.success ? "Analysis completed" : analysisResult.error
      });
    } catch (error) {
      tests.push({
        module: "DataAnalyzer",
        function: "analyzeData",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    // Test code review
    try {
      const reviewResult = await reviewCode(`
        function calculateTotal(items) {
          let total = 0;
          for (let i = 0; i < items.length; i++) {
            total += items[i].price;
          }
          return total;
        }
      `, "javascript");
      tests.push({
        module: "CodeAssistant",
        function: "reviewCode",
        success: reviewResult.success,
        result: reviewResult.success ? "Code review completed" : reviewResult.error
      });
    } catch (error) {
      tests.push({
        module: "CodeAssistant",
        function: "reviewCode",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    const successCount = tests.filter(t => t.success).length;
    
    res.json({
      summary: {
        totalTests: tests.length,
        passed: successCount,
        failed: tests.length - successCount,
        allModulesWorking: successCount === tests.length
      },
      tests,
      message: successCount === tests.length 
        ? "All modules successfully refactored to use OmegaAIR"
        : "Some modules need attention",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: "Module testing failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export { router as modulesTestRouter };