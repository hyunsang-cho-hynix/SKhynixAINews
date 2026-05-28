"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

type ProcessedArticle = {
  id: string;
  topic: string;
  original_title: string;
  polished_title: string;
  summary: string;
  importance_score: number;
  reason: string;
  source: string;
  published_at: string;
  original_url: string;
  image_url: string | null;
  created_at: string;
};

const topics = [
  "All",
  "Semiconductor",
  "AI",
  "SK hynix / Memory Industry",
  "Automation",
  "Robotics",
  "IT",
];

export default function Home() {
  const [articles, setArticles] = useState<ProcessedArticle[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("processed_articles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) {
        throw error;
      }

      setArticles(data || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load articles."
      );
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "2-digit",
    day: "2-digit",
  });

  const filteredArticles =
    selectedTopic === "All"
      ? articles
      : articles.filter((article) => article.topic === selectedTopic);

  const topArticles = [...filteredArticles]
    .sort((a, b) => b.importance_score - a.importance_score)
    .slice(0, 15);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-5 flex flex-col justify-between gap-3 border-b border-slate-300 pb-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-slate-500">{today}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Today&apos;s Technology Brief
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/subscribe"
              className="rounded-lg bg-slate-950 px-4 py-2 font-semibold text-white hover:bg-slate-800"
            >
              Subscribe
            </Link>

            <Link
              href="/news-ai"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-800 hover:bg-slate-50"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              Search News + AI
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 px-6 py-5 text-white shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-100">
            SK hynix AI News
          </p>

          <h2 className="max-w-4xl text-2xl font-bold tracking-tight md:text-3xl">
            Semiconductor, AI, and Technology News Brief
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-50 md:text-base">
            Public technology news organized by topic, summarized with AI, and
            prepared for daily email briefings.
          </p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setSelectedTopic(topic)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedTopic === topic
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Top Articles Today</h2>
            <p className="text-sm text-slate-500">
              Ranked by AI-generated importance score
            </p>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-500">Loading AI-curated articles...</p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
            <h2 className="text-xl font-semibold">Failed to load articles</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && topArticles.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-2xl font-semibold">No processed articles yet</h2>
            <p className="mt-3 text-slate-500">
              Run the daily news job from Admin, or use Search News + AI to
              analyze real news.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/admin"
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500"
              >
                Go to Admin
              </Link>

              <Link
                href="/news-ai"
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50"
              >
                Search News + AI
              </Link>
            </div>
          </div>
        )}

        {!loading && !errorMessage && topArticles.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topArticles.map((article) => (
              <article
                key={article.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                {article.image_url && (
                  <img
                    src={article.image_url}
                    alt=""
                    className="h-40 w-full object-cover"
                  />
                )}

                <div className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {article.topic}
                    </span>

                    <span className="text-xs text-slate-400">
                      Score {article.importance_score}/10
                    </span>
                  </div>

                  <h3 className="mb-3 line-clamp-2 text-lg font-bold leading-snug text-slate-950">
                    {article.polished_title}
                  </h3>

                  <p className="mb-4 line-clamp-3 text-sm leading-6 text-slate-600">
                    {article.summary}
                  </p>

                  <div className="mb-4 rounded-xl bg-slate-50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Why this matters
                    </p>
                    <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                      {article.reason}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-4 text-sm">
                    <div className="min-w-0 text-slate-500">
                      <p className="truncate">{article.source}</p>
                      <p>{new Date(article.published_at).toLocaleDateString()}</p>
                    </div>

                    <Link
                      href={`/brief-article/${article.id}`}
                      className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Read
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}