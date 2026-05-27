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

type BriefArticlePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function BriefArticlePage({ params }: BriefArticlePageProps) {
  const [articleId, setArticleId] = useState("");
  const [article, setArticle] = useState<ProcessedArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setArticleId(resolvedParams.id);
    }

    loadParams();
  }, [params]);

  useEffect(() => {
    if (!articleId) return;

    loadArticle(articleId);
  }, [articleId]);

  async function loadArticle(id: string) {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("processed_articles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      setArticle(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load article."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to Home
        </Link>

        {loading && <p className="text-slate-400">Loading article...</p>}

        {errorMessage && (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-red-200">
            <h1 className="text-2xl font-semibold">Article Error</h1>
            <p className="mt-3">{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && article && (
          <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-xl">
            {article.image_url && (
              <img
                src={article.image_url}
                alt=""
                className="h-72 w-full object-cover"
              />
            )}

            <div className="p-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300">
                  {article.topic}
                </span>

                <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                  Score {article.importance_score}/10
                </span>
              </div>

              <h1 className="mb-5 text-4xl font-bold leading-tight">
                {article.polished_title}
              </h1>

              <div className="mb-8 text-sm text-slate-400">
                <p>Source: {article.source}</p>
                <p>
                  Published:{" "}
                  {new Date(article.published_at).toLocaleString()}
                </p>
              </div>

              <section className="mb-6 rounded-2xl bg-slate-950 p-5">
                <h2 className="mb-3 text-lg font-semibold">AI Summary</h2>
                <p className="leading-7 text-slate-300">{article.summary}</p>
              </section>

              <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="mb-3 text-lg font-semibold">
                  Why This Matters
                </h2>
                <p className="leading-7 text-slate-300">{article.reason}</p>
              </section>

              <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h2 className="mb-3 text-lg font-semibold">Original Title</h2>
                <p className="leading-7 text-slate-300">
                  {article.original_title}
                </p>
              </section>

              <a
                href={article.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-xl bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400"
              >
                Open Original Article
              </a>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}