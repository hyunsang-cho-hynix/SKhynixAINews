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

type TopicPageProps = {
  params: Promise<{
    topic: string;
  }>;
};

function formatTopic(slug: string) {
  const decodedSlug = decodeURIComponent(slug);

  const topicMap: Record<string, string> = {
    semiconductor: "Semiconductor",
    ai: "AI",
    "sk-hynix-memory-industry": "SK hynix / Memory Industry",
    automation: "Automation",
    robotics: "Robotics",
    it: "IT",
    cloud: "Cloud",
    cybersecurity: "Cybersecurity",
    "data-center": "Data Center",
    manufacturing: "Manufacturing",
  };

  return (
    topicMap[decodedSlug.toLowerCase()] ||
    decodedSlug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

export default function TopicPage({ params }: TopicPageProps) {
  const [topicName, setTopicName] = useState("");
  const [articles, setArticles] = useState<ProcessedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      const formattedTopic = formatTopic(resolvedParams.topic);
      setTopicName(formattedTopic);
      loadArticles(formattedTopic);
    }

    loadParams();
  }, [params]);

  async function loadArticles(topic: string) {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("processed_articles")
        .select("*")
        .eq("topic", topic)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        throw error;
      }

      setArticles(data || []);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load topic articles."
      );
    } finally {
      setLoading(false);
    }
  }

  const topArticles = [...articles].sort(
    (a, b) => b.importance_score - a.importance_score
  );

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
            Topic
          </p>

          <h1 className="text-4xl font-bold">{topicName}</h1>

          <p className="mt-3 max-w-2xl text-blue-50">
            AI-curated public news articles related to {topicName}.
          </p>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Topic</p>
            <p className="mt-2 text-2xl font-bold">{topicName}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Saved Articles</p>
            <p className="mt-2 text-3xl font-bold">{articles.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Source</p>
            <p className="mt-2 text-2xl font-bold">Supabase</p>
          </div>
        </div>

        {loading && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-400">Loading topic articles...</p>
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
            <h2 className="text-2xl font-semibold">
              No articles found for {topicName}
            </h2>
            <p className="mt-3 text-slate-400">
              Run the daily brief job from Admin or process articles with News +
              AI. Articles saved to this topic will appear here.
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
                Go to News + AI
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

                  <h2 className="mb-3 text-xl font-semibold leading-snug">
                    {article.polished_title}
                  </h2>

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