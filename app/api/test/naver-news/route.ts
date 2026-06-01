import { NextResponse } from "next/server";

type NaverNewsItem = {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
};

function cleanNaverText(value: string) {
  return value
    .replaceAll("<b>", "")
    .replaceAll("</b>", "")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Naver News";
  }
}

export async function GET(request: Request) {
  try {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET.",
        },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "SK하이닉스 HBM";
    const display = searchParams.get("display") || "10";
    const sort = searchParams.get("sort") || "date";

    const url = new URL("https://openapi.naver.com/v1/search/news.json");
    url.searchParams.set("query", query);
    url.searchParams.set("display", display);
    url.searchParams.set("start", "1");
    url.searchParams.set("sort", sort);

    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Naver API request failed.",
          detail: data,
        },
        { status: response.status }
      );
    }

    const items = ((data.items || []) as NaverNewsItem[]).map((item) => {
      const originalUrl = item.originallink || item.link;

      return {
        title: cleanNaverText(item.title),
        description: cleanNaverText(item.description),
        originalUrl,
        naverUrl: item.link,
        source: getHostname(originalUrl),
        publishedAt: item.pubDate,
      };
    });

    return NextResponse.json({
      success: true,
      query,
      total: data.total,
      start: data.start,
      display: data.display,
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to test Naver news API.",
      },
      { status: 500 }
    );
  }
}