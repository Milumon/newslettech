import { z } from "zod";

export const preferencesSchema = z.object({
  email: z.string().email(),
  topics: z.string().trim().max(400),
  githubLanguage: z.string().trim().max(60),
  subreddits: z.string().trim().max(300),
  maxItems: z.number().int().min(1).max(10),
  frequency: z.enum(["daily", "weekly"]),
});

export const preferencesEmailSchema = z.object({
  email: z.string().email(),
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;
