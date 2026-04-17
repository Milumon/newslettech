export type DigestSource = "producthunt" | "github" | "reddit";

export type GitHubSince = "daily" | "weekly" | "monthly";

export interface DigestPreferences {
  topics: string;
  githubLanguage: string;
  githubSince: GitHubSince;
  subreddits: string;
  maxItems: number;
}

export interface DigestItem {
  id: string;
  source: DigestSource;
  title: string;
  description: string;
  url: string;
  score?: string;
}

export interface DigestSection {
  source: DigestSource;
  heading: string;
  items: DigestItem[];
}

export interface DigestResult {
  generatedAt: string;
  preferences: DigestPreferences;
  sections: DigestSection[];
}
