import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const apiKey = process.env.GNEWS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing GNEWS_API_KEY. Check .env.local and restart npm run dev.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "semiconductor";
    const max = searchParams.get("max") || "10";

    const url = new URL("https://gnews.io/api/v4/search");
    url.searchParams.set("q", query);
    url.searchParams.set("lang", "en");
    url.searchParams.set("country", "us");
    url.searchParams.set("max", max);
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.errors?.[0] || "Failed to fetch news from GNews.",
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      totalArticles: data.totalArticles,
      articles: data.articles,
    });
  } catch (error) {
    console.error("GNews search error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to search news.",
      },
      { status: 500 }
    );
  }
}