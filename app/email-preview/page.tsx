import Link from "next/link";
import Navbar from "@/components/Navbar";
import { articles } from "@/data/articles";

const topics = ["Semiconductor", "AI", "Automation", "Robotics", "IT"];

export default function EmailPreviewPage() {
  const today = "May 26, 2026";

  const articlesByTopic = topics.map((topic) => {
    const topicArticles = articles
      .filter((article) => article.topic === topic)
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 10);

    return {
      topic,
      articles: topicArticles,
    };
  });

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-900">
      <Navbar />

      <div className="mx-auto max-w-3xl pt-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-blue-300 hover:text-blue-200"
        >
          ← Back to Home
        </Link>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-white">
          <h1 className="text-2xl font-bold">Daily Email Preview</h1>
          <p className="mt-2 text-sm text-slate-400">
            This page shows how the daily AI news email will look before real
            email sending is connected.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="bg-gradient-to-r from-blue-600 to-cyan-500 px-8 py-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-100">
              SK hynix AI News Brief
            </p>
            <h2 className="mt-2 text-3xl font-bold">
              Daily Semiconductor & Technology Brief
            </h2>
            <p className="mt-3 text-blue-50">{today}</p>
          </div>

          <div className="px-8 py-6">
            <p className="text-sm leading-6 text-slate-600">
              Good morning. Here are today&apos;s top curated stories across
              semiconductor, AI, automation, robotics, and IT. Each article is
              summarized and ranked for quick review.
            </p>
          </div>

          <div className="space-y-8 px-8 pb-8">
            {articlesByTopic.map((section) => (
              <section key={section.topic}>
                <div className="mb-4 border-b border-slate-200 pb-2">
                  <h3 className="text-xl font-bold text-slate-950">
                    {section.topic}
                  </h3>
                </div>

                <div className="space-y-4">
                  {section.articles.map((article) => (
                    <div
                      key={article.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {article.topic}
                        </span>
                        <span className="text-xs text-slate-500">
                          Score {article.importanceScore}/10
                        </span>
                      </div>

                      <h4 className="mb-2 text-lg font-bold leading-snug text-slate-950">
                        {article.title}
                      </h4>

                      <p className="mb-4 text-sm leading-6 text-slate-600">
                        {article.summary}
                      </p>

                      <div className="mb-4 text-xs text-slate-500">
                        <p>Source: {article.source}</p>
                        <p>Published: {article.publishedAt}</p>
                      </div>

                      <Link
                        href={`/article/${article.id}`}
                        className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                      >
                        Read Full Brief
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="bg-slate-100 px-8 py-6 text-center text-xs text-slate-500">
            <p>
              You are receiving this because you subscribed to SK hynix AI News
              Demo.
            </p>
            <p className="mt-2">
              Manage topics · Unsubscribe · View in browser
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}