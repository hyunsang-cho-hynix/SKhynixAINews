"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

type NewsLanguagePreference = "en" | "ko" | "both";

type ProcessedArticle = {
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
};

function normalizeLanguagePreference(value: string | null | undefined) {
  if (value === "ko" || value === "both") {
    return value;
  }

  return "en";
}

function getArticleDisplay(
  article: ProcessedArticle,
  language: NewsLanguagePreference
) {
  if (language === "ko") {
    return {
      title: article.polished_title_ko || article.polished_title,
      summary: article.summary_ko || article.summary,
      reason: article.reason_ko || article.reason,
      showKoreanBlock: false,
    };
  }

  if (language === "both") {
    return {
      title: article.polished_title,
      summary: article.summary,
      reason: article.reason,
      koreanTitle: article.polished_title_ko,
      koreanSummary: article.summary_ko,
      koreanReason: article.reason_ko,
      showKoreanBlock:
        Boolean(article.polished_title_ko) ||
        Boolean(article.summary_ko) ||
        Boolean(article.reason_ko),
    };
  }

  return {
    title: article.polished_title,
    summary: article.summary,
    reason: article.reason,
    showKoreanBlock: false,
  };
}

export default function BriefArticlePage() {
  const params = useParams();
  const articleId = params.id as string;

  const [article, setArticle] = useState<ProcessedArticle | null>(null);
  const [newsLanguagePreference, setNewsLanguagePreference] =
    useState<NewsLanguagePreference>("en");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadArticle();
    loadUserPreferences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  async function loadUserPreferences() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setNewsLanguagePreference("en");
        return;
      }

      const { data, error } = await supabase
        .from("user_topic_preferences")
        .select("news_language_preference")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setNewsLanguagePreference(
        normalizeLanguagePreference(data?.news_language_preference)
      );
    } catch {
      setNewsLanguagePreference("en");
    }
  }

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

      setArticle(data as ProcessedArticle);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load article."
      );
    } finally {
      setLoading(false);
    }
  }

  const display = article
    ? getArticleDisplay(article, newsLanguagePreference)
    : null;

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-8">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Home
        </Link>

        {loading && (
          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-8 text-center">
            <p className="text-zinc-300">Loading article...</p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-[#EA002C]/30 bg-[#EA002C]/10 p-8 text-red-200">
            <h1 className="text-2xl font-bold">Failed to load article</h1>
            <p className="mt-3 text-sm">{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && article && display && (
          <article className="overflow-hidden rounded-2xl border border-[#454550] bg-[#303039] shadow-sm">
            {article.image_url && (
              <img
                src={article.image_url}
                alt=""
                className="h-72 w-full object-cover"
              />
            )}

            <div className="h-1 w-full bg-gradient-to-r from-[#EA002C] via-[#F47725] to-[#F8A23A]" />

            <div className="p-6 md:p-8">
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-[#F47725]/30 bg-[#F47725]/10 px-3 py-1 text-xs font-semibold text-[#ffb17a]">
                  {article.topic}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    article.is_ai_processed
                      ? "border border-green-500/30 bg-green-500/10 text-green-300"
                      : "border border-[#454550] bg-[#26262C] text-zinc-400"
                  }`}
                >
                  {article.is_ai_processed ? "AI Processed" : "Collected"}
                </span>

                <span className="rounded-full border border-[#454550] bg-[#26262C] px-3 py-1 text-xs font-semibold text-zinc-400">
                  Score {article.importance_score}/10
                </span>
              </div>

              <h1 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
                {display.title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-zinc-400">
                <span>{article.source}</span>
                <span>•</span>
                <span>
                  {new Date(article.published_at).toLocaleDateString(
                    newsLanguagePreference === "ko" ? "ko-KR" : "en-US"
                  )}
                </span>
              </div>

              <section className="mt-8 rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F47725]">
                  Summary
                </p>

                <p className="text-base leading-8 text-zinc-200">
                  {display.summary}
                </p>
              </section>

              {newsLanguagePreference === "both" && display.showKoreanBlock && (
                <section className="mt-5 rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F47725]">
                    Korean Translation
                  </p>

                  {display.koreanTitle && (
                    <h2 className="mb-3 text-xl font-bold text-white">
                      {display.koreanTitle}
                    </h2>
                  )}

                  {display.koreanSummary && (
                    <p className="text-base leading-8 text-zinc-200">
                      {display.koreanSummary}
                    </p>
                  )}

                  {display.koreanReason && (
                    <div className="mt-5 rounded-xl bg-[#303039] p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        중요 포인트
                      </p>
                      <p className="text-sm leading-7 text-zinc-300">
                        {display.koreanReason}
                      </p>
                    </div>
                  )}
                </section>
              )}

              <section className="mt-5 rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F47725]">
                  {newsLanguagePreference === "ko"
                    ? "중요 포인트"
                    : "Why this matters"}
                </p>

                <p className="text-base leading-8 text-zinc-200">
                  {display.reason}
                </p>
              </section>

              <section className="mt-5 rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F47725]">
                  Original Title
                </p>

                <p className="text-base leading-7 text-zinc-300">
                  {article.original_title}
                </p>
              </section>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={article.original_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d]"
                >
                  Open Original Article
                </a>

                <Link
                  href="/"
                  className="inline-flex rounded-xl border border-[#454550] bg-[#26262C] px-5 py-3 font-semibold text-zinc-200 hover:bg-[#383843]"
                >
                  Back to Brief
                </Link>
              </div>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}