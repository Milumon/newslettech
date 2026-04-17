import { z } from "zod";

const githubSinceSchema = z.enum(["daily", "weekly", "monthly"]);

export const digestPreferencesSchema = z.object({
  topics: z.string().trim().max(200).default(""),
  githubLanguage: z.string().trim().max(50).default(""),
  githubSince: githubSinceSchema.default("daily"),
  subreddits: z.string().trim().max(200).default(""),
  maxItems: z.number().int().min(1).max(10).default(5),
});

export const sendDigestSchema = z.object({
  email: z.string().email(),
  digest: z.object({
    generatedAt: z.string(),
    preferences: digestPreferencesSchema,
    sections: z.array(
      z.object({
        source: z.enum(["producthunt", "github", "reddit"]),
        heading: z.string(),
        items: z.array(
          z.object({
            id: z.string(),
            source: z.enum(["producthunt", "github", "reddit"]),
            title: z.string(),
            description: z.string(),
            url: z.string().url(),
            score: z.string().optional(),
          }),
        ),
      }),
    ),
  }),
});

export type DigestPreferencesInput = z.infer<typeof digestPreferencesSchema>;
export type SendDigestInput = z.infer<typeof sendDigestSchema>;
