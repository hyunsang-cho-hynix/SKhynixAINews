import Link from "next/link";
import Navbar from "@/components/Navbar";
import { articles } from "@/data/articles";
import { notFound } from "next/navigation";

type ArticlePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;

  const article = articles.find((item) => item.id === id);

  if (!article) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Home
        </Link>

        <article className="rounded-3xl border border-[#454550] bg-[#303039] p-8 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <span className="rounded-full bg-[#F47725]/20 px-3 py-1 text-xs font-semibold text-[#ffb17a]">
              {article.topic}
            </span>

            <span className="text-xs text-slate-500">
              Score {article.importanceScore}/10
            </span>
          </div>

          <h1 className="mb-5 text-4xl font-bold leading-tight">
            {article.title}
          </h1>

          <div className="mb-8 text-sm text-slate-400">
            <p>Source: {article.source}</p>
            <p>Published: {article.publishedAt}</p>
          </div>

          <section className="mb-8 rounded-2xl bg-[#26262C] p-5">
            <h2 className="mb-3 text-lg font-semibold">AI Summary</h2>
            <p className="leading-7 text-slate-300">{article.summary}</p>
          </section>

          <div className="mb-8 rounded-2xl border border-[#454550] bg-[#26262C] p-5">
            <h2 className="mb-3 text-lg font-semibold">Why This Matters</h2>
            <p className="leading-7 text-slate-300">
              This article is included in the daily brief because it is relevant
              to semiconductor, AI infrastructure, manufacturing technology, or
              enterprise IT trends that may affect strategic business awareness.
            </p>
          </div>

          <a
            href={article.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d]"
          >
            Open Original Article
          </a>
        </article>
      </section>
    </main>
  );
}