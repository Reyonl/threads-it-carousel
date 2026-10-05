import Parser from "rss-parser";
import { ITNews } from "@/types";

const parser = new Parser({ timeout: 8000 });

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>?/gm, "").trim();
}

async function fetchWithTimeout(url: string, ms = 7000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal } as RequestInit);
  } finally {
    clearTimeout(t);
  }
}

export async function fetchITNews(limit: number = 6, source: string = "all"): Promise<ITNews[]> {
  const news: ITNews[] = [];
  const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 10);
  const wantHN = source === "all" || source === "hacker-news";
  const wantDev = source === "all" || source === "dev-to";

  if (wantHN) {
    try {
      const hnRes = await fetchWithTimeout(
        "https://hacker-news.firebaseio.com/v0/topstories.json",
        7000
      );
      if (!hnRes.ok) throw new Error(`HN topstories ${hnRes.status}`);
      const storyIds: number[] = await hnRes.json();
      const topIds = (Array.isArray(storyIds) ? storyIds : []).slice(0, 5);
      const results = await Promise.allSettled(
        topIds.map(async (id) => {
          const r = await fetchWithTimeout(
            `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
            6000
          );
          if (!r.ok) throw new Error(`HN item ${id} ${r.status}`);
          return r.json();
        })
      );
      for (const res of results) {
        if (res.status !== "fulfilled") continue;
        const item = res.value as {
          id: number;
          title?: string;
          text?: string;
          url?: string;
          time?: number;
          score?: number;
          descendants?: number;
        };
        if (!item?.title) continue;
        news.push({
          id: `hn-${item.id}`,
          title: stripHtml(item.title).slice(0, 140),
          summary: item.text
            ? stripHtml(item.text).slice(0, 160) + "…"
            : "Top trending developer discussion on Hacker News.",
          source: "Hacker News",
          url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
          published_at: item.time
            ? new Date(item.time * 1000).toISOString()
            : new Date().toISOString(),
          points: item.score,
          comments: item.descendants,
        });
      }
    } catch (e) {
      console.error("[news] Hacker News fetch failed:", e);
    }
  }

  if (wantDev) {
    try {
      const feed = await parser.parseURL("https://dev.to/feed");
      const items = (feed.items || []).slice(0, 5);
      for (const item of items) {
        if (!item.title) continue;
        news.push({
          id: `devto-${item.guid || item.link}`,
          title: stripHtml(item.title).slice(0, 140),
          summary: item.contentSnippet
            ? stripHtml(item.contentSnippet).slice(0, 160) + "…"
            : "Trending development article from Dev.to community.",
          source: "Dev.to",
          url: item.link || "https://dev.to",
          published_at: item.isoDate || new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("[news] Dev.to fetch failed:", e);
    }
  }

  return news.slice(0, safeLimit);
}
