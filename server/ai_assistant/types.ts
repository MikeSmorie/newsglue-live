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
}
