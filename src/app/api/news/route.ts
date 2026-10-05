import { NextResponse } from "next/server";
import { fetchITNews } from "@/lib/news";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get("limit") || "6", 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 10) : 6;
  const rawSource = searchParams.get("source") || "all";
  const allowed = new Set(["all", "hacker-news", "dev-to"]);
  const source = allowed.has(rawSource) ? rawSource : "all";

  try {
    const news = await fetchITNews(limit, source);
    return NextResponse.json({ success: true, count: news.length, data: news });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
