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
        .limit(30);

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

  const filteredArticles =
    selectedTopic === "All"
      ? articles
      : articles.filter((article) => article.topic === selectedTopic);

  const topArticles = [...filteredArticles]
    .sort((a, b) => b.importance_score - a.importance_score)
    .slice(0, 12);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-10 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 shadow-xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-100">
            SK hynix AI News
          </p>

          <h1 className="mb-4 max-w-4xl text-4xl font-bold tracking-tight md:text-5xl">
            Daily Semiconductor, AI, and Technology News Brief
          </h1>

          <p className="mb-6 max-w-3xl text-lg leading-8 text-blue-50">
            Browse AI-curated public technology news by topic, or subscribe to
            receive a daily email briefing every morning.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/subscribe"
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
              Subscribe to Daily Brief
            </Link>

            <Link
              href="/news-ai"
              className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"
            >
              Search News + AI
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">News Sources</p>
            <p className="mt-2 text-2xl font-bold">Public Web</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">AI Processing</p>
            <p className="mt-2 text-2xl font-bold">Gemini</p>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setSelectedTopic(topic)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedTopic === topic
                  ? "border-blue-400 bg-blue-500 text-white"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Top Articles Today</h2>
          <p className="text-sm text-slate-400">
            AI-processed technology news organized into article cards
          </p>
        </div>

        {loading && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">Loading AI-curated articles...</p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-red-200">
            <h2 className="text-xl font-semibold">Failed to load articles</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && topArticles.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h2 className="text-2xl font-semibold">No processed articles yet</h2>
            <p className="mt-3 text-slate-400">
              Run the daily brief job from the Admin page, or use Search News +
              AI to analyze real news.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/admin"
                className="rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400"
              >
                Go to Admin
              </Link>

              <Link
                href="/news-ai"
                className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-800"
              >
                Search News + AI
              </Link>
            </div>
          </div>
        )}

        {!loading && !errorMessage && topArticles.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {topArticles.map((article) => (
              <article
                key={article.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg"
              >
                {article.image_url && (
                  <img
                    src={article.image_url}
                    alt=""
                    className="h-48 w-full object-cover"
                  />
                )}

                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                      {article.topic}
                    </span>

                    <span className="text-xs text-slate-500">
                      Score {article.importance_score}/10
                    </span>
                  </div>

                  <h3 className="mb-3 text-xl font-semibold leading-snug">
                    {article.polished_title}
                  </h3>

                  <p className="mb-5 text-sm leading-6 text-slate-300">
                    {article.summary}
                  </p>

                  <div className="mb-5 rounded-2xl bg-slate-950 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Why this matters
                    </p>
                    <p className="text-sm leading-6 text-slate-300">
                      {article.reason}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4 text-sm">
                    <div className="text-slate-400">
                      <p>{article.source}</p>
                      <p>{new Date(article.published_at).toLocaleString()}</p>
                    </div>

                    <Link
                      href={`/brief-article/${article.id}`}
                      className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
                    >
                      Read Brief
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