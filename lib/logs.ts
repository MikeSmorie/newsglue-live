import { db } from "../db";
import { omegaLogs, type LogEventType, type LogSeverity } from "../db/schema";

interface LogEventOptions {
  userId?: number;
  userRole?: string;
  endpoint?: string;
  severity?: LogSeverity;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

/**
 * Global logging utility for Omega-V8.3 observability
 * Format: [timestamp] [user.role] [endpoint] [event type]: message
 */
export async function logEvent(
  eventType: LogEventType,
  message: string,
  options: LogEventOptions = {}
): Promise<void> {
  try {
    const {
      userId,
      userRole = "anonymous",
      endpoint,
      severity = "info",
      stackTrace,
      metadata
    } = options;

    await db.insert(omegaLogs).values({
      userId,
      userRole,
      endpoint,
      eventType,
      severity,
      message,
      stackTrace,
      metadata
    });

    // Console output for development
    const timestamp = new Date().toISOString();
    const endpointStr = endpoint ? ` [${endpoint}]` : "";
    console.log(`[${timestamp}] [${userRole}]${endpointStr} [${eventType}]: ${message}`);

  } catch (error) {
    // Fallback logging if database insert fails
    console.error("Failed to log event to database:", error);
    console.log(`[FALLBACK] [${eventType}]: ${message}`);
  }
}

/**
 * Convenience function for logging authentication events
 */
export async function logAuth(
  eventType: "login" | "logout",
  userId: number,
  userRole: string,
  success: boolean
): Promise<void> {
  const message = success 
    ? `User ${userId} ${eventType} successful`
    : `User ${userId} ${eventType} failed`;
    
  await logEvent(eventType, message, {
    userId,
    userRole,
    severity: success ? "info" : "warning",
    metadata: { success }
  });
}

/**
 * Convenience function for logging API errors
 */
export async function logAPIError(
  endpoint: string,
  error: Error,
  userId?: number,
  userRole?: string
): Promise<void> {
  await logEvent("api_error", `API error on ${endpoint}: ${error.message}`, {
    userId,
    userRole,
    endpoint,
    severity: "error",
    stackTrace: error.stack,
    metadata: {
      errorName: error.name,
      errorMessage: error.message
    }
  });
}

/**
 * Convenience function for logging subscription changes
 */
export async function logSubscriptionChange(
  userId: number,
  userRole: string,
  fromPlan: string,
  toPlan: string,
  paymentMethod?: string
): Promise<void> {
  await logEvent("subscription_change", 
    `User ${userId} changed subscription from ${fromPlan} to ${toPlan}`, {
    userId,
    userRole,
    severity: "info",
    metadata: {
      fromPlan,
      toPlan,
      paymentMethod
    }
  });
}

/**
 * Convenience function for logging payment attempts
 */
export async function logPaymentAttempt(
  userId: number,
  userRole: string,
  provider: string,
  amount: number,
  currency: string,
  success: boolean,
  transactionId?: string
): Promise<void> {
  const message = success
    ? `Payment successful: ${amount} ${currency} via ${provider}`
    : `Payment failed: ${amount} ${currency} via ${provider}`;

  await logEvent("payment_attempt", message, {
    userId,
    userRole,
    severity: success ? "info" : "error",
    metadata: {
      provider,
      amount,
      currency,
      success,
      transactionId
    }
  });
}