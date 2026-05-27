"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type SavedBriefArticle = {
  id: string;
  originalTitle: string;
  polishedTitle: string;
  topic: string;
  summary: string;
  importanceScore: number;
  reason: string;
  source: string;
  publishedAt: string;
  originalUrl: string;
  image: string;
};

export default function GeneratedBriefPage() {
  const [articles, setArticles] = useState<SavedBriefArticle[]>([]);

  useEffect(() => {
    const rawArticles = window.localStorage.getItem("dailyBriefArticles");
    const savedArticles: SavedBriefArticle[] = rawArticles
      ? JSON.parse(rawArticles)
      : [];

    const sortedArticles = savedArticles.sort(
      (a, b) => b.importanceScore - a.importanceScore
    );

    setArticles(sortedArticles);
  }, []);

  function clearBrief() {
    window.localStorage.removeItem("dailyBriefArticles");
    setArticles([]);
  }

  const groupedArticles = articles.reduce<Record<string, SavedBriefArticle[]>>(
    (groups, article) => {
      if (!groups[article.topic]) {
        groups[article.topic] = [];
      }

      groups[article.topic].push(article);
      return groups;
    },
    {}
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/news-ai"
          className="mb-8 inline-block text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to News + AI
        </Link>

        <div className="mb-8 rounded-3xl bg-gradient-to-r from-blue-600 to-cyan-500 p-8 shadow-xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-blue-100">
            Generated Newsletter
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Generated Daily Brief
          </h1>
          <p className="max-w-2xl text-blue-50">
            This page shows real news articles that were processed with Gemini
            and saved for today&apos;s email brief.
          </p>
        </div>

        <div className="mb-8 flex flex-col justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold">
              {articles.length} Saved Articles
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Stored locally in your browser for this free demo.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
                href="/generated-email"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-200"
            >
                View Email Preview
            </Link>

            <Link
                href="/news-ai"
                className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
                Add More Articles
            </Link>

            <button
                type="button"
                onClick={clearBrief}
                className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400"
            >
                Clear Brief
            </button>
          </div>
        </div>

        {articles.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
            <h2 className="text-2xl font-semibold">No articles saved yet</h2>
            <p className="mt-3 text-slate-400">
              Go to News + AI, search real news, process an article with Gemini,
              then save it to the daily brief.
            </p>

            <Link
              href="/news-ai"
              className="mt-6 inline-block rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400"
            >
              Go to News + AI
            </Link>
          </div>
        )}

        <div className="space-y-10">
          {Object.entries(groupedArticles).map(([topic, topicArticles]) => (
            <section key={topic}>
              <div className="mb-4 border-b border-slate-800 pb-3">
                <h2 className="text-2xl font-bold">{topic}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {topicArticles.length} article
                  {topicArticles.length === 1 ? "" : "s"} selected
                </p>
              </div>

              <div className="space-y-5">
                {topicArticles.map((article) => (
                  <article
                    key={article.originalUrl}
                    className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-lg"
                  >
                    {article.image && (
                      <img
                        src={article.image}
                        alt=""
                        className="h-56 w-full object-cover"
                      />
                    )}

                    <div className="p-6">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                          {article.topic}
                        </span>

                        <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                          Score {article.importanceScore}/10
                        </span>
                      </div>

                      <h3 className="mb-3 text-2xl font-semibold leading-snug">
                        {article.polishedTitle}
                      </h3>

                      <p className="mb-5 text-sm leading-6 text-slate-300">
                        {article.summary}
                      </p>

                      <div className="mb-5 rounded-2xl bg-slate-950 p-5">
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                          Why This Matters
                        </p>
                        <p className="text-sm leading-6 text-slate-300">
                          {article.reason}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-5 text-sm">
                        <div className="text-slate-400">
                          <p>Source: {article.source}</p>
                          <p>
                            Published:{" "}
                            {new Date(article.publishedAt).toLocaleString()}
                          </p>
                        </div>

                        <a
                          href={article.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
                        >
                          Original Article
                        </a>
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