"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type SubscriberResult = {
  email: string;
  success: boolean;
  topicsRequested: string[];
  articlesSent: number;
  failedTopics: {
    topic: string;
    error: string;
  }[];
  error?: string;
};

type JobResult = {
  success: boolean;
  message?: string;
  subscribersChecked?: number;
  successfulSends?: number;
  failedSends?: number;
  results?: SubscriberResult[];
  error?: string;
};

export default function AdminPage() {
  const [cronSecret, setCronSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function runDailyBriefJob() {
    setLoading(true);
    setJobResult(null);
    setErrorMessage("");

    try {
      if (!cronSecret.trim()) {
        throw new Error("Please enter CRON_SECRET before running the job.");
      }
      const response = await fetch(
      `/api/jobs/send-daily-brief?secret=${encodeURIComponent(
          cronSecret
      )}&force=true`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Daily brief job failed.");
      }

      setJobResult(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to run daily brief job."
      );
    } finally {
      setLoading(false);
    }
  }

  const adminLinks = [
    {
      title: "News + AI",
      description:
        "Search real public news using GNews and process selected articles with Gemini.",
      href: "/news-ai",
    },
    {
      title: "Generated Brief",
      description:
        "View articles manually saved to the local generated brief during testing.",
      href: "/generated-brief",
    },
    {
      title: "Generated Email",
      description:
        "Preview and send a test email from manually saved local brief articles.",
      href: "/generated-email",
    },
    {
      title: "Daily Collection",
      description:
        "Run topic-based GNews collection manually for testing. Use carefully because of free API limits.",
      href: "/daily-collection",
    },
    {
      title: "Supabase Test",
      description:
        "Check whether the app is connected to Supabase Auth and database.",
      href: "/supabase-test",
    },
  ];

  return (
    <main className="min-h-screen bg-[#26262C] text-white">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-[#ffb17a] hover:text-[#F47725]"
        >
          ← Back to Home
        </Link>

        <div className="mb-10 rounded-3xl bg-gradient-to-r from-slate-800 to-slate-700 p-8 shadow-xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#ffb17a]">
            Admin Console
          </p>

          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Daily News Brief Operations
          </h1>

          <p className="max-w-3xl text-slate-300">
            Manage the backend workflow for collecting public news, processing
            articles with Gemini, saving internal brief pages, and sending daily
            emails through Resend.
          </p>
        </div>

        <div className="mb-8 rounded-3xl border border-blue-500/30 bg-[#F47725]/10 p-6">
          <div className="mb-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#ffb17a]">
              Manual Job Runner
            </p>

            <h2 className="text-2xl font-semibold">
              Run Daily Brief Email Job
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              This manually runs the same job that Vercel Cron will call every
              morning. It reads subscribed users from Supabase, collects news
              from GNews, processes articles with Gemini, saves them to
              Supabase, and sends the email through Resend.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <input
              type="password"
              value={cronSecret}
              onChange={(event) => setCronSecret(event.target.value)}
              placeholder="Enter CRON_SECRET"
              className="rounded-xl border border-[#454550] bg-[#26262C] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
            />

            <button
              type="button"
              onClick={runDailyBriefJob}
              disabled={loading}
              className="rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Running Job..." : "Run Daily Brief Job"}
            </button>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Use the same CRON_SECRET value from your .env.local file. This keeps
            the production cron endpoint protected.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <h2 className="font-semibold">Job Error</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
          </div>
        )}

        {jobResult && (
          <div className="mb-8 rounded-3xl border border-green-500/30 bg-green-500/10 p-6">
            <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-300">
                  Job Result
                </p>

                <h2 className="text-2xl font-semibold text-green-100">
                  {jobResult.success ? "Completed" : "Completed with Issues"}
                </h2>

                <p className="mt-2 text-sm text-green-100/80">
                  {jobResult.message || "Daily brief job finished."}
                </p>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  jobResult.success
                    ? "bg-green-500/20 text-green-200"
                    : "bg-yellow-500/20 text-yellow-100"
                }`}
              >
                {jobResult.success ? "Success" : "Check Details"}
              </span>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-green-500/20 bg-[#26262C]/60 p-5">
                <p className="text-sm text-green-100/60">
                  Subscribers Checked
                </p>
                <p className="mt-2 text-3xl font-bold text-green-50">
                  {jobResult.subscribersChecked ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-green-500/20 bg-[#26262C]/60 p-5">
                <p className="text-sm text-green-100/60">Successful Sends</p>
                <p className="mt-2 text-3xl font-bold text-green-50">
                  {jobResult.successfulSends ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-green-500/20 bg-[#26262C]/60 p-5">
                <p className="text-sm text-green-100/60">Failed Sends</p>
                <p className="mt-2 text-3xl font-bold text-green-50">
                  {jobResult.failedSends ?? 0}
                </p>
              </div>
            </div>

            {jobResult.results && jobResult.results.length > 0 && (
              <div className="overflow-x-auto rounded-2xl border border-green-500/20">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-[#26262C]/80 text-green-100/70">
                    <tr>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Topics</th>
                      <th className="px-4 py-3 font-medium">Articles Sent</th>
                      <th className="px-4 py-3 font-medium">Failed Topics</th>
                    </tr>
                  </thead>

                  <tbody>
                    {jobResult.results.map((result) => (
                      <tr
                        key={result.email}
                        className="border-t border-green-500/20"
                      >
                        <td className="px-4 py-4 text-green-50">
                          {result.email}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              result.success
                                ? "bg-green-500/20 text-green-200"
                                : "bg-red-500/20 text-red-200"
                            }`}
                          >
                            {result.success ? "Sent" : "Failed"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-green-100/80">
                          {result.topicsRequested.join(", ")}
                        </td>

                        <td className="px-4 py-4 text-green-100/80">
                          {result.articlesSent}
                        </td>

                        <td className="px-4 py-4 text-green-100/80">
                          {result.failedTopics.length === 0
                            ? "None"
                            : result.failedTopics
                                .map((item) => `${item.topic}: ${item.error}`)
                                .join(" | ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {jobResult.error && (
              <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
                <h3 className="font-semibold">Error Detail</h3>
                <p className="mt-2 text-sm">{jobResult.error}</p>
              </div>
            )}
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-semibold">Admin Tools</h2>
          <p className="text-sm text-slate-400">
            These pages are useful for testing and operations. They are hidden
            from the public navbar but available here for admin workflow.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {adminLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-[#454550] bg-[#303039] p-6 shadow-lg transition hover:border-blue-500 hover:bg-slate-800"
            >
              <h3 className="mb-2 text-xl font-semibold">{item.title}</h3>
              <p className="text-sm leading-6 text-slate-400">
                {item.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}