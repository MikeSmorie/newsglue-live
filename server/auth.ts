import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users, type SelectUser } from "@db/schema";
import { z } from "zod";
import { db } from "@db";
import { eq } from "drizzle-orm";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  email: z.string().email().optional(),
});

const MemoryStore = createMemoryStore(session);

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

export function setupAuth(app: Express) {
  const sessionSettings = {
    secret: process.env.REPL_ID || "porygon-supremacy",
    resave: false,
    saveUninitialized: false,
    cookie: {},
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }

        // Check if user email is verified
        if (!user.isVerified) {
          return done(null, false, { message: "Please verify your email address before logging in." });
        }

        console.log(`[DEBUG] Password comparison: provided='${password}', stored='${user.password}', match=${password === user.password}`);
        const isMatch = password === user.password;
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        await db
          .update(users)
          .set({ lastLogin: new Date() })
          .where(eq(users.id, user.id));

        return done(null, user);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  app.post("/api/login", async (req, res, next) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input",
          errors: result.error.issues,
        });
      }

      const { username, password } = result.data;
      console.log(`[DEBUG] Login attempt: { username: '${username}', email: '${req.body.email}' }`);

      const cb = async (err: any, user: Express.User, info: IVerifyOptions) => {
        if (err) {
          console.error("Authentication error:", err);
          return res.status(500).json({ message: "Internal server error", error: err.message });
        }
        if (!user) {
          // Check if the error is due to unverified email
          if (info.message === "Please verify your email address before logging in.") {
            return res.status(401).json({ 
              message: info.message,
              requiresVerification: true
            });
          }
          return res.status(401).json({ message: info.message || "Authentication failed" });
        }

        req.logIn(user, (err) => {
          if (err) {
            console.error("Session error:", err);
            return res.status(500).json({ message: "Session error" });
          }
          return res.json({
            message: "Login successful",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
            },
          });
        });
      };

      passport.authenticate("local", cb)(req, res, next);
    } catch (error) {
      console.error("Login endpoint error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input", 
          errors: result.error.issues,
        });
      }

      const { username, password, email } = result.data;

      // Check if username or email already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      
      if (existingUser.length > 0) {
        return res.status(400).json({
          message: "Username already exists"
        });
      }

      const existingEmailUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email || ""))
        .limit(1);

      if (existingEmailUser.length > 0) {
        return res.status(400).json({
          message: "Email already exists"
        });
      }

      // Generate verification token
      const crypto = await import('crypto');
      const verificationToken = crypto.randomBytes(32).toString('hex');

      const now = new Date();
      
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          email: email || "",
          password: password,
          role: "user",
          lastLogin: now,
          trialActive: true,
          trialStartDate: now,
          trialExpiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          trialEndsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          subscriptionPlan: "free",
          status: "active", 
          tokens: 1000,
          createdAt: now,
          isVerified: false,
          verificationToken: verificationToken,
          tokenVersion: 0
        })
        .returning();

      // TODO: Send verification email
      console.log(`Email verification token for ${email}: ${verificationToken}`);
      console.log(`Verification link: ${req.get('origin') || 'http://localhost:5000'}/verify-email?token=${verificationToken}`);

      res.status(201).json({ 
        message: "User registered successfully. Please check your email to verify your account.",
        requiresVerification: true,
        email: newUser.email,
        // In development, include the token for testing
        ...(process.env.NODE_ENV === 'development' && { 
          verificationToken,
          verificationLink: `${req.get('origin') || 'http://localhost:5000'}/verify-email?token=${verificationToken}`
        })
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.user) {
      res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        tokens: req.user.tokens,
        subscriptionPlan: req.user.subscriptionPlan,
        trialActive: req.user.trialActive,
        trialExpiresAt: req.user.trialExpiresAt,
      });
    } else {
      res.status(401).json({ message: "Not logged in" });
    }
  });
}