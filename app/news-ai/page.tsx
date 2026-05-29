"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type SearchResult = {
  title?: string;
  polishedTitle?: string;
  summary?: string;
  reason?: string;
  source?: string;
  url?: string;
  publishedAt?: string;
  topic?: string;
  importanceScore?: number;
};

export default function NewsAIPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    setErrorMessage("");
    setSearched(true);

    if (!query.trim()) {
      setErrorMessage("Please enter a search query.");
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const response = await fetch("/api/news-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to search news.");
      }

      const searchResults =
        data.results || data.articles || data.processedArticles || [];

      setResults(searchResults);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to search news."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      handleSearch();
    }
  }

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-8">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Home
        </Link>

        <div className="mb-6 overflow-hidden rounded-2xl border border-[#454550] bg-[#303039] shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[#EA002C] via-[#F47725] to-[#F8A23A]" />

          <div className="p-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F47725]">
              Search News + AI
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Search Public Technology News
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              Search semiconductor, AI, IT, automation, robotics, and technology
              news. AI can help summarize and identify why each story matters.
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-[#454550] bg-[#303039] p-6 shadow-sm">
          <label
            htmlFor="newsSearch"
            className="mb-2 block text-sm font-semibold text-zinc-200"
          >
            Search Query
          </label>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              id="newsSearch"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Example: HBM, SK hynix, AI data center, semiconductor packaging"
              className="flex-1 rounded-xl border border-[#454550] bg-[#26262C] px-4 py-3 text-white placeholder:text-zinc-500 outline-none focus:border-[#F47725]"
            />

            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          <p className="mt-3 text-xs text-zinc-400">
            Results depend on the available news API and current rate limits.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-[#EA002C]/30 bg-[#EA002C]/10 p-5 text-red-200">
            <h2 className="font-semibold">Search Error</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-8 text-center">
            <p className="text-zinc-300">Searching and analyzing news...</p>
          </div>
        )}

        {!loading && searched && !errorMessage && results.length === 0 && (
          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-8 text-center">
            <h2 className="text-2xl font-semibold text-white">
              No results found
            </h2>

            <p className="mt-3 text-zinc-300">
              Try a broader keyword such as semiconductor, AI chip, HBM, data
              center, or cloud infrastructure.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">Search Results</h2>
              <p className="text-sm text-zinc-400">
                AI-assisted summaries for your search query
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {results.map((article, index) => {
                const title =
                  article.polishedTitle || article.title || "Untitled Article";

                const summary =
                  article.summary ||
                  "No summary is available for this article.";

                const reason =
                  article.reason ||
                  "This article may be relevant to the searched technology topic.";

                return (
                  <article
                    key={`${article.url || title}-${index}`}
                    className="rounded-2xl border border-[#454550] bg-[#303039] p-5 shadow-sm transition hover:border-[#F47725]/70 hover:bg-[#383843]"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full border border-[#F47725]/30 bg-[#F47725]/10 px-3 py-1 text-xs font-semibold text-[#ffb17a]">
                        {article.topic || "Technology"}
                      </span>

                      <span className="rounded-full border border-[#F47725]/30 bg-[#F47725]/10 px-3 py-1 text-xs font-semibold text-[#ffb17a]">
                        AI Assisted
                      </span>
                    </div>

                    {typeof article.importanceScore === "number" && (
                      <p className="mb-3 text-xs text-zinc-400">
                        Score {article.importanceScore}/10
                      </p>
                    )}

                    <h3 className="mb-3 line-clamp-2 text-lg font-bold leading-snug text-white">
                      {title}
                    </h3>

                    <p className="mb-4 line-clamp-3 text-sm leading-6 text-zinc-300">
                      {summary}
                    </p>

                    <div className="mb-4 rounded-xl bg-[#26262C] p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        Why this matters
                      </p>

                      <p className="line-clamp-3 text-sm leading-6 text-zinc-300">
                        {reason}
                      </p>
                    </div>

                    <div className="border-t border-[#454550] pt-4 text-sm text-zinc-400">
                      <p className="truncate">
                        {article.source || "Unknown source"}
                      </p>

                      {article.publishedAt && (
                        <p>{new Date(article.publishedAt).toLocaleDateString()}</p>
                      )}
                    </div>

                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex rounded-xl bg-[#F47725] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff8a3d]"
                      >
                        Open Original Article
                      </a>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}