import { NextResponse } from "next/server";

type YahooSearchQuote = {
  symbol?: string;
  shortname?: string;
  longname?: string;
  exchDisp?: string;
  exchange?: string;
  quoteType?: string;
  typeDisp?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = String(searchParams.get("q") || "").trim();

    if (query.length < 2) {
      return NextResponse.json({ success: true, results: [] });
    }

    const url = new URL("https://query1.finance.yahoo.com/v1/finance/search");
    url.searchParams.set("q", query);
    url.searchParams.set("quotesCount", "8");
    url.searchParams.set("newsCount", "0");
    url.searchParams.set("enableFuzzyQuery", "true");

    const response = await fetch(url.toString(), {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || "Failed to search stocks.",
        },
        { status: response.status }
      );
    }

    const results = ((data.quotes || []) as YahooSearchQuote[])
      .filter((item) => item.symbol)
      .filter((item) => {
        const type = String(item.quoteType || item.typeDisp || "").toUpperCase();
        return type === "EQUITY" || type === "ETF" || type === "";
      })
      .map((item) => ({
        symbol: item.symbol,
        name: item.longname || item.shortname || item.symbol,
        exchange: item.exchDisp || item.exchange || "Market",
      }))
      .slice(0, 8);

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to search stocks.",
      },
      { status: 500 }
    );
  }
}
