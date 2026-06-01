"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";

type NewsLanguagePreference = "en" | "ko" | "both";

type SortMode =
  | "importance"
  | "latest"
  | "ai"
  | "collected"
  | "korean"
  | "english";

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
  original_language: string | null;
};

const HOME_STATE_KEY = "skhynix-ai-news-home-state";

type HomeStateSnapshot = {
  selectedTopic?: string;
  sortMode?: SortMode;
  newsLanguagePreference?: NewsLanguagePreference;
  scrollY?: number;
  articles?: ProcessedArticle[];
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
  "Stock Market",
];

const sortOptions: { label: string; value: SortMode }[] = [
  { label: "Importance", value: "importance" },
  { label: "Latest", value: "latest" },
  { label: "AI Processed", value: "ai" },
  { label: "Collected", value: "collected" },
  { label: "Korean News", value: "korean" },
  { label: "English / US News", value: "english" },
];

const topicOnlyList = topics.filter((topic) => topic !== "All");

const ALL_ARTICLES_PER_TOPIC = 40;
const TOPIC_ARTICLE_LIMIT = 200;

function normalizeLanguagePreference(value: string | null | undefined) {
  if (value === "ko" || value === "both") {
    return value;
  }

  return "en";
}

function isValidSortMode(value: string | null | undefined): value is SortMode {
  return (
    value === "importance" ||
    value === "latest" ||
    value === "ai" ||
    value === "collected" ||
    value === "korean" ||
    value === "english"
  );
}

function getInitialSelectedTopic() {
  if (typeof window === "undefined") {
    return "All";
  }

  try {
    const saved = sessionStorage.getItem(HOME_STATE_KEY);

    if (!saved) {
      return "All";
    }

    const parsed = JSON.parse(saved) as { selectedTopic?: string };

    if (parsed.selectedTopic && topics.includes(parsed.selectedTopic)) {
      return parsed.selectedTopic;
    }

    return "All";
  } catch {
    return "All";
  }
}

function getInitialSortMode(): SortMode {
  if (typeof window === "undefined") {
    return "importance";
  }

  try {
    const savedHomeState = sessionStorage.getItem(HOME_STATE_KEY);

    if (savedHomeState) {
      const parsed = JSON.parse(savedHomeState) as { sortMode?: SortMode };

      if (isValidSortMode(parsed.sortMode)) {
        return parsed.sortMode;
      }
    }

    const savedSortMode = localStorage.getItem(
      "skhynix-ai-news-sort-mode"
    ) as SortMode | null;

    if (isValidSortMode(savedSortMode)) {
      return savedSortMode;
    }

    return "importance";
  } catch {
    return "importance";
  }
}

function isValidLanguagePreference(
  value: string | null | undefined
): value is NewsLanguagePreference {
  return value === "en" || value === "ko" || value === "both";
}

function getSavedHomeState(): HomeStateSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const saved = sessionStorage.getItem(HOME_STATE_KEY);

    if (!saved) {
      return null;
    }

    return JSON.parse(saved) as HomeStateSnapshot;
  } catch {
    return null;
  }
}

function getInitialLanguagePreference(): NewsLanguagePreference {
  const saved = getSavedHomeState();

  if (isValidLanguagePreference(saved?.newsLanguagePreference)) {
    return saved.newsLanguagePreference;
  }

  return "both";
}

function getInitialArticles() {
  const saved = getSavedHomeState();

  return Array.isArray(saved?.articles) ? saved.articles : [];
}

function saveHomeStateSnapshot(snapshot: HomeStateSnapshot) {
  try {
    sessionStorage.setItem(HOME_STATE_KEY, JSON.stringify(snapshot));
  } catch {
    const { articles: _articles, ...snapshotWithoutArticles } = snapshot;

    try {
      sessionStorage.setItem(
        HOME_STATE_KEY,
        JSON.stringify(snapshotWithoutArticles)
      );
    } catch {
      // Ignore storage failures so navigation never breaks article loading.
    }
  }
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
    if (article.original_language === "ko") {
      return {
        title: article.polished_title_ko || article.polished_title,
        summary: article.summary_ko || article.summary,
        reason: article.reason_ko || article.reason,
        showKoreanBlock: false,
      };
    }

    return {
      title: article.polished_title,
      summary: article.summary,
      reason: article.reason,
      showKoreanBlock: false,
    };
  }

  return {
    title: article.polished_title,
    summary: article.summary,
    reason: article.reason,
    showKoreanBlock: false,
  };
}

function getTimeValue(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isKoreanArticle(article: ProcessedArticle) {
  return article.original_language === "ko";
}

function isEnglishArticle(article: ProcessedArticle) {
  return article.original_language === "en" || !article.original_language;
}

function sortArticles(articles: ProcessedArticle[], sortMode: SortMode) {
  return [...articles].sort((a, b) => {
    if (sortMode === "latest") {
      return getTimeValue(b.created_at) - getTimeValue(a.created_at);
    }

    if (sortMode === "ai") {
      if (a.is_ai_processed !== b.is_ai_processed) {
        return Number(b.is_ai_processed) - Number(a.is_ai_processed);
      }

      if (a.importance_score !== b.importance_score) {
        return b.importance_score - a.importance_score;
      }

      return getTimeValue(b.created_at) - getTimeValue(a.created_at);
    }

    if (sortMode === "collected") {
      if (a.is_ai_processed !== b.is_ai_processed) {
        return Number(a.is_ai_processed) - Number(b.is_ai_processed);
      }

      return getTimeValue(b.created_at) - getTimeValue(a.created_at);
    }

    if (sortMode === "korean") {
      if (isKoreanArticle(a) !== isKoreanArticle(b)) {
        return Number(isKoreanArticle(b)) - Number(isKoreanArticle(a));
      }

      if (a.importance_score !== b.importance_score) {
        return b.importance_score - a.importance_score;
      }

      return getTimeValue(b.created_at) - getTimeValue(a.created_at);
    }

    if (sortMode === "english") {
      if (isEnglishArticle(a) !== isEnglishArticle(b)) {
        return Number(isEnglishArticle(b)) - Number(isEnglishArticle(a));
      }

      if (a.importance_score !== b.importance_score) {
        return b.importance_score - a.importance_score;
      }

      return getTimeValue(b.created_at) - getTimeValue(a.created_at);
    }

    if (a.importance_score !== b.importance_score) {
      return b.importance_score - a.importance_score;
    }

    if (a.is_ai_processed !== b.is_ai_processed) {
      return Number(b.is_ai_processed) - Number(a.is_ai_processed);
    }

    return getTimeValue(b.created_at) - getTimeValue(a.created_at);
  });
}

function getLanguageLabel(language: NewsLanguagePreference) {
  if (language === "ko") {
    return "Korean news only";
  }

  if (language === "both") {
    return "English and Korean news";
  }

  return "English news only";
}

export default function Home() {
  const [articles, setArticles] =
    useState<ProcessedArticle[]>(getInitialArticles);
  const [selectedTopic, setSelectedTopic] = useState(getInitialSelectedTopic);
  const [sortMode, setSortMode] = useState<SortMode>(getInitialSortMode);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [newsLanguagePreference, setNewsLanguagePreference] =
    useState<NewsLanguagePreference>(getInitialLanguagePreference);
  const [loading, setLoading] = useState(() => getInitialArticles().length === 0);
  const [errorMessage, setErrorMessage] = useState("");

  const hasRestoredScroll = useRef(false);
  const hasSavedArticles = articles.length > 0;

  useEffect(() => {
    loadUserPreferences();
  }, []);

  useEffect(() => {
    loadArticles(selectedTopic, sortMode, newsLanguagePreference);
  }, [selectedTopic, sortMode, newsLanguagePreference]);

  useEffect(() => {
    if ((loading && articles.length === 0) || hasRestoredScroll.current) {
      return;
    }

    try {
      const saved = sessionStorage.getItem(HOME_STATE_KEY);

      if (!saved) {
        return;
      }

      const parsed = JSON.parse(saved) as { scrollY?: number };

      if (typeof parsed.scrollY !== "number") {
        return;
      }

      hasRestoredScroll.current = true;

      requestAnimationFrame(() => {
        window.scrollTo({
          top: parsed.scrollY,
          behavior: "auto",
        });
      });
    } catch {
      // Ignore restore errors.
    }
  }, [loading, articles.length]);

  function saveHomeState(scrollY = window.scrollY) {
    saveHomeStateSnapshot({
      selectedTopic,
      sortMode,
      newsLanguagePreference,
      scrollY,
      articles,
    });
  }

  function handleTopicChange(topic: string) {
    hasRestoredScroll.current = true;
    setArticles([]);
    setSelectedTopic(topic);

    saveHomeStateSnapshot({
      selectedTopic: topic,
      sortMode,
      newsLanguagePreference,
      scrollY: 0,
      articles: [],
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleSortChange(nextSortMode: SortMode) {
    hasRestoredScroll.current = true;
    setArticles([]);
    setSortMode(nextSortMode);
    localStorage.setItem("skhynix-ai-news-sort-mode", nextSortMode);

    saveHomeStateSnapshot({
      selectedTopic,
      sortMode: nextSortMode,
      newsLanguagePreference,
      scrollY: 0,
      articles: [],
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function loadUserPreferences() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;

      if (!user) {
        setIsSubscribed(false);
        setNewsLanguagePreference("both");
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
      const nextLanguagePreference = normalizeLanguagePreference(
        data?.news_language_preference
      );
      setNewsLanguagePreference((currentLanguagePreference) =>
        currentLanguagePreference === nextLanguagePreference
          ? currentLanguagePreference
          : nextLanguagePreference
      );
    } catch {
      setIsSubscribed(false);
      setNewsLanguagePreference("both");
    }
  }

  function applyLanguageFilter(query: any, language: NewsLanguagePreference) {
    if (language === "ko") {
      return query.eq("original_language", "ko");
    }

    if (language === "en") {
      return query.or("original_language.eq.en,original_language.is.null");
    }

    return query;
  }

  function applySortToQuery(query: any, currentSortMode: SortMode) {
    if (currentSortMode === "latest") {
      return query.order("created_at", { ascending: false });
    }

    if (currentSortMode === "korean") {
      return query
        .order("original_language", { ascending: false })
        .order("importance_score", { ascending: false })
        .order("created_at", { ascending: false });
    }

    if (currentSortMode === "english") {
      return query
        .order("original_language", { ascending: true })
        .order("importance_score", { ascending: false })
        .order("created_at", { ascending: false });
    }

    if (currentSortMode === "collected") {
      return query
        .order("is_ai_processed", { ascending: true })
        .order("created_at", { ascending: false });
    }

    if (currentSortMode === "ai") {
      return query
        .order("is_ai_processed", { ascending: false })
        .order("importance_score", { ascending: false })
        .order("created_at", { ascending: false });
    }

    return query
      .order("importance_score", { ascending: false })
      .order("is_ai_processed", { ascending: false })
      .order("created_at", { ascending: false });
  }

  async function loadArticles(
    topic: string,
    currentSortMode: SortMode,
    language: NewsLanguagePreference
  ) {
    setLoading(true);
    setErrorMessage("");

    try {
      if (topic === "All") {
        const topicQueries = await Promise.all(
          topicOnlyList.map(async (topicName) => {
            let query = supabase
              .from("processed_articles")
              .select("*")
              .eq("topic", topicName)
              .limit(ALL_ARTICLES_PER_TOPIC);

            query = applyLanguageFilter(query, language);
            query = applySortToQuery(query, currentSortMode);

            const { data, error } = await query;

            if (error) {
              throw error;
            }

            return (data || []) as ProcessedArticle[];
          })
        );

        const mergedArticles = topicQueries.flat();
        const nextArticles = sortArticles(mergedArticles, currentSortMode);
        setArticles(nextArticles);
        saveHomeStateSnapshot({
          selectedTopic: topic,
          sortMode: currentSortMode,
          newsLanguagePreference: language,
          scrollY: window.scrollY,
          articles: nextArticles,
        });
        return;
      }

      let query = supabase
        .from("processed_articles")
        .select("*")
        .eq("topic", topic)
        .limit(TOPIC_ARTICLE_LIMIT);

      query = applyLanguageFilter(query, language);
      query = applySortToQuery(query, currentSortMode);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const nextArticles = sortArticles(
        (data || []) as ProcessedArticle[],
        currentSortMode
      );
      setArticles(nextArticles);
      saveHomeStateSnapshot({
        selectedTopic: topic,
        sortMode: currentSortMode,
        newsLanguagePreference: language,
        scrollY: window.scrollY,
        articles: nextArticles,
      });
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

  const pageTitle =
    newsLanguagePreference === "ko"
      ? "오늘의 기술 뉴스 브리프"
      : "Today's Technology Brief";

  const sectionTitle =
    selectedTopic === "All"
      ? newsLanguagePreference === "ko"
        ? "전체 주요 기사"
        : "All Collected Articles"
      : selectedTopic;

  const sectionDescription =
    selectedTopic === "All"
      ? newsLanguagePreference === "ko"
        ? "선택한 언어 설정에 맞춰 모든 토픽의 수집 기사와 AI 처리 기사를 보여줍니다"
        : "Showing collected and AI-processed articles across all topics based on your language setting"
      : newsLanguagePreference === "ko"
        ? `${selectedTopic} 토픽의 수집 기사와 AI 처리 기사`
        : `Collected and AI-processed articles for ${selectedTopic}`;

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
          <div className="h-1 w-full bg-gradient-to-r from-[#EA002C] via-[#F47725] to-[#ffb17a]" />

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
                ? "공개 기술 뉴스를 토픽별로 수집하고, 주요 기사는 AI가 요약하여 데일리 이메일 브리핑으로 제공합니다."
                : "Public technology news collected by topic. Key articles are AI-processed and prepared for daily email briefings."}
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {topics.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => handleTopicChange(topic)}
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

        <div className="mb-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-bold text-white">{sectionTitle}</h2>
            <p className="text-sm text-zinc-400">{sectionDescription}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Language filter: {getLanguageLabel(newsLanguagePreference)}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end">
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Sort by
            </label>

            <select
              value={sortMode}
              onChange={(event) =>
                handleSortChange(event.target.value as SortMode)
              }
              className="rounded-xl border border-[#454550] bg-[#303039] px-4 py-2 text-sm font-semibold text-zinc-200 outline-none transition hover:border-[#F47725]/70 focus:border-[#F47725]"
            >
              {sortOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className="bg-[#303039] text-white"
                >
                  {option.label}
                </option>
              ))}
            </select>

            {!loading && !errorMessage && (
              <p className="text-xs text-zinc-500">
                Showing {articles.length} articles
              </p>
            )}
          </div>
        </div>

        {loading && !hasSavedArticles && (
          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-8 text-center">
            <p className="text-zinc-300">
              {newsLanguagePreference === "ko"
                ? "수집된 기사를 불러오는 중..."
                : "Loading collected articles..."}
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

        {!loading && !errorMessage && articles.length === 0 && (
          <div className="rounded-2xl border border-[#454550] bg-[#303039] p-8 text-center">
            <h2 className="text-2xl font-semibold text-white">
              {newsLanguagePreference === "ko"
                ? "선택한 언어의 기사가 없습니다"
                : "No articles for selected language"}
            </h2>
            <p className="mt-3 text-zinc-300">
              {newsLanguagePreference === "ko"
                ? "현재 언어 설정에 맞는 기사가 없습니다. My Topics에서 언어 설정을 변경하거나 다른 토픽을 선택해보세요."
                : "No saved articles are available for your current language setting. Try changing language preferences in My Topics or selecting another topic."}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/settings/topics"
                className="rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d]"
              >
                My Topics
              </Link>

              <Link
                href="/news-ai"
                className="rounded-xl border border-[#454550] bg-[#26262C] px-5 py-3 font-semibold text-zinc-200 hover:bg-[#383843]"
              >
                Search News + AI
              </Link>
            </div>
          </div>
        )}

        {!errorMessage && articles.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => {
              const display = getArticleDisplay(article, newsLanguagePreference);

              return (
                <Link
                  key={article.id}
                  href={`/brief-article/${article.id}`}
                  onClick={() => saveHomeState()}
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
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#F47725]/30 bg-[#F47725]/10 px-3 py-1 text-xs font-semibold text-[#ffb17a]">
                          {article.topic}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                          article.is_ai_processed
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-[#454550] bg-[#26262C] text-zinc-400"
                        }`}
                      >
                        {article.is_ai_processed && (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        )}
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
