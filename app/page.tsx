"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

const topics = [
  "All",
  "Semiconductor",
  "AI",
  "SK hynix / Memory Industry",
  "Automation",
  "Robotics",
  "IT",
  "Cloud",
];

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

export default function Home() {
  const [articles, setArticles] = useState<ProcessedArticle[]>([]);
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [newsLanguagePreference, setNewsLanguagePreference] =
    useState<NewsLanguagePreference>("en");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadArticles();
    loadUserPreferences();
  }, []);

  async function loadUserPreferences() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setIsSubscribed(false);
        setNewsLanguagePreference("en");
        return;
      }

      const { data, error } = await supabase
        .from("user_topic_preferences")
        .select("is_subscribed, news_language_preference")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setIsSubscribed(Boolean(data?.is_subscribed));
      setNewsLanguagePreference(
        normalizeLanguagePreference(data?.news_language_preference)
      );
    } catch {
      setIsSubscribed(false);
      setNewsLanguagePreference("en");
    }
  }

  async function loadArticles() {
    setLoading(true);
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("processed_articles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(90);

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

  const today = new Date().toLocaleDateString(
    newsLanguagePreference === "ko" ? "ko-KR" : "en-US",
    {
      weekday: "short",
      month: "2-digit",
      day: "2-digit",
    }
  );

  const filteredArticles =
    selectedTopic === "All"
      ? articles
      : articles.filter((article) => article.topic === selectedTopic);

  const topArticles = [...filteredArticles]
    .sort((a, b) => {
      if (a.is_ai_processed !== b.is_ai_processed) {
        return Number(b.is_ai_processed) - Number(a.is_ai_processed);
      }

      return b.importance_score - a.importance_score;
    })
    .slice(0, 18);

  const pageTitle =
    newsLanguagePreference === "ko"
      ? "오늘의 기술 뉴스 브리프"
      : "Today's Technology Brief";

  const sectionTitle =
    newsLanguagePreference === "ko" ? "오늘의 주요 기사" : "Top Articles Today";

  const sectionDescription =
    newsLanguagePreference === "ko"
      ? "AI 처리 여부와 중요도 점수를 기준으로 정렬됩니다"
      : "Ranked by AI processing status and importance score";

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-5 flex flex-col justify-between gap-3 border-b border-[#3B3B46] pb-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-zinc-400">{today}</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              {pageTitle}
            </h1>
          </div>

          {!isSubscribed && (
            <Link
              href="/subscribe"
              className="rounded-lg bg-[#F47725] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff8a3d]"
            >
              Subscribe
            </Link>
          )}
        </div>

        <div className="mb-6 overflow-hidden rounded-2xl border border-[#454550] bg-[#303039] shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-[#EA002C] via-[#F47725] to-[#F47725]" />

          <div className="px-6 py-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#F47725]">
              SK hynix AI News
            </p>

            <h2 className="max-w-4xl text-2xl font-bold tracking-tight text-white md:text-3xl">
              {newsLanguagePreference === "ko"
                ? "반도체, AI 및 기술 뉴스 브리프"
                : "Semiconductor, AI, and Technology News Brief"}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300 md:text-base">
              {newsLanguagePreference === "ko"
                ? "공개 기술 뉴스를 토픽별로 정리하고, 주요 기사는 AI가 요약하여 데일리 이메일 브리핑으로 제공합니다."
                : "Public technology news organized by topic. Key articles are AI-processed and prepared for daily email briefings."}
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => setSelectedTopic(topic)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedTopic === topic
                  ? "border-[#F47725] bg-[#F47725] text-white"
                  : "border-[#454550] bg-[#303039] text-zinc-300 hover:border-[#F47725]/70 hover:bg-[#383843]"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">{sectionTitle}</h2>
          <p className="text-sm text-zinc-400">{sectionDescription}</p>
        </div>

        {loading && (
          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-8 text-center">
            <p className="text-zinc-300">
              {newsLanguagePreference === "ko"
                ? "AI가 선별한 기사를 불러오는 중..."
                : "Loading AI-curated articles..."}
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-2xl border border-[#EA002C]/30 bg-[#EA002C]/10 p-8 text-red-200">
            <h2 className="text-xl font-semibold">
              {newsLanguagePreference === "ko"
                ? "기사를 불러오지 못했습니다"
                : "Failed to load articles"}
            </h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && topArticles.length === 0 && (
          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-8 text-center">
            <h2 className="text-2xl font-semibold text-white">
              {newsLanguagePreference === "ko"
                ? "아직 처리된 기사가 없습니다"
                : "No processed articles yet"}
            </h2>
            <p className="mt-3 text-zinc-300">
              {newsLanguagePreference === "ko"
                ? "이 토픽에 저장된 기사가 아직 없습니다. 다른 토픽을 선택하거나 Search News + AI를 사용해보세요."
                : "No saved articles are available for this topic yet. Try another topic or use Search News + AI to analyze real news."}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/news-ai"
                className="rounded-xl border border-[#454550] bg-[#26262C] px-5 py-3 font-semibold text-zinc-200 hover:bg-[#383843]"
              >
                Search News + AI
              </Link>
            </div>
          </div>
        )}

        {!loading && !errorMessage && topArticles.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {topArticles.map((article) => {
              const display = getArticleDisplay(article, newsLanguagePreference);

              return (
                <Link
                  key={article.id}
                  href={`/brief-article/${article.id}`}
                  className="group block overflow-hidden rounded-2xl border border-[#454550] bg-[#303039] shadow-sm transition hover:-translate-y-0.5 hover:border-[#F47725]/70 hover:bg-[#383843] hover:shadow-lg"
                >
                  {article.image_url && (
                    <img
                      src={article.image_url}
                      alt=""
                      className="h-40 w-full object-cover opacity-90 transition group-hover:opacity-100"
                    />
                  )}

                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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
                    </div>

                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-zinc-400">
                        Score {article.importance_score}/10
                      </span>
                    </div>

                    <h3 className="mb-3 line-clamp-2 text-lg font-bold leading-snug text-white group-hover:text-[#ffb17a]">
                      {display.title}
                    </h3>

                    <p className="mb-4 line-clamp-3 text-sm leading-6 text-zinc-300">
                      {display.summary}
                    </p>

                    {newsLanguagePreference === "both" &&
                      display.showKoreanBlock && (
                        <div className="mb-4 rounded-xl border border-[#454550] bg-[#26262C] p-3">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                            Korean
                          </p>

                          {display.koreanTitle && (
                            <p className="mb-2 line-clamp-2 text-sm font-semibold leading-6 text-zinc-100">
                              {display.koreanTitle}
                            </p>
                          )}

                          {display.koreanSummary && (
                            <p className="line-clamp-2 text-sm leading-6 text-zinc-300">
                              {display.koreanSummary}
                            </p>
                          )}
                        </div>
                      )}

                    <div className="mb-4 rounded-xl bg-[#26262C] p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {newsLanguagePreference === "ko"
                          ? "중요 포인트"
                          : "Why this matters"}
                      </p>
                      <p className="line-clamp-2 text-sm leading-6 text-zinc-300">
                        {display.reason}
                      </p>
                    </div>

                    <div className="border-t border-[#454550] pt-4 text-sm text-zinc-400">
                      <p className="truncate">{article.source}</p>
                      <p>
                        {new Date(article.published_at).toLocaleDateString(
                          newsLanguagePreference === "ko" ? "ko-KR" : "en-US"
                        )}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}