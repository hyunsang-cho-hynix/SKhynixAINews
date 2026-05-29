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

export default function GeneratedEmailPage() {
  const [articles, setArticles] = useState<SavedBriefArticle[]>([]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendMessage, setSendMessage] = useState("");
  const [sendError, setSendError] = useState("");

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

  async function sendTestEmail() {
    setSending(true);
    setSendMessage("");
    setSendError("");

    try {
      if (!recipientEmail.trim()) {
        throw new Error("Please enter a recipient email.");
      }

      if (articles.length === 0) {
        throw new Error("No articles saved for the email.");
      }

      const response = await fetch("/api/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: recipientEmail,
          articles,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : JSON.stringify(data.error)
        );
      }

      setSendMessage(`Email sent successfully to ${recipientEmail}.`);
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Failed to send email."
      );
    } finally {
      setSending(false);
    }
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

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#26262C] text-slate-900">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/generated-brief"
          className="mb-8 inline-block text-sm text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Generated Brief
        </Link>

        <div className="mb-6 rounded-2xl border border-[#454550] bg-[#303039] p-5 text-white">
          <h1 className="text-2xl font-bold">Generated Email Preview</h1>
          <p className="mt-2 text-sm text-slate-400">
            This email preview is built from real GNews articles processed by
            Gemini and saved to the generated daily brief.
          </p>
        </div>

        <div className="mb-6 rounded-3xl border border-[#454550] bg-[#303039] p-6 text-white">
          <h2 className="mb-2 text-xl font-semibold">Send Test Email</h2>
          <p className="mb-4 text-sm text-slate-400">
            Send this generated brief to a test recipient using Resend.
          </p>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              placeholder="recipient@email.com"
              className="flex-1 rounded-xl border border-[#454550] bg-[#26262C] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
            />

            <button
              type="button"
              onClick={sendTestEmail}
              disabled={sending || articles.length === 0}
              className="rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? "Sending..." : "Send Test Email"}
            </button>
          </div>

          {sendMessage && (
            <div className="mt-4 rounded-2xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">
              {sendMessage}
            </div>
          )}

          {sendError && (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
              {sendError}
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Note: Using Resend&apos;s default onboarding sender may only send to
            verified test emails depending on your Resend account/domain setup.
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-3xl border border-[#454550] bg-[#303039] p-8 text-center text-white">
            <h2 className="text-2xl font-semibold">No saved articles yet</h2>
            <p className="mt-3 text-slate-400">
              Go to News + AI, process real articles with Gemini, then save them
              to the daily brief.
            </p>

            <Link
              href="/news-ai"
              className="mt-6 inline-block rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d]"
            >
              Go to News + AI
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-[#303039] shadow-2xl">
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
                Good morning. Here are today&apos;s selected articles from
                public news sources. Each article was processed with AI to
                generate a professional summary, topic classification, and
                importance score.
              </p>
            </div>

            <div className="space-y-8 px-8 pb-8">
              {Object.entries(groupedArticles).map(
                ([topic, topicArticles]) => (
                  <section key={topic}>
                    <div className="mb-4 border-b border-[#454550] pb-2">
                      <h3 className="text-xl font-bold text-slate-950">
                        {topic}
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {topicArticles.map((article) => (
                        <div
                          key={article.originalUrl}
                          className="rounded-2xl border border-[#454550] bg-[#26262C] p-5"
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
                            {article.polishedTitle}
                          </h4>

                          <p className="mb-4 text-sm leading-6 text-slate-600">
                            {article.summary}
                          </p>

                          <div className="mb-4 rounded-xl bg-[#303039] p-4">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Why this matters
                            </p>
                            <p className="text-sm leading-6 text-slate-600">
                              {article.reason}
                            </p>
                          </div>

                          <div className="mb-4 text-xs text-slate-500">
                            <p>Source: {article.source}</p>
                            <p>
                              Published:{" "}
                              {new Date(article.publishedAt).toLocaleString()}
                            </p>
                          </div>

                          <Link
                            href={`/generated-article/${encodeURIComponent(
                              article.originalUrl
                            )}`}
                            className="inline-block rounded-lg bg-[#F47725] px-4 py-2 text-sm font-semibold text-white hover:bg-[#F47725]"
                          >
                            Read Full Brief
                          </Link>
                        </div>
                      ))}
                    </div>
                  </section>
                )
              )}
            </div>

            <div className="bg-[#26262C] px-8 py-6 text-center text-xs text-slate-500">
              <p>
                You are receiving this because you subscribed to SK hynix AI
                News Demo.
              </p>
              <p className="mt-2">
                Manage topics · Unsubscribe · View in browser
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}