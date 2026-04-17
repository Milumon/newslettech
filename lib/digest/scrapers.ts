import * as cheerio from "cheerio";

import type { DigestItem, DigestPreferences, DigestSection } from "@/lib/digest/types";

const REQUEST_TIMEOUT_MS = 10_000;
const PRODUCT_HUNT_GRAPHQL_URL = "https://api.producthunt.com/v2/api/graphql";
const GITHUB_SEARCH_API_URL = "https://api.github.com/search/repositories";

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewslettechBot/1.0)",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status}`);
    }

    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function buildFallbackSection(source: DigestSection["source"], heading: string): DigestSection {
  return {
    source,
    heading,
    items: [],
  };
}

export async function scrapeProductHunt(maxItems: number): Promise<DigestSection> {
  const apiSection = await scrapeProductHuntWithApi(maxItems);
  if (apiSection) {
    return apiSection;
  }

  try {
    const html = await fetchHtml("https://www.producthunt.com/");
    const $ = cheerio.load(html);
    const items: DigestItem[] = [];

    $("a[data-sentry-component='TopicItem'], a[data-test='post-name']").each((index, el) => {
      if (items.length >= maxItems) return;

      const title = normalizeText($(el).text());
      const href = $(el).attr("href");
      if (!title || !href) return;

      const url = href.startsWith("http") ? href : `https://www.producthunt.com${href}`;
      const parent = $(el).closest("article, div");
      const description =
        normalizeText(parent.find("p").first().text()) || "Trending product on Product Hunt";
      const score = normalizeText(
        parent.find("[data-test='vote-button'] span, [class*='styles_voteCount']").first().text(),
      );

      items.push({
        id: `ph-${index}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        source: "producthunt",
        title,
        description,
        url,
        score: score || undefined,
      });
    });

    return {
      source: "producthunt",
      heading: "Product Hunt",
      items: items.slice(0, maxItems),
    };
  } catch {
    return buildFallbackSection("producthunt", "Product Hunt");
  }
}

interface ProductHuntNode {
  id: string;
  name: string;
  tagline: string;
  votesCount: number;
  url: string;
}

interface ProductHuntGraphQLResponse {
  data?: {
    posts?: {
      edges?: Array<{
        node?: ProductHuntNode;
      }>;
    };
  };
}

async function scrapeProductHuntWithApi(maxItems: number): Promise<DigestSection | null> {
  const token = await getProductHuntAccessToken();
  if (!token) return null;

  try {
    const postedAfter = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();

    const query = `
      query GetPosts($first: Int!, $postedAfter: DateTime) {
        posts(first: $first, order: VOTES, postedAfter: $postedAfter) {
          edges {
            node {
              id
              name
              tagline
              votesCount
              url
            }
          }
        }
      }
    `;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(PRODUCT_HUNT_GRAPHQL_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: { first: maxItems, postedAfter },
      }),
      cache: "no-store",
    });

    clearTimeout(timer);

    if (!res.ok) return null;

    const payload = (await res.json()) as ProductHuntGraphQLResponse;
    const edges = payload.data?.posts?.edges ?? [];

    const items: DigestItem[] = [];

    edges.forEach((edge, index) => {
      const node = edge.node;
      if (!node?.name || !node?.url) return;

      items.push({
        id: `ph-api-${node.id || index}`,
        source: "producthunt",
        title: node.name,
        description: node.tagline || "Trending product on Product Hunt",
        url: node.url,
        score: node.votesCount ? `${node.votesCount} votes` : undefined,
      });
    });

    return {
      source: "producthunt",
      heading: "Product Hunt",
      items,
    };
  } catch {
    return null;
  }
}

async function getProductHuntAccessToken(): Promise<string | null> {
  const developerToken = process.env.PRODUCTHUNT_DEVELOPER_TOKEN;
  if (developerToken) {
    return developerToken;
  }

  const clientId = process.env.PRODUCTHUNT_API_KEY;
  const clientSecret = process.env.PRODUCTHUNT_API_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch("https://api.producthunt.com/v2/oauth/token", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
      cache: "no-store",
    });

    clearTimeout(timer);

    if (!res.ok) {
      return null;
    }

    const payload = (await res.json()) as { access_token?: string };
    return payload.access_token ?? null;
  } catch {
    return null;
  }
}

export async function scrapeGitHubTrending(preferences: DigestPreferences): Promise<DigestSection> {
  const apiSection = await scrapeGitHubTrendingWithApi(preferences);
  if (apiSection) {
    return apiSection;
  }

  const languagePath = preferences.githubLanguage
    ? `/${encodeURIComponent(preferences.githubLanguage.toLowerCase())}`
    : "";
  const url = `https://github.com/trending${languagePath}?since=${preferences.githubSince}`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const items: DigestItem[] = [];

    $("article.Box-row").each((index, el) => {
      if (items.length >= preferences.maxItems) return;

      const repoPath = normalizeText($(el).find("h2 a").text()).replace(/\s+/g, "");
      if (!repoPath) return;

      const description =
        normalizeText($(el).find("p").first().text()) || "Trending repository on GitHub";
      const repoUrl = `https://github.com/${repoPath}`;
      const score = normalizeText(
        $(el).find("span.d-inline-block.float-sm-right").first().text(),
      );

      items.push({
        id: `gh-${index}-${repoPath.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        source: "github",
        title: repoPath,
        description,
        url: repoUrl,
        score: score || undefined,
      });
    });

    return {
      source: "github",
      heading: `GitHub Trending (${preferences.githubSince})`,
      items: items.slice(0, preferences.maxItems),
    };
  } catch {
    return buildFallbackSection("github", `GitHub Trending (${preferences.githubSince})`);
  }
}

interface GitHubRepo {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  updated_at: string;
}

interface GitHubSearchResponse {
  items?: GitHubRepo[];
}

function githubSinceDate(since: DigestPreferences["githubSince"]): string {
  const now = Date.now();
  const oneDay = 1000 * 60 * 60 * 24;

  if (since === "weekly") {
    return new Date(now - oneDay * 7).toISOString().slice(0, 10);
  }

  if (since === "monthly") {
    return new Date(now - oneDay * 30).toISOString().slice(0, 10);
  }

  return new Date(now - oneDay).toISOString().slice(0, 10);
}

function buildGitHubQuery(preferences: DigestPreferences): string {
  const parts = [`pushed:>=${githubSinceDate(preferences.githubSince)}`];

  if (preferences.githubLanguage.trim()) {
    parts.push(`language:${preferences.githubLanguage.trim()}`);
  }

  const topic = preferences.topics
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);

  if (topic) {
    parts.push(topic);
  }

  return parts.join(" ");
}

async function scrapeGitHubTrendingWithApi(
  preferences: DigestPreferences,
): Promise<DigestSection | null> {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    return null;
  }

  try {
    const query = buildGitHubQuery(preferences);
    const params = new URLSearchParams({
      q: query,
      sort: "stars",
      order: "desc",
      per_page: String(preferences.maxItems),
      page: "1",
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(`${GITHUB_SEARCH_API_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "NewslettechDigestApp",
      },
      cache: "no-store",
    });

    clearTimeout(timer);

    if (!res.ok) {
      return null;
    }

    const payload = (await res.json()) as GitHubSearchResponse;
    const repos = payload.items ?? [];

    const items: DigestItem[] = repos.slice(0, preferences.maxItems).map((repo) => ({
      id: `gh-api-${repo.id}`,
      source: "github",
      title: repo.full_name,
      description: repo.description || "Trending repository on GitHub",
      url: repo.html_url,
      score: `${repo.stargazers_count.toLocaleString()} stars`,
    }));

    return {
      source: "github",
      heading: `GitHub Trending (${preferences.githubSince})`,
      items,
    };
  } catch {
    return null;
  }
}

function parseSubreddits(input: string): string[] {
  const parts = input
    .split(",")
    .map((part) => part.trim().replace(/^r\//i, ""))
    .filter(Boolean);
  return parts.length > 0 ? parts : ["programming", "webdev", "javascript"];
}

function parseTopics(input: string): string[] {
  return input
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);
}

function topicTokens(input: string): string[] {
  return parseTopics(input)
    .flatMap((topic) => topic.split(/\s+/))
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 3)
    .slice(0, 12);
}

function normalizeSubredditName(value: string): string {
  return value.replace(/^r\//i, "").trim();
}

async function discoverRelevantSubreddits(
  topics: string,
  maxToDiscover: number,
): Promise<string[]> {
  const topicList = parseTopics(topics);
  if (topicList.length === 0) {
    return [];
  }

  const discovered = new Set<string>();

  for (const topic of topicList) {
    if (discovered.size >= maxToDiscover) break;

    const query = encodeURIComponent(topic);
    const url = `https://www.reddit.com/subreddits/search.json?q=${query}&limit=8&include_over_18=false`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NewslettechBot/1.0)",
        },
        cache: "no-store",
      });

      clearTimeout(timer);
      if (!res.ok) continue;

      const payload = (await res.json()) as {
        data?: { children?: Array<{ data?: { display_name?: string; subscribers?: number } }> };
      };

      const children = payload.data?.children ?? [];
      const sorted = children.sort(
        (a, b) => (b.data?.subscribers ?? 0) - (a.data?.subscribers ?? 0),
      );

      for (const child of sorted) {
        const name = normalizeSubredditName(child.data?.display_name ?? "");
        if (!name) continue;
        discovered.add(name);
        if (discovered.size >= maxToDiscover) break;
      }
    } catch {
      continue;
    }
  }

  return Array.from(discovered);
}

async function fetchRedditJson<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewslettechBot/1.0)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    clearTimeout(timer);
    if (!res.ok) return null;

    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function relevanceScore(text: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const normalized = text.toLowerCase();
  return tokens.reduce((score, token) => score + (normalized.includes(token) ? 1 : 0), 0);
}

export async function scrapeReddit(preferences: DigestPreferences): Promise<DigestSection> {
  const explicitSubreddits = parseSubreddits(preferences.subreddits);
  const discoveredSubreddits = await discoverRelevantSubreddits(preferences.topics, 10);
  const subreddits = Array.from(new Set([...explicitSubreddits, ...discoveredSubreddits]));
  const tokens = topicTokens(preferences.topics);

  const bySubreddit: DigestItem[] = [];
  const seen = new Set<string>();

  const candidateSubs = subreddits.length > 0
    ? subreddits
    : ["programming", "webdev", "technology", "MachineLearning", "startups"];

  for (const subreddit of candidateSubs) {
    if (bySubreddit.length >= preferences.maxItems) break;

    const listingUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=30`;

    const payload = await fetchRedditJson<{
      data?: {
        children?: Array<{
          data?: {
            id?: string;
            title?: string;
            selftext?: string;
            permalink?: string;
            subreddit?: string;
            score?: number;
          };
        }>;
      };
    }>(listingUrl);

    if (!payload) continue;

    const posts = payload.data?.children ?? [];

    const sorted = [...posts].sort((a, b) => {
      const aText = `${a.data?.title ?? ""} ${a.data?.selftext ?? ""}`;
      const bText = `${b.data?.title ?? ""} ${b.data?.selftext ?? ""}`;
      const aRel = relevanceScore(aText, tokens);
      const bRel = relevanceScore(bText, tokens);
      const aScore = a.data?.score ?? 0;
      const bScore = b.data?.score ?? 0;

      if (bRel !== aRel) return bRel - aRel;
      return bScore - aScore;
    });

    for (const post of sorted) {
      if (bySubreddit.length >= preferences.maxItems) break;

      const data = post.data;
      const title = normalizeText(data?.title ?? "");
      const permalink = data?.permalink;
      const id = data?.id;
      if (!title || !permalink || !id) continue;
      if (seen.has(id)) continue;

      const textForScore = `${title} ${data?.selftext ?? ""}`;
      const rel = relevanceScore(textForScore, tokens);
      const lowValueWhenTokenized = tokens.length > 0 && rel === 0;

      if (lowValueWhenTokenized && sorted.length > preferences.maxItems) {
        continue;
      }

      const description = normalizeText(data?.selftext ?? "").slice(0, 180);

      seen.add(id);
      bySubreddit.push({
        id: `rd-${id}`,
        source: "reddit",
        title,
        description: description || `r/${data?.subreddit ?? subreddit}`,
        url: `https://www.reddit.com${permalink}`,
        score: typeof data?.score === "number" ? `${data.score} upvotes` : undefined,
      });
    }
  }

  return {
    source: "reddit",
    heading: "Reddit",
    items: bySubreddit.slice(0, preferences.maxItems),
  };
}
