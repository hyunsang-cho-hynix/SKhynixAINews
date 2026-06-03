"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

type NewsLanguagePreference = "en" | "ko" | "both";
type StockRange = "1d" | "5d" | "1mo" | "6mo" | "1y";

type StockWatchItem = {
  id?: string;
  symbol: string;
  name: string;
  exchange: string;
  display_order?: number;
  isDefault?: boolean;
};

type QuotePoint = {
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
  points: QuotePoint[];
};

type StockSearchResult = {
  symbol: string;
  name: string;
  exchange: string;
};

type MarketArticle = {
  id: string;
  topic: string;
  polished_title: string;
  polished_title_ko: string | null;
  summary: string;
  summary_ko: string | null;
  importance_score: number;
  reason: string | null;
  reason_ko: string | null;
  source: string;
  published_at: string;
  image_url: string | null;
  is_ai_processed: boolean;
  original_language: string | null;
};

const defaultStocks: StockWatchItem[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA",
    exchange: "NASDAQ",
    display_order: 1,
    isDefault: true,
  },
  {
    symbol: "AAPL",
    name: "Apple",
    exchange: "NASDAQ",
    display_order: 2,
    isDefault: true,
  },
  {
    symbol: "MSFT",
    name: "Microsoft",
    exchange: "NASDAQ",
    display_order: 3,
    isDefault: true,
  },
];

const stockRanges: { label: string; value: StockRange }[] = [
  { label: "1D", value: "1d" },
  { label: "5D", value: "5d" },
  { label: "1M", value: "1mo" },
  { label: "6M", value: "6mo" },
  { label: "1Y", value: "1y" },
];

const RECENT_MARKET_NEWS_WINDOW_HOURS = 24;

const irLinks = [
  {
    title: "Financial Statements",
    href: "https://www.skhynix.com/ir/UI-FR-IR07",
    icon: "$",
  },
  {
    title: "Disclosures",
    href: "https://www.skhynix.com/ir/UI-FR-IR12_T1/",
    icon: "▣",
  },
  {
    title: "Earnings Release",
    href: "https://www.skhynix.com/ir/UI-FR-IR06/",
    icon: "↗",
  },
];

function normalizeLanguagePreference(value: string | null | undefined) {
  if (value === "ko" || value === "both") {
    return value;
  }

  return "en";
}

function getLanguageLabel(language: NewsLanguagePreference) {
  if (language === "ko") {
    return "Korean news only";
  }

  if (language === "both") {
    return "English and Korean news";
  }

  return "English news only";
}

function getMarketArticleDisplay(
  article: MarketArticle,
  language: NewsLanguagePreference
) {
  if (language === "ko") {
    return {
      title: article.polished_title_ko || article.polished_title,
      summary: article.summary_ko || article.summary,
    };
  }

  if (language === "both" && article.original_language === "ko") {
    return {
      title: article.polished_title_ko || article.polished_title,
      summary: article.summary_ko || article.summary,
    };
  }

  return {
    title: article.polished_title,
    summary: article.summary,
  };
}

function formatNumber(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChange(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return "--";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getFinanceUrl(symbol: string) {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;
}

function Sparkline({
  points,
  isPositive,
}: {
  points: QuotePoint[];
  isPositive: boolean;
}) {
  const validPoints = points
    .map((point) => point.close)
    .filter((value): value is number => typeof value === "number");

  if (validPoints.length < 2) {
    return (
      <div className="mt-3 flex h-10 items-center justify-center rounded-lg bg-[#26262C] text-xs text-zinc-500">
        No chart
      </div>
    );
  }

  const width = 190;
  const height = 44;
  const min = Math.min(...validPoints);
  const max = Math.max(...validPoints);
  const range = max - min || 1;

  const path = validPoints
    .map((value, index) => {
      const x = (index / (validPoints.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="mt-3 h-11 w-full overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={areaPath}
        fill={isPositive ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)"}
      />
      <path
        d={path}
        fill="none"
        stroke={isPositive ? "#22c55e" : "#ef4444"}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StockMiniCard({
  stock,
  quote,
  onRemove,
}: {
  stock: StockWatchItem;
  quote?: QuoteResult;
  onRemove?: () => void;
}) {
  const changePercent = quote?.changePercent ?? null;
  const isPositive = (changePercent ?? 0) >= 0;

  return (
    <article className="min-h-[160px] rounded-2xl border border-[#454550] bg-[#303039] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">{stock.name}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#F47725]">
            {stock.symbol}
          </p>
        </div>

        {!stock.isDefault && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-sm text-zinc-500 hover:text-[#EA002C]"
            aria-label={`Remove ${stock.symbol}`}
          >
            ×
          </button>
        )}
      </div>

      <div className="mt-3">
        <p className="text-xl font-semibold text-white">
          {quote ? formatNumber(quote.price) : "--"}
        </p>

        <p className="mt-1 text-sm text-zinc-400">
          {quote ? formatChange(quote.change) : "--"}
        </p>

        <p
          className={`mt-2 inline-flex items-center gap-1 text-lg font-bold ${
            isPositive ? "text-green-400" : "text-red-400"
          }`}
        >
          {quote ? formatPercent(quote.changePercent) : "--"}
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs text-white ${
              isPositive ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {isPositive ? "↑" : "↓"}
          </span>
        </p>
      </div>

      <Sparkline points={quote?.points || []} isPositive={isPositive} />

      <a
        href={getFinanceUrl(stock.symbol)}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex text-xs font-semibold text-zinc-400 hover:text-[#ffb17a]"
      >
        Open quote →
      </a>
    </article>
  );
}

export default function StockPage() {
  const [userId, setUserId] = useState("");
  const [customStocks, setCustomStocks] = useState<StockWatchItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteResult>>({});
  const [stockRange, setStockRange] = useState<StockRange>("1mo");
  const [newsLanguagePreference, setNewsLanguagePreference] =
    useState<NewsLanguagePreference>("both");
  const [stockSearchQuery, setStockSearchQuery] = useState("");
  const [stockSearchResults, setStockSearchResults] = useState<
    StockSearchResult[]
  >([]);
  const [searchingStocks, setSearchingStocks] = useState(false);
  const [addingStock, setAddingStock] = useState(false);
  const [marketArticles, setMarketArticles] = useState<MarketArticle[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [stockActionMessage, setStockActionMessage] = useState("");

  const stocks = useMemo(() => {
    return [...defaultStocks, ...customStocks];
  }, [customStocks]);

  useEffect(() => {
    const savedRange = localStorage.getItem(
      "skhynix-ai-news-stock-range"
    ) as StockRange | null;

    if (
      savedRange === "1d" ||
      savedRange === "5d" ||
      savedRange === "1mo" ||
      savedRange === "6mo" ||
      savedRange === "1y"
    ) {
      setStockRange(savedRange);
    }

    loadUserAndWatchlist();
  }, []);

  useEffect(() => {
    if (stocks.length > 0) {
      loadQuotes(stocks, stockRange);
    }
  }, [stocks, stockRange]);

  useEffect(() => {
    loadMarketArticles(newsLanguagePreference);
  }, [newsLanguagePreference]);

  function handleStockRangeChange(nextRange: StockRange) {
    setStockRange(nextRange);
    localStorage.setItem("skhynix-ai-news-stock-range", nextRange);
  }

  async function searchStocks(query: string) {
    setStockSearchQuery(query);

    if (query.trim().length < 2) {
      setStockSearchResults([]);
      setSearchingStocks(false);
      setStockActionMessage("");
      return;
    }

    setSearchingStocks(true);
    setStockActionMessage("");

    try {
      const response = await fetch(
        `/api/stocks/search?q=${encodeURIComponent(query.trim())}`,
        {
          cache: "no-store",
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search stocks.");
      }

      setStockSearchResults(data.results || []);
    } catch (error) {
      setStockSearchResults([]);
      setStockActionMessage(
        error instanceof Error ? error.message : "Failed to search stocks."
      );
    } finally {
      setSearchingStocks(false);
    }
  }

  async function loadUserAndWatchlist() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setUserId("");
        setCustomStocks([]);
        setNewsLanguagePreference("both");
        return;
      }

      setUserId(user.id);

      const { data: preferenceData } = await supabase
        .from("user_topic_preferences")
        .select("news_language_preference")
        .eq("user_id", user.id)
        .maybeSingle();

      setNewsLanguagePreference(
        normalizeLanguagePreference(preferenceData?.news_language_preference)
      );

      const { data, error } = await supabase
        .from("user_stock_watchlist")
        .select("id, symbol, name, exchange, display_order")
        .eq("user_id", user.id)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      setCustomStocks(
        (data || []).map((item) => ({
          id: item.id,
          symbol: item.symbol,
          name: item.name || item.symbol,
          exchange: item.exchange || "NASDAQ",
          display_order: item.display_order || 0,
          isDefault: false,
        }))
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to load stock watchlist."
      );
    }
  }

  async function loadQuotes(items: StockWatchItem[], range: StockRange) {
    setLoadingQuotes(true);

    try {
      const symbols = Array.from(new Set(items.map((item) => item.symbol))).join(
        ","
      );

      const response = await fetch(
        `/api/stocks/quote?symbols=${encodeURIComponent(
          symbols
        )}&range=${encodeURIComponent(range)}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load stock quotes.");
      }

      const nextQuotes: Record<string, QuoteResult> = {};

      for (const quote of data.results || []) {
        nextQuotes[quote.symbol] = quote;
      }

      setQuotes(nextQuotes);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load stock quotes."
      );
    } finally {
      setLoadingQuotes(false);
    }
  }

  async function handleAddStock(result: StockSearchResult) {
    const symbol = result.symbol.trim().toUpperCase();
    const name = result.name.trim() || symbol;

    if (!symbol || addingStock) {
      return;
    }

    if (!userId) {
      setStockActionMessage("Please log in to save custom stock tickers.");
      return;
    }

    const alreadyExists = stocks.some((stock) => stock.symbol === symbol);

    if (alreadyExists) {
      setStockSearchQuery("");
      setStockSearchResults([]);
      return;
    }

    setAddingStock(true);
    setStockActionMessage("");

    try {
      const { error } = await supabase.from("user_stock_watchlist").insert({
        user_id: userId,
        symbol,
        name,
        exchange: result.exchange || "Market",
        display_order: customStocks.length + 10,
      });

      if (error) {
        throw error;
      }

      setStockSearchQuery("");
      setStockSearchResults([]);
      await loadUserAndWatchlist();
    } catch (error) {
      setStockActionMessage(
        error instanceof Error ? error.message : "Failed to add stock ticker."
      );
    } finally {
      setAddingStock(false);
    }
  }

  async function handleRemoveStock(stock: StockWatchItem) {
    if (!stock.id) {
      return;
    }

    try {
      const { error } = await supabase
        .from("user_stock_watchlist")
        .delete()
        .eq("id", stock.id);

      if (error) {
        throw error;
      }

      await loadUserAndWatchlist();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to remove stock ticker."
      );
    }
  }

  async function loadMarketArticles(language: NewsLanguagePreference) {
    setLoadingNews(true);
    setErrorMessage("");

    try {
      let query = supabase
        .from("processed_articles")
        .select(
          "id, topic, polished_title, polished_title_ko, summary, summary_ko, importance_score, reason, reason_ko, source, published_at, image_url, is_ai_processed, original_language"
        )
        .eq("topic", "Stock Market")
        .gte(
          "published_at",
          new Date(
            Date.now() - RECENT_MARKET_NEWS_WINDOW_HOURS * 60 * 60 * 1000
          ).toISOString()
        )
        .order("is_ai_processed", { ascending: false })
        .order("importance_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(8);

      if (language === "ko") {
        query = query.eq("original_language", "ko");
      }

      if (language === "en") {
        query = query.or("original_language.eq.en,original_language.is.null");
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setMarketArticles((data || []) as MarketArticle[]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load market news."
      );
    } finally {
      setLoadingNews(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <Link
          href="/"
          className="mb-8 inline-block text-sm font-semibold text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Home
        </Link>

        <div className="mb-8 overflow-hidden rounded-2xl border border-[#454550] bg-[#303039] shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[#EA002C] via-[#F47725] to-[#ffb17a]" />

          <div className="p-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#F47725]">
              Stock Information
            </p>

            <h1 className="text-4xl font-bold tracking-tight text-white">
              SK hynix Stock Ticker
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              View SK hynix stock information, key investor links, customer
              ecosystem tickers, and market-related technology news.
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="grid h-[430px] grid-rows-3 gap-4">
            {irLinks.map((item) => (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-[#454550] bg-[#303039] px-6 transition hover:-translate-y-0.5 hover:border-[#F47725]/70 hover:bg-[#383843]"
              >
                <div className="flex items-center gap-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#202026] text-lg font-bold text-[#ffb17a]">
                    {item.icon}
                  </div>

                  <h2 className="text-lg font-bold text-white">
                    {item.title}
                  </h2>
                </div>

                <span className="text-2xl text-zinc-500 transition group-hover:translate-x-1 group-hover:text-[#F47725]">
                  →
                </span>
              </a>
            ))}
          </div>

          <section className="h-[430px] overflow-hidden rounded-2xl border border-[#454550] bg-white shadow-sm">
            <div className="h-full w-full overflow-hidden bg-white">
              <iframe
                title="SK hynix stock ticker"
                src="https://asia.tools.euroland.com/tools/ticker/html/?companycode=kr-000660&v=redesign&lang=en-gb"
                className="h-[500px] w-[112%] border-0"
                style={{
                  transform: "translateX(-5.5%) translateY(25px) scale(1.08)",
                  transformOrigin: "top center",
                }}
                loading="lazy"
              />
            </div>
          </section>
        </div>

        <section className="mb-8 rounded-2xl border border-[#454550] bg-[#303039] p-6 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#F47725]">
                Customer & Ecosystem Watchlist
              </p>
              <h2 className="text-2xl font-bold text-white">
                Customer Stock Tickers
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Default list includes NVIDIA, Apple, and Microsoft. Add more
                companies to your saved watchlist.
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 md:items-end">
              <div className="flex rounded-full border border-[#454550] bg-[#26262C] p-1">
                {stockRanges.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => handleStockRangeChange(item.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      stockRange === item.value
                        ? "bg-[#F47725] text-white"
                        : "text-zinc-400 hover:bg-[#303039] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {loadingQuotes && (
                <p className="text-xs text-zinc-500">Loading quotes...</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stocks.map((stock) => (
              <StockMiniCard
                key={`${stock.symbol}-${stock.id || "default"}`}
                stock={stock}
                quote={quotes[stock.symbol]}
                onRemove={
                  stock.isDefault ? undefined : () => handleRemoveStock(stock)
                }
              />
            ))}

            <div className="min-h-[160px] rounded-2xl border border-dashed border-[#5A5A66] bg-[#26262C] p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F47725] text-2xl font-bold text-white">
                  +
                </div>

                <div>
                  <h3 className="font-bold text-white">Add ticker</h3>
                  <p className="text-xs text-zinc-400">
                    Search and save to your account
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  value={stockSearchQuery}
                  onChange={(event) => searchStocks(event.target.value)}
                  placeholder="Search company or ticker"
                  className="w-full rounded-xl border border-[#454550] bg-[#303039] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-[#F47725]"
                />

                {searchingStocks && (
                  <p className="text-xs text-zinc-500">Searching...</p>
                )}

                {stockActionMessage && (
                  <div className="rounded-xl border border-[#F47725]/30 bg-[#F47725]/10 px-3 py-2 text-sm font-semibold text-[#ffb17a]">
                    {stockActionMessage}
                  </div>
                )}

                {!searchingStocks &&
                  stockSearchQuery.trim().length >= 2 &&
                  stockSearchResults.length === 0 && (
                    <p className="text-xs text-zinc-500">No matches found.</p>
                  )}

                {stockSearchResults.length > 0 && (
                  <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                    {stockSearchResults.map((result) => {
                      const alreadyExists = stocks.some(
                        (stock) => stock.symbol === result.symbol
                      );

                      return (
                        <button
                          key={`${result.symbol}-${result.exchange}`}
                          type="button"
                          onClick={() => handleAddStock(result)}
                          disabled={addingStock || alreadyExists}
                          className="w-full rounded-xl border border-[#454550] bg-[#303039] px-3 py-3 text-left transition hover:border-[#F47725] hover:bg-[#383843] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-white">
                              {result.symbol}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {alreadyExists
                                ? "Added"
                                : addingStock
                                  ? "Adding..."
                                  : result.exchange}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                            {result.name}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {!userId && (
            <p className="mt-4 text-sm text-zinc-500">
              Login is required to save custom tickers. Default tickers are
              still visible.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-[#454550] bg-[#303039] p-6 shadow-sm">
          <div className="mb-6 flex flex-col justify-between gap-3 border-b border-[#454550] pb-5 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#F47725]">
                Market News
              </p>
              <h2 className="text-2xl font-bold text-white">
                Market & Technology Headlines
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                Language filter: {getLanguageLabel(newsLanguagePreference)}
              </p>
            </div>

            <Link
              href="/news-ai"
              className="text-sm font-semibold text-[#ffb17a] hover:text-[#F47725]"
            >
              Search News + AI →
            </Link>
          </div>

          {errorMessage && (
            <div className="mb-5 rounded-2xl border border-[#EA002C]/20 bg-[#EA002C]/10 p-6 text-red-200">
              {errorMessage}
            </div>
          )}

          {loadingNews && (
            <div className="rounded-2xl bg-[#26262C] p-8 text-center text-zinc-400">
              Loading market-related news...
            </div>
          )}

          {!loadingNews && !errorMessage && marketArticles.length === 0 && (
            <div className="rounded-2xl bg-[#26262C] p-8 text-center">
              <h3 className="text-xl font-bold text-white">
                No market news for selected language
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Try changing your language preference in My Topics or wait for
                the next daily collection job.
              </p>
            </div>
          )}

          {!loadingNews && marketArticles.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {marketArticles.map((article) => {
                const display = getMarketArticleDisplay(
                  article,
                  newsLanguagePreference
                );

                return (
                  <Link
                    key={article.id}
                    href={`/brief-article/${article.id}`}
                    className="group grid gap-4 rounded-2xl border border-[#454550] bg-[#26262C] p-5 transition hover:-translate-y-0.5 hover:border-[#F47725]/70 hover:bg-[#383843] md:grid-cols-[160px_1fr]"
                  >
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt=""
                        className="h-32 w-full rounded-xl object-cover md:h-full"
                      />
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center rounded-xl bg-[#303039] text-sm font-semibold text-zinc-500 md:h-full">
                        No Image
                      </div>
                    )}

                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#F47725]/30 bg-[#F47725]/10 px-3 py-1 text-xs font-bold text-[#ffb17a]">
                          {article.topic}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                            article.is_ai_processed
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-[#454550] bg-[#303039] text-zinc-400"
                          }`}
                        >
                          {article.is_ai_processed && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          )}
                          {article.is_ai_processed
                            ? "AI Processed"
                            : "Collected"}
                        </span>
                      </div>

                      <h3 className="line-clamp-2 text-lg font-bold leading-snug text-white group-hover:text-[#ffb17a]">
                        {display.title}
                      </h3>

                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                        {display.summary}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-[#454550] pt-3 text-xs text-zinc-500">
                        <span className="truncate">{article.source}</span>
                        <span>Score {article.importance_score}/10</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
