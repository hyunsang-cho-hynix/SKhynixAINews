import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const COLLECTION_TOPIC_COUNT = 7;
const RECENT_WINDOW_HOURS = 24;

type ArticleStatsRow = {
  topic: string | null;
  original_language: string | null;
  is_ai_processed: boolean | null;
  source: string | null;
  published_at: string | null;
  ai_model: string | null;
  summary?: string | null;
  summary_ko?: string | null;
  reason?: string | null;
  reason_ko?: string | null;
  source_text_excerpt?: string | null;
};

type SubscriberRow = {
  email: string;
  is_subscribed: boolean | null;
  send_time: string | null;
  timezone: string | null;
  news_language_preference: string | null;
};

type EmailLogRow = {
  email: string;
  success: boolean;
  articles_sent: number;
  language_preference: string | null;
  error: string | null;
  created_at: string;
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function groupCount<T extends string>(values: T[]) {
  return values.reduce<Record<string, number>>((groups, value) => {
    groups[value || "unknown"] = (groups[value || "unknown"] || 0) + 1;
    return groups;
  }, {});
}

function estimateTokensFromText(value: string | null | undefined) {
  if (!value) {
    return 0;
  }

  return Math.ceil(value.length / 4);
}

function estimateArticleTokens(article: ArticleStatsRow) {
  return (
    estimateTokensFromText(article.source_text_excerpt) +
    estimateTokensFromText(article.summary) +
    estimateTokensFromText(article.summary_ko) +
    estimateTokensFromText(article.reason) +
    estimateTokensFromText(article.reason_ko)
  );
}

async function getAuthUserCount() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  return data.users.length;
}

async function getEmailLogsForToday(today: string) {
  const { data, error } = await supabaseAdmin
    .from("email_delivery_logs")
    .select(
      "email, success, articles_sent, language_preference, error, created_at"
    )
    .eq("sent_date", today)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      available: false,
      message:
        "email_delivery_logs table is not available yet. Apply the Supabase SQL migration to persist send history.",
      logs: [] as EmailLogRow[],
    };
  }

  return {
    available: true,
    message: "Email delivery logs loaded.",
    logs: (data || []) as EmailLogRow[],
  };
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const { searchParams } = new URL(request.url);
    const requestSecret = searchParams.get("secret");
    const authHeader = request.headers.get("authorization");

    const isAuthorizedByQuery = requestSecret === cronSecret;
    const isAuthorizedByHeader = authHeader === `Bearer ${cronSecret}`;

    if (cronSecret && !isAuthorizedByQuery && !isAuthorizedByHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized admin stats request.",
        },
        { status: 401 }
      );
    }

    const today = todayKey();
    const recentCutoff = new Date(
      Date.now() - RECENT_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    const [
      authUserCount,
      subscriberResult,
      todayArticlesResult,
      recentArticlesResult,
      emailLogsResult,
    ] = await Promise.all([
      getAuthUserCount(),
      supabaseAdmin
        .from("user_topic_preferences")
        .select(
          "email, is_subscribed, send_time, timezone, news_language_preference"
        )
        .order("email"),
      supabaseAdmin
        .from("processed_articles")
        .select(
          "topic, original_language, is_ai_processed, source, published_at, ai_model, summary, summary_ko, reason, reason_ko, source_text_excerpt"
        )
        .eq("collection_date", today)
        .limit(10000),
      supabaseAdmin
        .from("processed_articles")
        .select(
          "topic, original_language, is_ai_processed, source, published_at, ai_model"
        )
        .gte("published_at", recentCutoff)
        .limit(10000),
      getEmailLogsForToday(today),
    ]);

    if (subscriberResult.error) {
      throw subscriberResult.error;
    }

    if (todayArticlesResult.error) {
      throw todayArticlesResult.error;
    }

    if (recentArticlesResult.error) {
      throw recentArticlesResult.error;
    }

    const subscribers = (subscriberResult.data || []) as SubscriberRow[];
    const todayArticles = (todayArticlesResult.data || []) as ArticleStatsRow[];
    const recentArticles = (recentArticlesResult.data || []) as ArticleStatsRow[];
    const emailLogs = emailLogsResult.logs;

    const subscribedUsers = subscribers.filter((user) => user.is_subscribed);
    const aiProcessedToday = todayArticles.filter(
      (article) => article.is_ai_processed
    );
    const estimatedGeminiTokensToday = aiProcessedToday.reduce(
      (sum, article) => sum + estimateArticleTokens(article),
      0
    );
    const englishToday = todayArticles.filter(
      (article) => article.original_language === "en"
    ).length;
    const koreanToday = todayArticles.filter(
      (article) => article.original_language === "ko"
    ).length;

    const successfulEmailLogs = emailLogs.filter((log) => log.success);
    const failedEmailLogs = emailLogs.filter((log) => !log.success);

    const gnewsDailyRequestBudget = Number(
      process.env.GNEWS_DAILY_REQUEST_BUDGET || "35"
    );
    const requestsPerTopic = Math.max(
      1,
      Math.floor(gnewsDailyRequestBudget / COLLECTION_TOPIC_COUNT)
    );

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      today,
      recentWindowHours: RECENT_WINDOW_HOURS,
      users: {
        registered: authUserCount,
        preferenceRows: subscribers.length,
        subscribed: subscribedUsers.length,
        unsubscribed: subscribers.length - subscribedUsers.length,
        languagePreferences: groupCount(
          subscribers.map((user) => user.news_language_preference || "en")
        ),
        subscribers: subscribedUsers.map((user) => ({
          email: user.email,
          sendTime: user.send_time,
          timezone: user.timezone,
          languagePreference: user.news_language_preference || "en",
        })),
      },
      collection: {
        todayTotal: todayArticles.length,
        recentTotal: recentArticles.length,
        englishToday,
        koreanToday,
        aiProcessedToday: aiProcessedToday.length,
        awaitingAiToday: todayArticles.length - aiProcessedToday.length,
        byTopic: groupCount(
          todayArticles.map((article) => article.topic || "unknown")
        ),
        byLanguage: groupCount(
          todayArticles.map((article) => article.original_language || "unknown")
        ),
      },
      email: {
        logAvailable: emailLogsResult.available,
        logMessage: emailLogsResult.message,
        sentToday: successfulEmailLogs.length,
        failedToday: failedEmailLogs.length,
        articlesSentToday: successfulEmailLogs.reduce(
          (sum, log) => sum + (log.articles_sent || 0),
          0
        ),
        recipients: emailLogs,
      },
      apiUsage: {
        gnews: {
          dailyRequestBudget: gnewsDailyRequestBudget,
          collectionTopics: COLLECTION_TOPIC_COUNT,
          requestsPerTopic,
          configuredRequestsPerCollection:
            requestsPerTopic * COLLECTION_TOPIC_COUNT,
          note: "GNews account-level usage is not exposed by the app; this shows configured collection budget.",
        },
        gemini: {
          model: "gemini-2.5-flash",
          estimatedCallsToday: aiProcessedToday.length,
          estimatedTokensToday: estimatedGeminiTokensToday,
          configuredAiArticlesPerTopic: Number(
            process.env.AI_ARTICLES_PER_TOPIC || "5"
          ),
          configuredAiProcessingCoverage: Number(
            process.env.AI_PROCESSING_COVERAGE || "0.8"
          ),
          configuredAiProcessingConcurrency: Number(
            process.env.AI_PROCESSING_CONCURRENCY || "4"
          ),
          configuredAiProcessingDelayMs: Number(
            process.env.AI_PROCESSING_DELAY_MS || "0"
          ),
          configuredDelayMs: Number(process.env.GEMINI_DELAY_MS || "3000"),
          note: "Gemini token spend is provider-side; this app estimates calls from AI processed articles saved today. Daily collection targets the configured coverage across English and Korean articles.",
        },
        resend: {
          loggedSendsToday: emailLogs.length,
          note: "Exact Resend delivery status is available after email_delivery_logs is created and send jobs run.",
        },
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load admin stats.",
      },
      { status: 500 }
    );
  }
}
