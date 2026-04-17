import { scrapeGitHubTrending, scrapeProductHunt, scrapeReddit } from "@/lib/digest/scrapers";
import type { DigestPreferences, DigestResult, DigestSection } from "@/lib/digest/types";

function tokenizeTopics(topics: string): string[] {
  return topics
    .split(",")
    .map((topic) => topic.trim().toLowerCase())
    .filter(Boolean);
}

function filterSectionByTopics(section: DigestSection, topics: string[], maxItems: number): DigestSection {
  if (topics.length === 0) {
    return {
      ...section,
      items: section.items.slice(0, maxItems),
    };
  }

  const filtered = section.items.filter((item) => {
    const haystack = `${item.title} ${item.description}`.toLowerCase();
    return topics.some((topic) => haystack.includes(topic));
  });

  const remaining = section.items.filter(
    (item) => !filtered.some((keptItem) => keptItem.id === item.id),
  );

  const toppedUp = [...filtered, ...remaining].slice(0, maxItems);

  return {
    ...section,
    items: toppedUp,
  };
}

export async function buildDigest(preferences: DigestPreferences): Promise<DigestResult> {
  const [productHunt, github, reddit] = await Promise.all([
    scrapeProductHunt(preferences.maxItems),
    scrapeGitHubTrending(preferences),
    scrapeReddit(preferences),
  ]);

  const topics = tokenizeTopics(preferences.topics);
  const sections = [productHunt, github, reddit].map((section) =>
    filterSectionByTopics(section, topics, preferences.maxItems),
  );

  return {
    generatedAt: new Date().toISOString(),
    preferences,
    sections,
  };
}
