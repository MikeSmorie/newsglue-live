import { db } from "@db";
import { errorLogs, type InsertErrorLog } from "@db/schema";

export type LogLevel = "INFO" | "WARNING" | "ERROR";

export async function logError(
  level: LogLevel,
  message: string,
  source: string,
  stackTrace?: string
) {
  try {
    const [log] = await db
      .insert(errorLogs)
      .values({
        level,
        message,
        source,
        stackTrace,
        timestamp: new Date(),
      })
      .returning();

    return log;
  } catch (error) {
    // Fallback to console if database logging fails
    console.error("Failed to log error:", error);
    console.error("Original error:", { level, message, source, stackTrace });
  }
}

// Create a custom error instance with source tracking
export class OmegaError extends Error {
  constructor(message: string, public source: string) {
    super(message);
    this.name = "OmegaError";
  }
}

// Helper function to extract useful information from Error objects
export function extractErrorInfo(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    message: String(error),
  };
}

// Utility to log unexpected errors
export async function logUnexpectedError(error: unknown, source: string) {
  const { message, stack } = extractErrorInfo(error);
  return logError("ERROR", message, source, stack);
}
