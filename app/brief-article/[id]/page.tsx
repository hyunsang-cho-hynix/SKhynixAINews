"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

type Article = {
  id: string;
  topic: string;
  original_title: string;
  polished_title: string;
  polished_title_ko: string | null;
  summary: string;
  summary_ko: string | null;
  importance_score: number;
  reason: string;
  reason_ko: string | null;
  source: string;
  published_at: string;
  original_url: string;
  image_url: string | null;
  created_at: string;
  is_ai_processed: boolean;
  ai_processed_at: string | null;
  original_language: string | null;
};

function getImportanceLevel(score: number) {
  if (score >= 8) {
    return {
      label: "High Importance",
      color: "text-red-300",
      badge: "bg-red-500/10 border-red-500/30 text-red-300",
    };
  }

  if (score >= 6) {
    return {
      label: "Medium Importance",
      color: "text-[#ffb17a]",
      badge: "bg-[#F47725]/10 border-[#F47725]/30 text-[#ffb17a]",
    };
  }

  return {
    label: "Monitoring",
    color: "text-zinc-300",
    badge: "bg-zinc-500/10 border-zinc-500/30 text-zinc-300",
  };
}

function getImportanceCriteria(article: Article) {
  const criteria = [
    {
      title: "Strategic relevance",
      description:
        "How closely this article relates to semiconductor, AI infrastructure, memory, cloud, automation, or enterprise technology trends.",
    },
    {
      title: "Industry impact",
      description:
        "Whether the article may affect major customers, suppliers, competitors, or the broader technology ecosystem.",
    },
    {
      title: "Company / market signal",
      description:
        "Whether the article mentions major players such as SK hynix, NVIDIA, Microsoft, Apple, Samsung, TSMC, Intel, AMD, or Micron.",
    },
    {
      title: "Recency and clarity",
      description:
        "Recent articles with clear business or technical implications are ranked higher than vague or low-signal articles.",
    },
  ];

  if (article.is_ai_processed) {
    criteria.unshift({
      title: "AI processed",
      description:
        "This article was selected for AI summarization, translation, and importance scoring based on topic relevance and source content.",
    });
  }

  return criteria;
}

export default function BriefArticlePage() {
  const params = useParams();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [showKorean, setShowKorean] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  async function loadArticle() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("processed_articles")
        .select("*")
        .eq("id", articleId)
        .single();

      if (error) {
        throw error;
      }

      setArticle(data as Article);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load article."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleTranslateToKorean() {
    if (!article) {
      return;
    }

    if (article.polished_title_ko && article.summary_ko && article.reason_ko) {
      setShowKorean(true);
      return;
    }

    setTranslating(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/articles/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          articleId: article.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to translate article.");
      }

      setArticle({
        ...article,
        polished_title_ko: data.article.polished_title_ko,
        summary_ko: data.article.summary_ko,
        reason_ko: data.article.reason_ko,
      });

      setShowKorean(true);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to translate article."
      );
    } finally {
      setTranslating(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#26262C] text-white">
        <Navbar />
        <section className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-zinc-400">Loading article...</p>
        </section>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="min-h-screen bg-[#26262C] text-white">
        <Navbar />
        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-8">
            <h1 className="text-2xl font-bold">Article not found</h1>
            <p className="mt-2 text-zinc-400">
              The requested article could not be loaded.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const importance = getImportanceLevel(article.importance_score);
  const criteria = getImportanceCriteria(article);

  const title =
    showKorean && article.polished_title_ko
      ? article.polished_title_ko
      : article.polished_title;

  const summary =
    showKorean && article.summary_ko ? article.summary_ko : article.summary;

  const reason =
    showKorean && article.reason_ko ? article.reason_ko : article.reason;

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

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <article className="overflow-hidden rounded-2xl border border-[#454550] bg-[#303039] shadow-sm">
            {article.image_url && (
              <img
                src={article.image_url}
                alt=""
                className="h-72 w-full object-cover"
              />
            )}

            <div className="p-7">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#F47725]/30 bg-[#F47725]/10 px-3 py-1 text-xs font-bold text-[#ffb17a]">
                  {article.topic}
                </span>

                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${importance.badge}`}
                >
                  {importance.label}
                </span>

                {article.is_ai_processed && (
                  <span className="rounded-full border border-[#F47725]/30 bg-[#F47725]/10 px-3 py-1 text-xs font-bold text-[#ffb17a]">
                    AI Processed
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                {title}
              </h1>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                <span>{article.source}</span>
                <span>·</span>
                <span>
                  {new Date(article.published_at).toLocaleDateString()}
                </span>
                <span>·</span>
                <span>Score {article.importance_score}/10</span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {!showKorean ? (
                  <button
                    type="button"
                    onClick={handleTranslateToKorean}
                    disabled={translating}
                    className="rounded-xl bg-[#F47725] px-4 py-2 text-sm font-bold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {translating ? "Translating..." : "View Korean Translation"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowKorean(false)}
                    className="rounded-xl border border-[#454550] bg-[#26262C] px-4 py-2 text-sm font-bold text-zinc-200 hover:border-[#F47725] hover:text-[#ffb17a]"
                  >
                    Back to English
                  </button>
                )}

                <a
                  href={article.original_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-[#454550] bg-[#26262C] px-4 py-2 text-sm font-bold text-zinc-200 hover:border-[#F47725] hover:text-[#ffb17a]"
                >
                  Open Original Article
                </a>
              </div>

              <section className="mt-8">
                <h2 className="mb-3 text-xl font-bold text-white">
                  {showKorean ? "요약" : "Summary"}
                </h2>
                <p className="text-base leading-8 text-zinc-300">{summary}</p>
              </section>

              <section className="mt-8 rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                  {showKorean ? "중요 포인트" : "Why this matters"}
                </p>
                <p className="text-sm leading-7 text-zinc-300">{reason}</p>
              </section>
            </div>
          </article>

          <aside className="space-y-5">
            <section className="rounded-2xl border border-[#454550] bg-[#303039] p-5 shadow-sm">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#F47725]">
                Importance Score
              </p>

              <div className="flex items-end gap-2">
                <span className={`text-5xl font-bold ${importance.color}`}>
                  {article.importance_score}
                </span>
                <span className="mb-2 text-lg font-semibold text-zinc-400">
                  / 10
                </span>
              </div>

              <p className="mt-3 text-sm font-semibold text-white">
                {importance.label}
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#26262C]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#EA002C] to-[#F47725]"
                  style={{
                    width: `${Math.min(
                      Math.max(article.importance_score * 10, 0),
                      100
                    )}%`,
                  }}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-[#454550] bg-[#303039] p-5 shadow-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#F47725]">
                Scoring Criteria
              </p>

              <div className="space-y-4">
                {criteria.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-xl border border-[#454550] bg-[#26262C] p-4"
                  >
                    <h3 className="text-sm font-bold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-zinc-400">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-xs leading-5 text-zinc-500">
                Current score explanation is based on the article topic,
                detected industry relevance, major-company signals, recency,
                and AI-generated reasoning. A detailed score breakdown can be
                stored separately later.
              </p>
            </section>

            <section className="rounded-2xl border border-[#454550] bg-[#303039] p-5 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#F47725]">
                Article Metadata
              </p>

              <div className="space-y-3 text-sm text-zinc-400">
                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Source
                  </p>
                  <p className="text-zinc-200">{article.source}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Original Language
                  </p>
                  <p className="text-zinc-200">
                    {article.original_language || "en"}
                  </p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-zinc-500">
                    Published
                  </p>
                  <p className="text-zinc-200">
                    {new Date(article.published_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}