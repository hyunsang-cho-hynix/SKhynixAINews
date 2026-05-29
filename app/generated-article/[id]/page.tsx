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

type GeneratedArticlePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function GeneratedArticlePage({
  params,
}: GeneratedArticlePageProps) {
  const [articleId, setArticleId] = useState("");
  const [article, setArticle] = useState<SavedBriefArticle | null>(null);

  useEffect(() => {
    async function loadParams() {
      const resolvedParams = await params;
      setArticleId(decodeURIComponent(resolvedParams.id));
    }

    loadParams();
  }, [params]);

  useEffect(() => {
    if (!articleId) return;

    const rawArticles = window.localStorage.getItem("dailyBriefArticles");
    const savedArticles: SavedBriefArticle[] = rawArticles
      ? JSON.parse(rawArticles)
      : [];

    const foundArticle = savedArticles.find(
      (item) => encodeURIComponent(item.originalUrl) === articleId
    );

    setArticle(foundArticle || null);
  }, [articleId]);

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/generated-email"
          className="mb-8 inline-block text-sm text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Generated Email
        </Link>

        {!article ? (
          <div className="rounded-3xl border border-[#454550] bg-[#303039] p-8 text-center">
            <h1 className="text-2xl font-semibold">Article not found</h1>
            <p className="mt-3 text-slate-400">
              This article may not be saved in your browser&apos;s generated
              brief anymore.
            </p>

            <Link
              href="/news-ai"
              className="mt-6 inline-block rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d]"
            >
              Go to News + AI
            </Link>
          </div>
        ) : (
          <article className="overflow-hidden rounded-3xl border border-[#454550] bg-[#303039] shadow-xl">
            {article.image && (
              <img
                src={article.image}
                alt=""
                className="h-72 w-full object-cover"
              />
            )}

            <div className="p-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-full bg-[#F47725]/20 px-3 py-1 text-xs font-semibold text-[#ffb17a]">
                  {article.topic}
                </span>

                <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-300">
                  Score {article.importanceScore}/10
                </span>
              </div>

              <h1 className="mb-5 text-4xl font-bold leading-tight">
                {article.polishedTitle}
              </h1>

              <div className="mb-8 text-sm text-slate-400">
                <p>Source: {article.source}</p>
                <p>
                  Published: {new Date(article.publishedAt).toLocaleString()}
                </p>
              </div>

              <section className="mb-6 rounded-2xl bg-[#26262C] p-5">
                <h2 className="mb-3 text-lg font-semibold">AI Summary</h2>
                <p className="leading-7 text-slate-300">{article.summary}</p>
              </section>

              <section className="mb-6 rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                <h2 className="mb-3 text-lg font-semibold">
                  Why This Matters
                </h2>
                <p className="leading-7 text-slate-300">{article.reason}</p>
              </section>

              <section className="mb-8 rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                <h2 className="mb-3 text-lg font-semibold">Original Title</h2>
                <p className="leading-7 text-slate-300">
                  {article.originalTitle}
                </p>
              </section>

              <div className="flex flex-wrap gap-3">
                <a
                  href={article.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d]"
                >
                  Open Original Article
                </a>

                <Link
                  href="/generated-email"
                  className="rounded-xl border border-[#454550] bg-[#26262C] px-5 py-3 font-semibold text-slate-200 hover:bg-slate-800"
                >
                  Back to Email Preview
                </Link>
              </div>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}