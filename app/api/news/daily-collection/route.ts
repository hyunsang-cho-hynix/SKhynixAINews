import { NextResponse } from "next/server";
import { topicQueries } from "@/lib/topicQueries";

type GNewsArticle = {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
};

type CollectedArticle = GNewsArticle & {
  assignedTopic: string;
};

export async function GET() {
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

    const collectedArticles: CollectedArticle[] = [];

    for (const topicQuery of topicQueries) {
      const url = new URL("https://gnews.io/api/v4/search");
      url.searchParams.set("q", topicQuery.query);
      url.searchParams.set("lang", "en");
      url.searchParams.set("country", "us");
      url.searchParams.set("max", "3");
      url.searchParams.set("apikey", apiKey);

      const response = await fetch(url.toString(), {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          {
            success: false,
            error:
              data.errors?.[0] ||
              `Failed to fetch ${topicQuery.topic} news from GNews.`,
            details: data,
          },
          { status: response.status }
        );
      }

      const articles: GNewsArticle[] = data.articles || [];

      for (const article of articles) {
        collectedArticles.push({
          ...article,
          assignedTopic: topicQuery.topic,
        });
      }
    }

    const uniqueArticles = Array.from(
      new Map(
        collectedArticles.map((article) => [article.url, article])
      ).values()
    );

    const groupedArticles = uniqueArticles.reduce<
      Record<string, CollectedArticle[]>
    >((groups, article) => {
      if (!groups[article.assignedTopic]) {
        groups[article.assignedTopic] = [];
      }

      groups[article.assignedTopic].push(article);
      return groups;
    }, {});

    return NextResponse.json({
      success: true,
      totalArticles: uniqueArticles.length,
      topics: topicQueries.map((item) => item.topic),
      articles: uniqueArticles,
      groupedArticles,
    });
  } catch (error) {
    console.error("Daily collection error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to run daily news collection.",
      },
      { status: 500 }
    );
  }
}