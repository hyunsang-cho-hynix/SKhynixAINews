"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  score_explanation: string | null;
  score_factors: Record<string, string> | null;
  compared_article_snapshot:
    | {
        title?: string;
        source?: string;
        originalUrl?: string;
        publishedAt?: string;
        topic?: string;
        importanceScore?: number;
        estimatedImportanceScore?: number;
        reason?: string;
      }[]
    | null;
  source_text_excerpt: string | null;
  ai_model: string | null;
  ai_processed_version: string | null;
  original_content_read_at: string | null;
};

const HOME_STATE_KEY = "skhynix-ai-news-home-state";

type RelatedArticle = Pick<
  Article,
  | "id"
  | "topic"
  | "polished_title"
  | "importance_score"
  | "reason"
  | "source"
  | "published_at"
  | "original_url"
  | "is_ai_processed"
>;

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

function getScoreExplanation(article: Article, relatedArticles: RelatedArticle[]) {
  if (article.score_explanation) {
    return article.score_explanation;
  }

  const higherScoreCount = relatedArticles.filter(
    (item) => item.importance_score > article.importance_score
  ).length;
  const sameOrLowerCount = relatedArticles.filter(
    (item) => item.importance_score <= article.importance_score
  ).length;

  if (article.importance_score >= 8) {
    return `This score is high because the article has strong strategic relevance, current market signal, and direct technology impact. In this topic set, ${higherScoreCount} comparable articles scored higher and ${sameOrLowerCount} scored the same or lower.`;
  }

  if (article.importance_score >= 6) {
    return `This is a mid-to-high score. The article is relevant to the topic and useful for awareness, but it may be less direct, less urgent, or less company-specific than the highest-ranked items. In this topic set, ${higherScoreCount} comparable articles scored higher and ${sameOrLowerCount} scored the same or lower.`;
  }

  return `This is a monitoring score. The article is worth tracking, but compared with other items in this topic it appears less urgent or less directly tied to SK hynix strategic priorities. In this topic set, ${higherScoreCount} comparable articles scored higher and ${sameOrLowerCount} scored the same or lower.`;
}

export default function BriefArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [showKorean, setShowKorean] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [relatedArticles, setRelatedArticles] = useState<RelatedArticle[]>([]);

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  function handleBack() {
    const hasHomeSnapshot = Boolean(sessionStorage.getItem(HOME_STATE_KEY));

    if (hasHomeSnapshot && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
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

      const loadedArticle = data as Article;
      setArticle(loadedArticle);
      loadRelatedArticles(loadedArticle);

      if (loadedArticle.original_language === "ko") {
        setShowKorean(true);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load article."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadRelatedArticles(currentArticle: Article) {
    try {
      const { data, error } = await supabase
        .from("processed_articles")
        .select(
          "id, topic, polished_title, importance_score, reason, source, published_at, original_url, is_ai_processed"
        )
        .eq("topic", currentArticle.topic)
        .neq("id", currentArticle.id)
        .order("importance_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      setRelatedArticles((data || []) as RelatedArticle[]);
    } catch {
      setRelatedArticles([]);
    }
  }

  function handleShowKoreanTranslation() {
    if (!article) {
      return;
    }

    if (article.polished_title_ko && article.summary_ko && article.reason_ko) {
      setShowKorean(true);
      return;
    }

    setErrorMessage(
      "Korean translation is not prepared for this article yet. It will be generated during the daily AI processing job."
    );
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

  const isKoreanOriginal = article.original_language === "ko";
  const scoreExplanation = getScoreExplanation(article, relatedArticles);
  const storedComparedArticles = article.compared_article_snapshot || [];

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-8">
        <button
          type="button"
          onClick={handleBack}
          className="mb-8 inline-block text-sm font-semibold text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back
        </button>

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

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
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
                {!isKoreanOriginal && !showKorean && (
                  <button
                    type="button"
                    onClick={handleShowKoreanTranslation}
                    className="rounded-xl bg-[#F47725] px-4 py-2 text-sm font-bold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    View Korean Translation
                  </button>
                )}

                {!isKoreanOriginal && showKorean && (
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

              <section className="mt-8 rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                  Why this matters to SK hynix
                </p>
                <p className="text-sm leading-7 text-zinc-300">
                  This brief is scored from the viewpoint of SK hynix employees:
                  memory demand, AI infrastructure, customer and competitor
                  movement, semiconductor supply chain signals, market impact,
                  and operational technology trends are weighted more heavily
                  than general consumer-tech relevance.
                </p>
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

              <p className="mt-4 text-sm leading-6 text-zinc-300">
                {scoreExplanation}
              </p>

              {article.score_factors && (
                <div className="mt-4 space-y-3">
                  {Object.entries(article.score_factors).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-[#454550] bg-[#26262C] p-3"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                        {key.replace(/([A-Z])/g, " $1")}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-zinc-300">
                        {String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

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
                Score Method
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
                Scores combine article topic fit, direct semiconductor and AI
                relevance, major-company signals, recency, market impact, and
                the AI-generated reasoning saved with the article. The score is
                best read as a ranked editorial signal, not a financial rating.
              </p>
            </section>

            <section className="rounded-2xl border border-[#454550] bg-[#303039] p-5 shadow-sm">
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[#F47725]">
                Compared Articles
              </p>

              {relatedArticles.length === 0 ? (
                <p className="text-sm leading-6 text-zinc-400">
                  No comparable articles are available for this topic yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {relatedArticles.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#454550] bg-[#26262C] p-4"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-bold text-[#ffb17a]">
                          Score {item.importance_score}/10
                        </span>
                        <span className="text-xs text-zinc-500">
                          {item.is_ai_processed ? "AI Processed" : "Collected"}
                        </span>
                      </div>

                      <Link
                        href={`/brief-article/${item.id}`}
                        className="line-clamp-2 text-sm font-bold leading-6 text-white hover:text-[#ffb17a]"
                      >
                        {item.polished_title}
                      </Link>

                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
                        {item.reason}
                      </p>

                      <a
                        href={item.original_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-xs font-semibold text-zinc-500 hover:text-[#F47725]"
                      >
                        Original source
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {storedComparedArticles.length > 0 && (
                <div className="mt-5 border-t border-[#454550] pt-5">
                  <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">
                    Compared during AI processing
                  </p>

                  <div className="space-y-3">
                    {storedComparedArticles.map((item, index) => (
                      <div
                        key={`${item.originalUrl || item.title}-${index}`}
                        className="rounded-xl border border-[#454550] bg-[#26262C] p-4"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-xs font-bold text-[#ffb17a]">
                            Score{" "}
                            {item.importanceScore ||
                              item.estimatedImportanceScore ||
                              "n/a"}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {item.source || "Unknown source"}
                          </span>
                        </div>

                        <p className="line-clamp-2 text-sm font-bold leading-6 text-white">
                          {item.title || "Untitled article"}
                        </p>

                        {item.reason && (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">
                            {item.reason}
                          </p>
                        )}

                        {item.originalUrl && (
                          <a
                            href={item.originalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-block text-xs font-semibold text-zinc-500 hover:text-[#F47725]"
                          >
                            Original source
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

                {article.ai_model && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      AI Model
                    </p>
                    <p className="text-zinc-200">{article.ai_model}</p>
                  </div>
                )}

                {article.original_content_read_at && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      Original Content Read
                    </p>
                    <p className="text-zinc-200">
                      {new Date(article.original_content_read_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {article.source_text_excerpt && (
              <section className="rounded-2xl border border-[#454550] bg-[#303039] p-5 shadow-sm">
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#F47725]">
                  Source Text Checked
                </p>
                <p className="line-clamp-6 text-xs leading-6 text-zinc-400">
                  {article.source_text_excerpt}
                </p>
              </section>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
