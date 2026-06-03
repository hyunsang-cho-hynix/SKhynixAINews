"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type SubscriberResult = {
  email: string;
  success: boolean;
  languagePreference?: string;
  topicsRequested: string[];
  articlesSent: number;
  error?: string;
};

type CollectionTopicResult = {
  topic: string;
  englishFetched: number;
  englishSaved: number;
  koreanFetched: number;
  koreanSaved: number;
  aiCandidates: number;
  aiTargeted: number;
  aiAlreadyProcessed: number;
  aiProcessed: number;
  failedAi: number;
  errors: string[];
};

type JobResult = {
  success: boolean;
  message?: string;
  subscribersChecked?: number;
  successfulSends?: number;
  failedSends?: number;
  dailyRequestBudget?: number;
  requestsPerTopic?: number;
  aiArticlesPerTopic?: number;
  aiProcessingCoverage?: number;
  aiProcessingConcurrency?: number;
  aiProcessingDelayMs?: number;
  naverDisplayPerTopic?: string;
  recentNewsWindowHours?: number;
  gnewsLookbackHours?: number;
  articleRetentionDays?: number;
  expiredArticlesDeleted?: number;
  topicsProcessed?: number;
  results?: SubscriberResult[] | CollectionTopicResult[];
  error?: string;
};

type AdminStats = {
  success: boolean;
  generatedAt: string;
  today: string;
  recentWindowHours: number;
  users: {
    registered: number;
    preferenceRows: number;
    subscribed: number;
    unsubscribed: number;
    languagePreferences: Record<string, number>;
    subscribers: {
      email: string;
      sendTime: string | null;
      timezone: string | null;
      languagePreference: string;
    }[];
  };
  collection: {
    todayTotal: number;
    recentTotal: number;
    englishToday: number;
    koreanToday: number;
    aiProcessedToday: number;
    awaitingAiToday: number;
    byTopic: Record<string, number>;
    byLanguage: Record<string, number>;
  };
  email: {
    logAvailable: boolean;
    logMessage: string;
    sentToday: number;
    failedToday: number;
    articlesSentToday: number;
    recipients: {
      email: string;
      success: boolean;
      articles_sent: number;
      language_preference: string | null;
      error: string | null;
      created_at: string;
    }[];
  };
  apiUsage: {
    gnews: {
      dailyRequestBudget: number;
      collectionTopics: number;
      requestsPerTopic: number;
      configuredRequestsPerCollection: number;
      note: string;
    };
    gemini: {
      model: string;
      estimatedCallsToday: number;
      estimatedTokensToday: number;
      configuredAiArticlesPerTopic: number;
      configuredAiProcessingCoverage: number;
      configuredAiProcessingConcurrency: number;
      configuredAiProcessingDelayMs: number;
      configuredDelayMs: number;
      note: string;
    };
    resend: {
      loggedSendsToday: number;
      note: string;
    };
  };
  error?: string;
};

type AdminTab = "operations" | "previews" | "diagnostics" | "routes";

type AdminTool = {
  title: string;
  description: string;
  href: string;
  visibility: "Public" | "Hidden" | "Linked indirectly";
};

export default function AdminPage() {
  const [cronSecret, setCronSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeJob, setActiveJob] = useState<"collection" | "email" | "">("");
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("operations");

  useEffect(() => {
    const savedSecret = window.localStorage.getItem("adminCronSecret") || "";

    if (savedSecret) {
      setCronSecret(savedSecret);
      loadAdminStats(savedSecret);
    }
  }, []);

  async function loadAdminStats(secret = cronSecret) {
    setStatsLoading(true);
    setStatsError("");

    try {
      if (!secret.trim()) {
        throw new Error("Enter CRON_SECRET to load private admin stats.");
      }

      window.localStorage.setItem("adminCronSecret", secret);

      const response = await fetch(
        `/api/admin/stats?secret=${encodeURIComponent(secret)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load admin stats.");
      }

      setAdminStats(data);
    } catch (error) {
      setStatsError(
        error instanceof Error ? error.message : "Failed to load admin stats."
      );
    } finally {
      setStatsLoading(false);
    }
  }

  async function runDailyBriefJob() {
    setLoading(true);
    setActiveJob("email");
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
      loadAdminStats();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to run daily brief job."
      );
    } finally {
      setLoading(false);
      setActiveJob("");
    }
  }

  async function runDailyCollectionJob() {
    setLoading(true);
    setActiveJob("collection");
    setJobResult(null);
    setErrorMessage("");

    try {
      if (!cronSecret.trim()) {
        throw new Error("Please enter CRON_SECRET before running the job.");
      }

      const response = await fetch(
        `/api/jobs/collect-daily-news?secret=${encodeURIComponent(
          cronSecret
        )}&force=true`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Daily news collection failed.");
      }

      setJobResult(data);
      loadAdminStats();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to run daily news collection."
      );
    } finally {
      setLoading(false);
      setActiveJob("");
    }
  }

  const operationTools: AdminTool[] = [
    {
      title: "News + AI",
      description:
        "Search real public news using GNews and process selected articles with Gemini.",
      href: "/news-ai",
      visibility: "Public",
    },
    {
      title: "Daily Collection",
      description:
        "Run topic-based GNews collection manually for testing. Use carefully because of free API limits.",
      href: "/daily-collection",
      visibility: "Hidden",
    },
    {
      title: "Generated Brief",
      description:
        "View articles manually saved to the local generated brief during testing.",
      href: "/generated-brief",
      visibility: "Hidden",
    },
  ];

  const previewTools: AdminTool[] = [
    {
      title: "Generated Email",
      description:
        "Preview and send a test email from manually saved local brief articles.",
      href: "/generated-email",
      visibility: "Hidden",
    },
    {
      title: "Daily Email Preview",
      description: "Static sample of the daily email layout using demo data.",
      href: "/email-preview",
      visibility: "Hidden",
    },
    {
      title: "Generated Article Detail",
      description:
        "Detail page used by locally generated brief articles. Usually reached from Generated Email.",
      href: "/generated-article/[id]",
      visibility: "Linked indirectly",
    },
    {
      title: "Legacy Article Detail",
      description:
        "Demo article detail route used by the static email preview sample.",
      href: "/article/[id]",
      visibility: "Linked indirectly",
    },
  ];

  const diagnosticTools: AdminTool[] = [
    {
      title: "AI Test",
      description: "Manual Gemini connectivity and response test page.",
      href: "/ai-test",
      visibility: "Hidden",
    },
    {
      title: "News Test",
      description: "Manual public news API test page.",
      href: "/news-test",
      visibility: "Hidden",
    },
    {
      title: "Supabase Test",
      description:
        "Check whether the app is connected to Supabase Auth and database.",
      href: "/supabase-test",
      visibility: "Hidden",
    },
  ];

  const routeInventory: AdminTool[] = [
    {
      title: "Home",
      description: "Main public article feed.",
      href: "/",
      visibility: "Public",
    },
    {
      title: "Stock",
      description: "Public stock watchlist and market news page.",
      href: "/stock",
      visibility: "Public",
    },
    {
      title: "Subscribe",
      description: "Public subscription signup flow.",
      href: "/subscribe",
      visibility: "Public",
    },
    {
      title: "Login",
      description: "Public login page.",
      href: "/login",
      visibility: "Public",
    },
    {
      title: "Signup",
      description: "Public signup page, linked from login flow.",
      href: "/signup",
      visibility: "Linked indirectly",
    },
    {
      title: "My Topics",
      description: "User topic and email preference settings.",
      href: "/settings/topics",
      visibility: "Public",
    },
    {
      title: "Brief Article Detail",
      description: "Article detail route reached from the Home feed.",
      href: "/brief-article/[id]",
      visibility: "Linked indirectly",
    },
    {
      title: "Topic Detail",
      description: "Topic-specific article list route.",
      href: "/topic/[topic]",
      visibility: "Linked indirectly",
    },
    {
      title: "Unsubscribe",
      description: "Email unsubscribe route, mainly reached from emails.",
      href: "/unsubscribe",
      visibility: "Linked indirectly",
    },
    ...operationTools,
    ...previewTools,
    ...diagnosticTools,
  ];

  const tabs: Array<{
    id: AdminTab;
    label: string;
    description: string;
    tools: AdminTool[];
  }> = [
    {
      id: "operations",
      label: "Operations",
      description:
        "Pages used to run collection, AI processing, and saved-brief workflows.",
      tools: operationTools,
    },
    {
      id: "previews",
      label: "Previews",
      description:
        "Email and generated-content previews that are useful during development.",
      tools: previewTools,
    },
    {
      id: "diagnostics",
      label: "Diagnostics",
      description:
        "Connectivity and API test pages that should stay out of the public navbar.",
      tools: diagnosticTools,
    },
    {
      id: "routes",
      label: "Route Map",
      description:
        "All user-visible and hidden pages currently present in the app.",
      tools: routeInventory,
    },
  ];

  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  const visibilityClass: Record<AdminTool["visibility"], string> = {
    Public: "border-green-500/30 bg-green-500/10 text-green-200",
    Hidden: "border-[#F47725]/30 bg-[#F47725]/10 text-[#ffb17a]",
    "Linked indirectly": "border-sky-500/30 bg-sky-500/10 text-sky-200",
  };

  const hiddenRoutes = routeInventory.filter(
    (item) => item.visibility !== "Public"
  );

  function isConcreteHref(href: string) {
    return !href.includes("[");
  }

  function isSubscriberResult(result: unknown): result is SubscriberResult {
    return Boolean(
      result &&
        typeof result === "object" &&
        "email" in result &&
        "articlesSent" in result
    );
  }

  function isCollectionTopicResult(
    result: unknown
  ): result is CollectionTopicResult {
    return Boolean(
      result &&
        typeof result === "object" &&
        "topic" in result &&
        "englishFetched" in result &&
        "aiProcessed" in result
    );
  }

  function renderStatCard(label: string, value: string | number, note?: string) {
    return (
      <div className="rounded-2xl border border-[#454550] bg-[#303039] p-5">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="mt-2 text-3xl font-bold text-white">{value}</p>
        {note && <p className="mt-2 text-xs leading-5 text-slate-500">{note}</p>}
      </div>
    );
  }

  function renderBreakdown(items: Record<string, number>) {
    const entries = Object.entries(items);

    if (entries.length === 0) {
      return <p className="text-sm text-slate-500">No data yet.</p>;
    }

    return (
      <div className="space-y-2">
        {entries.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="truncate text-slate-300">{label}</span>
            <span className="font-semibold text-white">{value}</span>
          </div>
        ))}
      </div>
    );
  }

  function renderToolCard(item: AdminTool) {
    const content = (
      <>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-xl font-semibold">{item.title}</h3>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
              visibilityClass[item.visibility]
            }`}
          >
            {item.visibility}
          </span>
        </div>

        <p className="text-sm leading-6 text-slate-400">{item.description}</p>
        <p className="mt-4 text-xs font-semibold text-slate-500">
          {item.href}
        </p>
      </>
    );

    if (!isConcreteHref(item.href)) {
      return (
        <div
          key={item.href}
          className="rounded-2xl border border-[#454550] bg-[#303039] p-6 shadow-sm"
        >
          {content}
        </div>
      );
    }

    return (
      <Link
        key={item.href}
        href={item.href}
        className="rounded-2xl border border-[#454550] bg-[#303039] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#F47725]/70 hover:bg-[#383843]"
      >
        {content}
      </Link>
    );
  }

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

        <div className="mb-8 rounded-3xl border border-[#454550] bg-[#303039] p-6">
          <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#ffb17a]">
                Operations Snapshot
              </p>
              <h2 className="text-2xl font-semibold">Admin Stats</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Private stats for users, subscriptions, collection volume, AI
                processing, configured API usage, and today&apos;s email
                delivery logs.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadAdminStats()}
              disabled={statsLoading}
              className="rounded-xl border border-[#F47725]/50 bg-[#F47725]/10 px-5 py-3 text-sm font-semibold text-[#ffb17a] hover:bg-[#F47725]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statsLoading ? "Loading Stats..." : "Refresh Stats"}
            </button>
          </div>

          {statsError && (
            <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              {statsError}
            </div>
          )}

          {!adminStats && !statsError && (
            <div className="rounded-2xl border border-[#454550] bg-[#26262C] p-5 text-sm text-slate-400">
              Enter CRON_SECRET and click Refresh Stats to load private
              operating metrics.
            </div>
          )}

          {adminStats && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {renderStatCard("Registered Users", adminStats.users.registered)}
                {renderStatCard("Subscribed Users", adminStats.users.subscribed)}
                {renderStatCard(
                  "Collected Today",
                  adminStats.collection.todayTotal,
                  `${adminStats.collection.englishToday} EN / ${adminStats.collection.koreanToday} KO`
                )}
                {renderStatCard(
                  "AI Processed Today",
                  adminStats.collection.aiProcessedToday,
                  `${adminStats.collection.awaitingAiToday} waiting`
                )}
                {renderStatCard(
                  "Recent News Window",
                  `${adminStats.collection.recentTotal}`,
                  `${adminStats.recentWindowHours}h published articles`
                )}
                {renderStatCard(
                  "Email Success Today",
                  adminStats.email.sentToday,
                  `${adminStats.email.failedToday} failed`
                )}
                {renderStatCard(
                  "Articles Emailed",
                  adminStats.email.articlesSentToday
                )}
                {renderStatCard(
                  "Gemini Calls Est.",
                  adminStats.apiUsage.gemini.estimatedCallsToday,
                  adminStats.apiUsage.gemini.model
                )}
                {renderStatCard(
                  "Gemini Tokens Est.",
                  adminStats.apiUsage.gemini.estimatedTokensToday.toLocaleString(),
                  "Approx. saved text tokens"
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                  <h3 className="mb-4 font-semibold">API Usage</h3>
                  <div className="space-y-3 text-sm text-slate-300">
                    <p>
                      GNews budget:{" "}
                      <span className="font-semibold text-white">
                        {adminStats.apiUsage.gnews.dailyRequestBudget}
                      </span>{" "}
                      req/day
                    </p>
                    <p>
                      GNews per collection:{" "}
                      <span className="font-semibold text-white">
                        {
                          adminStats.apiUsage.gnews
                            .configuredRequestsPerCollection
                        }
                      </span>{" "}
                      requests
                    </p>
                    <p>
                      AI coverage:{" "}
                      <span className="font-semibold text-white">
                        {Math.round(
                          adminStats.apiUsage.gemini
                            .configuredAiProcessingCoverage * 100
                        )}
                        %
                      </span>
                    </p>
                    <p>
                      Gemini delay:{" "}
                      <span className="font-semibold text-white">
                        {
                          adminStats.apiUsage.gemini
                            .configuredAiProcessingDelayMs
                        }
                        ms
                      </span>
                    </p>
                    <p>
                      AI concurrency:{" "}
                      <span className="font-semibold text-white">
                        {
                          adminStats.apiUsage.gemini
                            .configuredAiProcessingConcurrency
                        }
                      </span>
                    </p>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    {adminStats.apiUsage.gemini.note}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                  <h3 className="mb-4 font-semibold">Collected by Topic</h3>
                  {renderBreakdown(adminStats.collection.byTopic)}
                </div>

                <div className="rounded-2xl border border-[#454550] bg-[#26262C] p-5">
                  <h3 className="mb-4 font-semibold">User Languages</h3>
                  {renderBreakdown(adminStats.users.languagePreferences)}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="overflow-x-auto rounded-2xl border border-[#454550] bg-[#26262C]">
                  <div className="border-b border-[#454550] p-5">
                    <h3 className="font-semibold">Subscribed Recipients</h3>
                  </div>
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">Email</th>
                        <th className="px-5 py-3 font-medium">Time</th>
                        <th className="px-5 py-3 font-medium">Timezone</th>
                        <th className="px-5 py-3 font-medium">Language</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.users.subscribers.map((subscriber) => (
                        <tr
                          key={subscriber.email}
                          className="border-t border-[#454550]"
                        >
                          <td className="px-5 py-4 text-white">
                            {subscriber.email}
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {subscriber.sendTime || "-"}
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {subscriber.timezone || "-"}
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {subscriber.languagePreference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#454550] bg-[#26262C]">
                  <div className="border-b border-[#454550] p-5">
                    <h3 className="font-semibold">Today&apos;s Email Log</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {adminStats.email.logMessage}
                    </p>
                  </div>
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-medium">Email</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Articles</th>
                        <th className="px-5 py-3 font-medium">Language</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.email.recipients.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-5 py-6 text-center text-slate-500"
                          >
                            No email delivery logs for today.
                          </td>
                        </tr>
                      )}
                      {adminStats.email.recipients.map((recipient) => (
                        <tr
                          key={`${recipient.email}-${recipient.created_at}`}
                          className="border-t border-[#454550]"
                        >
                          <td className="px-5 py-4 text-white">
                            {recipient.email}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                recipient.success
                                  ? "bg-emerald-500/10 text-emerald-300"
                                  : "bg-red-500/10 text-red-300"
                              }`}
                            >
                              {recipient.success ? "Sent" : "Failed"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {recipient.articles_sent}
                          </td>
                          <td className="px-5 py-4 text-slate-300">
                            {recipient.language_preference || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-8 rounded-3xl border border-[#F47725]/30 bg-[#F47725]/10 p-6">
          <div className="mb-6">
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-[#ffb17a]">
              Manual Job Runner
            </p>

            <h2 className="text-2xl font-semibold">Daily Brief Controls</h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Run the same collection and email jobs that Vercel Cron calls
              every morning, or preview the email before sending.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
            <input
              type="password"
              value={cronSecret}
              onChange={(event) => setCronSecret(event.target.value)}
              placeholder="Enter CRON_SECRET"
              className="rounded-xl border border-[#454550] bg-[#26262C] px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-[#F47725]"
            />

            <button
              type="button"
              onClick={runDailyCollectionJob}
              disabled={loading}
              className="rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && activeJob === "collection"
                ? "Collecting..."
                : "Collect News"}
            </button>

            <Link
              href="/email-preview"
              className="rounded-xl border border-[#454550] bg-[#26262C] px-5 py-3 text-center font-semibold text-zinc-200 hover:border-[#F47725]/70 hover:text-white"
            >
              View Email Draft
            </Link>

            <button
              type="button"
              onClick={runDailyBriefJob}
              disabled={loading}
              className="rounded-xl bg-[#F47725] px-5 py-3 font-semibold text-white hover:bg-[#ff8a3d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && activeJob === "email" ? "Sending..." : "Send Email"}
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

            {typeof jobResult.subscribersChecked === "number" && (
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
            )}

            {typeof jobResult.topicsProcessed === "number" && (
              <div className="mb-6 grid gap-4 md:grid-cols-5">
                <div className="rounded-2xl border border-green-500/20 bg-[#26262C]/60 p-5">
                  <p className="text-sm text-green-100/60">Topics</p>
                  <p className="mt-2 text-3xl font-bold text-green-50">
                    {jobResult.topicsProcessed}
                  </p>
                </div>
                <div className="rounded-2xl border border-green-500/20 bg-[#26262C]/60 p-5">
                  <p className="text-sm text-green-100/60">
                    AI Coverage
                  </p>
                  <p className="mt-2 text-3xl font-bold text-green-50">
                    {Math.round((jobResult.aiProcessingCoverage ?? 0) * 100)}%
                  </p>
                </div>
                <div className="rounded-2xl border border-green-500/20 bg-[#26262C]/60 p-5">
                  <p className="text-sm text-green-100/60">
                    Recent Window
                  </p>
                  <p className="mt-2 text-3xl font-bold text-green-50">
                    {jobResult.recentNewsWindowHours ?? 24}h
                  </p>
                </div>
                <div className="rounded-2xl border border-green-500/20 bg-[#26262C]/60 p-5">
                  <p className="text-sm text-green-100/60">
                    GNews Requests / Topic
                  </p>
                  <p className="mt-2 text-3xl font-bold text-green-50">
                    {jobResult.requestsPerTopic ?? 0}
                  </p>
                </div>
                <div className="rounded-2xl border border-green-500/20 bg-[#26262C]/60 p-5">
                  <p className="text-sm text-green-100/60">AI Concurrency</p>
                  <p className="mt-2 text-3xl font-bold text-green-50">
                    {jobResult.aiProcessingConcurrency ?? 1}
                  </p>
                </div>
                <div className="rounded-2xl border border-green-500/20 bg-[#26262C]/60 p-5">
                  <p className="text-sm text-green-100/60">
                    Deleted Old Articles
                  </p>
                  <p className="mt-2 text-3xl font-bold text-green-50">
                    {jobResult.expiredArticlesDeleted ?? 0}
                  </p>
                </div>
              </div>
            )}

            {jobResult.results &&
              jobResult.results.length > 0 &&
              isSubscriberResult(jobResult.results[0]) && (
              <div className="overflow-x-auto rounded-2xl border border-green-500/20">
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <thead className="bg-[#26262C]/80 text-green-100/70">
                    <tr>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Topics</th>
                      <th className="px-4 py-3 font-medium">Articles Sent</th>
                      <th className="px-4 py-3 font-medium">Language</th>
                      <th className="px-4 py-3 font-medium">Error</th>
                    </tr>
                  </thead>

                  <tbody>
                    {jobResult.results.map((result) => (
                      isSubscriberResult(result) && (
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
                          {result.languagePreference || "-"}
                        </td>

                        <td className="px-4 py-4 text-green-100/80">
                          {result.error || "None"}
                        </td>
                      </tr>
                      )
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {jobResult.results &&
              jobResult.results.length > 0 &&
              isCollectionTopicResult(jobResult.results[0]) && (
                <div className="overflow-x-auto rounded-2xl border border-green-500/20">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-[#26262C]/80 text-green-100/70">
                      <tr>
                        <th className="px-4 py-3 font-medium">Topic</th>
                        <th className="px-4 py-3 font-medium">EN Fetched</th>
                        <th className="px-4 py-3 font-medium">EN Saved</th>
                        <th className="px-4 py-3 font-medium">KO Fetched</th>
                        <th className="px-4 py-3 font-medium">KO Saved</th>
                        <th className="px-4 py-3 font-medium">AI Candidates</th>
                        <th className="px-4 py-3 font-medium">AI Target</th>
                        <th className="px-4 py-3 font-medium">AI Existing</th>
                        <th className="px-4 py-3 font-medium">AI Done</th>
                        <th className="px-4 py-3 font-medium">AI Failed</th>
                      </tr>
                    </thead>

                    <tbody>
                      {jobResult.results.map(
                        (result) =>
                          isCollectionTopicResult(result) && (
                            <tr
                              key={result.topic}
                              className="border-t border-green-500/20"
                            >
                              <td className="px-4 py-4 text-green-50">
                                {result.topic}
                              </td>
                              <td className="px-4 py-4 text-green-100/80">
                                {result.englishFetched}
                              </td>
                              <td className="px-4 py-4 text-green-100/80">
                                {result.englishSaved}
                              </td>
                              <td className="px-4 py-4 text-green-100/80">
                                {result.koreanFetched}
                              </td>
                              <td className="px-4 py-4 text-green-100/80">
                                {result.koreanSaved}
                              </td>
                              <td className="px-4 py-4 text-green-100/80">
                                {result.aiCandidates}
                              </td>
                              <td className="px-4 py-4 text-green-100/80">
                                {result.aiTargeted}
                              </td>
                              <td className="px-4 py-4 text-green-100/80">
                                {result.aiAlreadyProcessed}
                              </td>
                              <td className="px-4 py-4 text-green-100/80">
                                {result.aiProcessed}
                              </td>
                              <td className="px-4 py-4 text-green-100/80">
                                {result.failedAi}
                              </td>
                            </tr>
                          )
                      )}
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

        <div className="mb-6 rounded-3xl border border-[#454550] bg-[#303039] p-6">
          <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-semibold">Admin Tools</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Hidden and indirect pages are grouped here instead of being
                scattered across unrelated flows. Current hidden or indirect
                pages found: {hiddenRoutes.length}.
              </p>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2 border-b border-[#454550] pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-[#F47725] text-white"
                    : "border border-[#454550] bg-[#26262C] text-slate-300 hover:border-[#F47725]/70 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mb-5">
            <h3 className="text-xl font-semibold">{currentTab.label}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {currentTab.description}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {currentTab.tools.map((item) => renderToolCard(item))}
          </div>
        </div>
      </section>
    </main>
  );
}
