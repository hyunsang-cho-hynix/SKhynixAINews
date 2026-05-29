import { NextResponse } from "next/server";

type YahooChartPoint = {
  timestamp: number;
  close: number | null;
};

type QuoteResult = {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  points: YahooChartPoint[];
};

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function getYahooSymbol(symbol: string) {
  const clean = normalizeSymbol(symbol);

  if (clean.includes(":")) {
    const [, ticker] = clean.split(":");
    return ticker;
  }

  return clean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawSymbols = searchParams.get("symbols");
    const requestedRange = searchParams.get("range") || "1mo";

    const allowedRanges = new Set(["1d", "5d", "1mo", "6mo", "1y"]);
    const range = allowedRanges.has(requestedRange) ? requestedRange : "1mo";

    const intervalMap: Record<string, string> = {
      "1d": "5m",
      "5d": "30m",
      "1mo": "1d",
      "6mo": "1d",
      "1y": "1wk",
    };

    const interval = intervalMap[range] || "1d";

    if (!rawSymbols) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing symbols parameter.",
        },
        { status: 400 }
      );
    }

    const symbols = rawSymbols
      .split(",")
      .map((item) => normalizeSymbol(item))
      .filter(Boolean)
      .slice(0, 10);

    if (symbols.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid symbols provided.",
        },
        { status: 400 }
      );
    }

    const results: QuoteResult[] = [];

    for (const symbol of symbols) {
      const yahooSymbol = getYahooSymbol(symbol);

      const url = new URL(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          yahooSymbol
        )}`
      );

      url.searchParams.set("range", range);
      url.searchParams.set("interval", interval);

      const response = await fetch(url.toString(), {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        results.push({
          symbol,
          name: symbol,
          price: null,
          change: null,
          changePercent: null,
          currency: "USD",
          points: [],
        });

        continue;
      }

      const chartResult = data.chart?.result?.[0];
      const meta = chartResult?.meta;
      const timestamps = chartResult?.timestamp || [];
      const closes =
        chartResult?.indicators?.quote?.[0]?.close ||
        chartResult?.indicators?.adjclose?.[0]?.adjclose ||
        [];

      const points: YahooChartPoint[] = timestamps
        .map((timestamp: number, index: number) => ({
          timestamp,
          close:
            typeof closes[index] === "number"
              ? Number(closes[index].toFixed(2))
              : null,
        }))
        .filter((point: YahooChartPoint) => point.close !== null);

      const currentPrice =
        typeof meta?.regularMarketPrice === "number"
          ? meta.regularMarketPrice
          : points.at(-1)?.close ?? null;

      const previousClose =
        typeof meta?.chartPreviousClose === "number"
          ? meta.chartPreviousClose
          : points.length > 1
            ? points[points.length - 2].close
            : null;

      const change =
        currentPrice !== null && previousClose !== null
          ? currentPrice - previousClose
          : null;

      const changePercent =
        change !== null && previousClose
          ? (change / previousClose) * 100
          : null;

      results.push({
        symbol,
        name: meta?.longName || meta?.shortName || symbol,
        price: currentPrice,
        change,
        changePercent,
        currency: meta?.currency || "USD",
        points,
      });
    }

    return NextResponse.json({
      success: true,
      range,
      interval,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to load stock quote.",
      },
      { status: 500 }
    );
  }
}