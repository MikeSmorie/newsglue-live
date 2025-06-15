import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type SelectUser } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

export function setupSimpleAuth(app: Express) {
  console.log("[DEBUG] Setting up simple authentication system");
  
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "omega-8-clean-core",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));

  // Simple login endpoint
  app.post("/api/login", async (req, res) => {
    console.log("[DEBUG] Login attempt received");
    
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        console.log("[DEBUG] Invalid login input");
        return res.status(400).json({
          message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        });
      }

      const { username, password } = result.data;
      console.log(`[DEBUG] Attempting login for user: ${username}`);

      // Find user in database
      const userResults = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!userResults || userResults.length === 0) {
        console.log("[DEBUG] User not found");
        return res.status(400).json({
          message: "Invalid username or password"
        });
      }

      const user = userResults[0];

      // Verify password
      const isMatch = await crypto.compare(password, user.password);
      if (!isMatch) {
        console.log("[DEBUG] Password mismatch");
        return res.status(400).json({
          message: "Invalid username or password"
        });
      }

      // Update last login timestamp
      await db
        .update(users)
        .set({ lastLogin: new Date() })
        .where(eq(users.id, user.id));

      // Store user in session
      (req.session as any).user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      console.log(`[DEBUG] Login successful for user: ${username} with role: ${user.role}`);

      return res.json({
        message: "Login successful",
        user: { id: user.id, username: user.username, role: user.role },
      });
    } catch (error: any) {
      console.error("[DEBUG] Login error:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error.message
      });
    }
  });

  // Simple register endpoint
  app.post("/api/register", async (req, res) => {
    console.log("[DEBUG] Registration attempt received");
    
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        console.log("[DEBUG] Invalid registration input");
        return res.status(400).json({
          message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        });
      }

      const { username, password } = result.data;
      console.log(`[DEBUG] Attempting registration for user: ${username}`);

      // Check if user already exists
      const existingUserResults = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUserResults && existingUserResults.length > 0) {
        console.log("[DEBUG] Username already exists");
        return res.status(400).json({
          message: "Username already exists"
        });
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const newUserResults = await db
        .insert(users)
        .values({
          username: username,
          password: hashedPassword,
          role: "user",
          lastLogin: new Date()
        })
        .returning();

      if (!newUserResults || newUserResults.length === 0) {
        throw new Error("Failed to create user");
      }

      const newUser = newUserResults[0];

      // Store user in session
      (req.session as any).user = {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      };

      console.log(`[DEBUG] Registration successful for user: ${username}`);

      return res.json({
        message: "Registration successful",
        user: { id: newUser.id, username: newUser.username, role: newUser.role },
      });
    } catch (error: any) {
      console.error("[DEBUG] Registration error:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error.message
      });
    }
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    const sessionUser = (req.session as any).user;
    
    if (!sessionUser) {
      console.log("[DEBUG] No authenticated user in session");
      return res.status(401).json({ message: "Not logged in" });
    }

    console.log(`[DEBUG] Current user: ${sessionUser.username} with role: ${sessionUser.role}`);
    return res.json(sessionUser);
  });

  // Simple logout endpoint
  app.post("/api/logout", (req, res) => {
    console.log("[DEBUG] Logout attempt");
    
    const sessionUser = (req.session as any).user;
    if (sessionUser) {
      console.log(`[DEBUG] Logging out user: ${sessionUser.username}`);
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error("[DEBUG] Logout error:", err);
        return res.status(500).json({
          message: "Logout failed",
          error: err.message
        });
      }
      
      console.log("[DEBUG] Logout successful");
      res.json({ message: "Logout successful" });
    });
  });

  console.log("[DEBUG] Simple authentication system setup complete");
}