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

type AiResult = {
  polishedTitle: string;
  topic: string;
  summary: string;
  importanceScore: number;
  reason: string;
};

export default function NewsAiPage() {
  const [query, setQuery] = useState("semiconductor AI HBM");
  const [searchLoading, setSearchLoading] = useState(false);
  const [aiLoadingUrl, setAiLoadingUrl] = useState("");
  const [articles, setArticles] = useState<GNewsArticle[]>([]);
  const [aiResults, setAiResults] = useState<Record<string, AiResult>>({});
  const [error, setError] = useState("");

  async function searchNews() {
    setSearchLoading(true);
    setError("");
    setArticles([]);
    setAiResults({});

    try {
      const response = await fetch(
        `/api/news/search?q=${encodeURIComponent(query)}&max=6`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "News search failed.");
      }

      setArticles(data.articles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function processWithGemini(article: GNewsArticle) {
    setAiLoadingUrl(article.url);
    setError("");

    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: article.title,
          description:
            article.description ||
            article.content ||
            "No article description was provided.",
          source: article.source?.name || "Unknown source",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI processing failed.");
      }

      setAiResults((currentResults) => ({
        ...currentResults,
        [article.url]: data.result,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setAiLoadingUrl("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to Home
        </Link>

        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 shadow-xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-100">
            Search News + AI
          </p>

          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Search Real News and Analyze with Gemini
          </h1>

          <p className="max-w-3xl text-blue-50">
            Search public news using GNews, then use Gemini to polish the title,
            classify the topic, summarize the article, and assign an importance
            score.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
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
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
              placeholder="semiconductor AI HBM"
            />

            <button
              type="button"
              onClick={searchNews}
              disabled={searchLoading}
              className="rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searchLoading ? "Searching..." : "Search Real News"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            This uses your GNews free-tier API key. Avoid clicking repeatedly to
            preserve daily request quota.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <h2 className="font-semibold">Error</h2>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        )}

        {articles.length > 0 && (
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">
              Real News Search Results
            </h2>
            <p className="text-sm text-slate-400">
              Click “Process with Gemini” to generate AI summary, topic, score,
              and business relevance.
            </p>
          </div>
        )}

        <div className="grid gap-5">
          {articles.map((article) => {
            const aiResult = aiResults[article.url];
            const isProcessing = aiLoadingUrl === article.url;

            return (
              <article
                key={article.url}
                className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-lg"
              >
                <div className="grid gap-0 md:grid-cols-[280px_1fr]">
                  <div className="bg-slate-950">
                    {article.image ? (
                      <img
                        src={article.image}
                        alt=""
                        className="h-full min-h-56 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full min-h-56 items-center justify-center p-6 text-center text-sm text-slate-500">
                        No image available
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                        Real News Article
                      </span>

                      <span className="text-xs text-slate-500">
                        {new Date(article.publishedAt).toLocaleString()}
                      </span>
                    </div>

                    <h3 className="mb-3 text-2xl font-semibold leading-snug">
                      {article.title}
                    </h3>

                    <p className="mb-5 text-sm leading-6 text-slate-300">
                      {article.description || article.content}
                    </p>

                    <div className="mb-5 text-sm text-slate-400">
                      <p>Source: {article.source?.name || "Unknown source"}</p>
                    </div>

                    <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-5">
                      <button
                        type="button"
                        onClick={() => processWithGemini(article)}
                        disabled={isProcessing}
                        className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isProcessing
                          ? "Processing with Gemini..."
                          : "Process with Gemini"}
                      </button>

                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                      >
                        Open Original
                      </a>
                    </div>

                    {aiResult && (
                      <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <h4 className="text-lg font-semibold text-green-200">
                            Gemini Analysis Result
                          </h4>

                          <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                            Score {aiResult.importanceScore}/10
                          </span>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-green-100/60">
                              Polished Title
                            </p>
                            <p className="mt-1 font-semibold text-green-50">
                              {aiResult.polishedTitle}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-green-100/60">
                              Topic
                            </p>
                            <p className="mt-1 font-semibold text-green-50">
                              {aiResult.topic}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-green-100/60">
                              AI Summary
                            </p>
                            <p className="mt-1 leading-7 text-green-50">
                              {aiResult.summary}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-green-100/60">
                              Why This Matters
                            </p>
                            <p className="mt-1 leading-7 text-green-50">
                              {aiResult.reason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}