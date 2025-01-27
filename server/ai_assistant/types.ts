import { z } from "zod";

export const AIQueryTypeEnum = z.enum(["admin", "user"]);
export type AIQueryType = z.infer<typeof AIQueryTypeEnum>;

export const AIQuerySchema = z.object({
  type: AIQueryTypeEnum,
  query: z.string(),
  userId: z.number(),
  context: z.record(z.unknown()).optional(),
});

export type AIQuery = z.infer<typeof AIQuerySchema>;

export interface AIResponse {
  answer: string;
  suggestions?: string[];
  relatedDocs?: string[];
  confidence: number;
  metrics?: {
    errorRate?: string;
    activeUsers?: number;
    systemHealth?: {
      status: string;
      details: Record<string, unknown>;
    };
  };
  actions?: Array<{
    type: string;
    label: string;
    endpoint: string;
  }>;
}

export const AIFeedbackSchema = z.object({
  responseId: z.string(),
  userId: z.number(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  helpful: z.boolean(),
});

export type AIFeedback = z.infer<typeof AIFeedbackSchema>;