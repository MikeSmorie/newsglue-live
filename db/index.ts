import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const poolConfig = {
  connection: process.env.DATABASE_URL?.replace('.us-east-2', '-pooler.us-east-2'),
  schema,
  ws: ws,
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000
  }
};

export const db = drizzle(poolConfig);
