import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet"; // Security headers
import cors from "cors"; // Cross-origin protection
import rateLimit from "express-rate-limit"; // Rate limiting
import hpp from "hpp"; // HTTP parameter pollution prevention
import csrf from "csurf"; // CSRF protection

const app = express();

// Security middleware
app.use(helmet()); // Secure HTTP headers
app.use(cors()); // Enable CORS
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate limiting for API endpoints
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api", limiter);

// CSRF Protection Middleware (disabled for now if API needs JSON handling)
const csrfProtection = csrf({ cookie: false }); // Consider enabling cookies for stronger protection
// app.use(csrfProtection); // Enable when frontend can send CSRF tokens

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Capture JSON responses for logging
  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  // Log API requests on completion
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register all API routes and create HTTP server
  const server = registerRoutes(app);

  // Global error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup development/production server
  if (app.get("env") === "development") {
    await setupVite(app, server); // Development: Vite dev server
  } else {
    serveStatic(app); // Production: Static file serving
  }

  // Start server on port 5000
  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();
