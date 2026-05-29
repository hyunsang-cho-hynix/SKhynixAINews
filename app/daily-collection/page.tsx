"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type CollectedArticle = {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  assignedTopic: string;
  source: {
    name: string;
    url: string;
  };
};

export default function DailyCollectionPage() {
  const [loading, setLoading] = useState(false);
  const [articles, setArticles] = useState<CollectedArticle[]>([]);
  const [error, setError] = useState("");

  async function runDailyCollection() {
    setLoading(true);
    setError("");
    setArticles([]);

    try {
      const response = await fetch("/api/news/daily-collection");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Daily collection failed.");
      }

      setArticles(data.articles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const groupedArticles = articles.reduce<Record<string, CollectedArticle[]>>(
    (groups, article) => {
      if (!groups[article.assignedTopic]) {
        groups[article.assignedTopic] = [];
      }

      groups[article.assignedTopic].push(article);
      return groups;
    },
    {}
  );

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
            Daily News Collection
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Collect Real News by Topic
          </h1>
          <p className="max-w-3xl text-blue-50">
            This page runs real GNews searches across predefined technology
            topics and groups the collected public articles for the daily brief.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-[#454550] bg-[#303039] p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-xl font-semibold">
                Run Topic-Based Collection
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Searches Semiconductor, AI, Automation, Robotics, and IT using
                your GNews free-tier API key.
              </p>
            </div>

            <button
              type="button"
              onClick={runDailyCollection}
              disabled={loading}
              className="rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Collecting News..." : "Run Daily Collection"}
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            This uses multiple GNews requests, so avoid clicking repeatedly on
            the free tier.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <h2 className="font-semibold">Collection Error</h2>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        )}

        {articles.length > 0 && (
          <div className="mb-8 grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-[#454550] bg-[#303039] p-5">
              <p className="text-sm text-slate-400">Total Articles</p>
              <p className="mt-2 text-3xl font-bold">{articles.length}</p>
            </div>

            <div className="rounded-2xl border border-[#454550] bg-[#303039] p-5">
              <p className="text-sm text-slate-400">Topics Collected</p>
              <p className="mt-2 text-3xl font-bold">
                {Object.keys(groupedArticles).length}
              </p>
            </div>

            <div className="rounded-2xl border border-[#454550] bg-[#303039] p-5">
              <p className="text-sm text-slate-400">Next Step</p>
              <p className="mt-2 text-lg font-semibold text-[#ffb17a]">
                Process with Gemini
              </p>
            </div>
          </div>
        )}

        <div className="space-y-10">
          {Object.entries(groupedArticles).map(([topic, topicArticles]) => (
            <section key={topic}>
              <div className="mb-4 border-b border-[#454550] pb-3">
                <h2 className="text-2xl font-bold">{topic}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {topicArticles.length} real public news articles collected
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {topicArticles.map((article) => (
                  <article
                    key={article.url}
                    className="overflow-hidden rounded-3xl border border-[#454550] bg-[#303039] shadow-lg"
                  >
                    {article.image && (
                      <img
                        src={article.image}
                        alt=""
                        className="h-48 w-full object-cover"
                      />
                    )}

                    <div className="p-6">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-full bg-[#F47725]/20 px-3 py-1 text-xs font-semibold text-[#ffb17a]">
                          {article.assignedTopic}
                        </span>

                        <span className="text-xs text-slate-500">
                          {new Date(article.publishedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="mb-3 text-xl font-semibold leading-snug">
                        {article.title}
                      </h3>

                      <p className="mb-5 text-sm leading-6 text-slate-300">
                        {article.description || article.content}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#454550] pt-5 text-sm">
                        <div className="text-slate-400">
                          <p>{article.source?.name || "Unknown source"}</p>
                        </div>

                        <div className="flex gap-3">
                          <Link
                            href={`/news-ai?query=${encodeURIComponent(
                              article.title
                            )}`}
                            className="rounded-lg bg-[#F47725] px-4 py-2 font-semibold text-white hover:bg-[#ff8a3d]"
                          >
                            Process in News + AI
                          </Link>

                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-[#454550] px-4 py-2 font-semibold text-slate-200 hover:bg-slate-800"
                          >
                            Original
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}