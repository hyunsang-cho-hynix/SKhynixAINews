"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

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

export default function NewsTestPage() {
  const [query, setQuery] = useState("semiconductor AI HBM");
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<GNewsArticle[]>([]);
  const [error, setError] = useState("");

  async function searchNews() {
    setLoading(true);
    setError("");
    setArticles([]);

    try {
      const response = await fetch(
        `/api/news/search?q=${encodeURIComponent(query)}&max=10`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "News search failed.");
      }

      setArticles(data.articles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Home
        </Link>

        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 shadow-xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-100">
            Real News API Test
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Search Real Public News with GNews
          </h1>
          <p className="max-w-2xl text-blue-50">
            This page uses the GNews API free tier to fetch real public news
            articles, then displays them in card format.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-[#454550] bg-[#303039] p-6">
          <label
            htmlFor="query"
            className="mb-2 block text-sm font-semibold text-slate-200"
          >
            Search Query
          </label>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              id="query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="flex-1 rounded-xl border border-[#454550] bg-[#26262C] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
              placeholder="semiconductor AI HBM"
            />

            <button
              type="button"
              onClick={searchNews}
              disabled={loading}
              className="rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search News"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Free tier limit is limited, so avoid clicking repeatedly.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <h2 className="font-semibold">News API Error</h2>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        )}

        {articles.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">Search Results</h2>
            <p className="text-sm text-slate-400">
              Real articles returned from GNews
            </p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          {articles.map((article) => (
            <article
              key={article.url}
              className="overflow-hidden rounded-2xl border border-[#454550] bg-[#303039] shadow-lg"
            >
              {article.image && (
                <img
                  src={article.image}
                  alt=""
                  className="h-48 w-full object-cover"
                />
              )}

              <div className="p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <span className="rounded-full bg-[#F47725]/20 px-3 py-1 text-xs font-semibold text-[#ffb17a]">
                    Real News
                  </span>

                  <span className="text-xs text-slate-500">
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="mb-3 text-xl font-semibold leading-snug">
                  {article.title}
                </h3>

                <p className="mb-5 text-sm leading-6 text-slate-300">
                  {article.description}
                </p>

                <div className="flex items-center justify-between border-t border-[#454550] pt-4 text-sm">
                  <div className="text-slate-400">
                    <p>{article.source?.name}</p>
                  </div>

                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-[#F47725] px-4 py-2 font-semibold text-white hover:bg-[#ff8a3d]"
                  >
                    Original
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}