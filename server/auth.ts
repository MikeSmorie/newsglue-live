import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
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

// extend express user object with our schema
declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "porygon-supremacy",
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
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
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
      done(err);
    }
  });

  app.post("/api/register-admin", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        });
      }

      // Check if admin already exists
      const [existingAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);

      if (existingAdmin) {
        return res.status(400).json({
          message: "An admin user already exists"
        });
      }

      const { username, password } = result.data;

      // Check if username already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists"
        });
      }

      // Hash the password and create admin user
      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          role: "admin",
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({
            message: "Error during login after registration"
          });
        }
        return res.json({
          message: "Admin registration successful",
          user: { id: newUser.id, username: newUser.username, role: newUser.role },
        });
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Internal server error",
        error: error.message
      });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
        });
      }

      const { username, password } = result.data;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({
          message: "Username already exists"
        });
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          role: "user", // Explicitly set role as user
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({
            message: "Error during login after registration"
          });
        }
        return res.json({
          message: "Registration successful",
          user: { id: newUser.id, username: newUser.username, role: newUser.role },
        });
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Internal server error",
        error: error.message
      });
    }
  });

  app.post("/api/login", (req, res, next) => {
    const result = insertUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ")
      });
    }

    const cb = (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        return res.status(500).json({
          message: "Internal server error",
          error: err.message
        });
      }

      if (!user) {
        return res.status(400).json({
          message: info.message ?? "Login failed"
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({
            message: "Error during login",
            error: err.message
          });
        }

        return res.json({
          message: "Login successful",
          user: { id: user.id, username: user.username, role: user.role },
        });
      });
    };
    passport.authenticate("local", cb)(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          message: "Logout failed",
          error: err.message
        });
      }

      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }

    res.status(401).json({ message: "Not logged in" });
  });
}