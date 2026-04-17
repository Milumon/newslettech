import type { DigestResult } from "@/lib/digest/types";

const now = new Date().toISOString();

export const sampleDigest: DigestResult = {
  generatedAt: now,
  preferences: {
    topics: "ai, developer tools, startups",
    githubLanguage: "typescript",
    githubSince: "daily",
    subreddits: "programming, webdev, startups",
    maxItems: 3,
  },
  sections: [
    {
      source: "producthunt",
      heading: "Product Hunt",
      items: [
        {
          id: "ph-sample-1",
          source: "producthunt",
          title: "LaunchLens",
          description: "AI assistant for monitoring product launch traction.",
          url: "https://www.producthunt.com/",
          score: "210 upvotes",
        },
      ],
    },
    {
      source: "github",
      heading: "GitHub Trending (daily)",
      items: [
        {
          id: "gh-sample-1",
          source: "github",
          title: "acme/ship-fast",
          description: "Starter kit for shipping SaaS apps with TypeScript.",
          url: "https://github.com/trending",
          score: "1,204 stars today",
        },
      ],
    },
    {
      source: "reddit",
      heading: "Reddit",
      items: [
        {
          id: "rd-sample-1",
          source: "reddit",
          title: "What tools improved your dev workflow this year?",
          description: "r/programming",
          url: "https://www.reddit.com/r/programming/",
        },
      ],
    },
  ],
};
