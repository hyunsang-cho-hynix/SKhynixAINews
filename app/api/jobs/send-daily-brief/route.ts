import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type NewsLanguagePreference = "en" | "ko" | "both";

type UserPreference = {
  user_id: string;
  email: string;
  mandatory_topics: string[];
  optional_topics: string[];
  send_time: string;
  timezone: string;
  news_language_preference: NewsLanguagePreference;
  is_subscribed: boolean;
};

type ProcessedArticle = {
  id: string;
  topic: string;
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
  is_ai_processed: boolean;
  collection_date: string | null;
};

type EmailArticle = {
  id: string;
  topic: string;
  polishedTitle: string;
  polishedTitleKo: string | null;
  summary: string;
  summaryKo: string | null;
  importanceScore: number;
  reason: string;
  reasonKo: string | null;
  source: string;
  publishedAt: string;
  internalArticleUrl: string;
};

type SubscriberResult = {
  email: string;
  success: boolean;
  languagePreference: NewsLanguagePreference;
  topicsRequested: string[];
  articlesSent: number;
  error?: string;
};

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uniqueTopics(topics: string[]) {
  return Array.from(new Set(topics.filter(Boolean)));
}

function normalizeLanguagePreference(
  value: string | null | undefined
): NewsLanguagePreference {
  if (value === "ko" || value === "both") {
    return value;
  }

  return "en";
}

function getEmailSubject(languagePreference: NewsLanguagePreference) {
  if (languagePreference === "ko") {
    return "오늘의 반도체 및 기술 뉴스 브리프";
  }

  if (languagePreference === "both") {
    return "Daily Semiconductor & Technology Brief / 오늘의 기술 뉴스 브리프";
  }

  return "Daily Semiconductor & Technology Brief";
}

function getArticleDisplayText(
  article: EmailArticle,
  languagePreference: NewsLanguagePreference
) {
  if (languagePreference === "ko") {
    return {
      title: article.polishedTitleKo || article.polishedTitle,
      summary: article.summaryKo || article.summary,
      reason: article.reasonKo || article.reason,
    };
  }

  if (languagePreference === "both") {
    return {
      title: article.polishedTitle,
      summary: article.summary,
      reason: article.reason,
      koreanTitle: article.polishedTitleKo || "",
      koreanSummary: article.summaryKo || "",
      koreanReason: article.reasonKo || "",
    };
  }

  return {
    title: article.polishedTitle,
    summary: article.summary,
    reason: article.reason,
  };
}

function buildEmailHtml({
  userEmail,
  articles,
  languagePreference,
}: {
  userEmail: string;
  articles: EmailArticle[];
  languagePreference: NewsLanguagePreference;
}) {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const unsubscribeUrl = `${appBaseUrl}/unsubscribe?email=${encodeURIComponent(
    userEmail
  )}`;

  const manageTopicsUrl = `${appBaseUrl}/settings/topics`;

  const today = new Date().toLocaleDateString(
    languagePreference === "ko" ? "ko-KR" : "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );

  const headerTitle =
    languagePreference === "ko"
      ? "오늘의 반도체 및 기술 뉴스 브리프"
      : "Daily Semiconductor & Technology Brief";

  const introText =
    languagePreference === "ko"
      ? "안녕하세요. 저장된 관심 토픽을 기준으로 AI가 선별하고 요약한 오늘의 기술 뉴스 브리프입니다."
      : "Good morning. Here is your daily AI-curated technology news brief based on your saved topic preferences.";

  const groupedArticles = articles.reduce<Record<string, EmailArticle[]>>(
    (groups, article) => {
      if (!groups[article.topic]) {
        groups[article.topic] = [];
      }

      groups[article.topic].push(article);
      return groups;
    },
    {}
  );

  const topicSections = Object.entries(groupedArticles)
    .map(([topic, topicArticles]) => {
      const articleCards = topicArticles
        .map((article) => {
          const display = getArticleDisplayText(article, languagePreference);

          const bilingualBlock =
            languagePreference === "both" &&
            "koreanSummary" in display &&
            display.koreanSummary
              ? `
                <div class="email-panel" style="margin:14px 0; padding:12px; background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
                  <p class="email-muted" style="margin:0 0 6px; color:#94a3b8; font-size:11px; font-weight:700; text-transform:uppercase;">
                    Korean Translation
                  </p>
                  ${
                    display.koreanTitle
                      ? `<p class="email-title" style="margin:0 0 8px; color:#0f172a; font-size:15px; font-weight:700; line-height:1.5;">${escapeHtml(
                          display.koreanTitle
                        )}</p>`
                      : ""
                  }
                  <p class="email-copy" style="margin:0; color:#475569; font-size:13px; line-height:1.6;">
                    ${escapeHtml(display.koreanSummary)}
                  </p>
                </div>
              `
              : "";

          return `
            <tr>
              <td class="email-card" bgcolor="#f8fafc" style="padding:18px; border:1px solid #e2e8f0; border-radius:14px; background:#f8fafc;">
                <div style="margin-bottom:8px;">
                  <span style="display:inline-block; padding:4px 10px; border-radius:999px; background:#F47725; color:#ffffff; font-size:12px; font-weight:700;">
                    ${escapeHtml(article.topic)}
                  </span>
                  <span style="float:right; color:#16a34a; font-size:12px; font-weight:700;">
                    AI Processed
                  </span>
                </div>

                <h3 class="email-title" style="margin:12px 0; color:#0f172a; font-size:20px; line-height:1.35;">
                  ${escapeHtml(display.title)}
                </h3>

                <p class="email-copy" style="margin:0 0 14px; color:#475569; font-size:14px; line-height:1.6;">
                  ${escapeHtml(display.summary)}
                </p>

                ${bilingualBlock}

                <div class="email-panel" style="margin:14px 0; padding:12px; background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
                  <p class="email-muted" style="margin:0 0 4px; color:#94a3b8; font-size:11px; font-weight:700; text-transform:uppercase;">
                    ${
                      languagePreference === "ko"
                        ? "중요 포인트"
                        : "Why this matters"
                    }
                  </p>
                  <p class="email-copy" style="margin:0; color:#475569; font-size:13px; line-height:1.5;">
                    ${escapeHtml(display.reason)}
                  </p>
                </div>

                <p class="email-muted" style="margin:0 0 14px; color:#64748b; font-size:12px;">
                  Source: ${escapeHtml(article.source)}<br />
                  Published: ${escapeHtml(article.publishedAt)}<br />
                  Score: ${article.importanceScore}/10
                </p>

                <a href="${escapeHtml(article.internalArticleUrl)}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#F47725; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none;">
                  ${languagePreference === "ko" ? "전체 브리프 보기" : "Read Full Brief"}
                </a>
              </td>
            </tr>
            <tr><td style="height:14px;"></td></tr>
          `;
        })
        .join("");

      return `
        <tr>
          <td style="padding-top:24px;">
            <h2 class="email-title" style="margin:0 0 12px; padding-bottom:8px; border-bottom:1px solid #e2e8f0; color:#0f172a; font-size:22px;">
              ${escapeHtml(topic)}
            </h2>

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              ${articleCards}
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta name="color-scheme" content="light only">
        <meta name="supported-color-schemes" content="light only">
        <style>
          :root { color-scheme: light only; supported-color-schemes: light only; }
          .email-force-light { background-color:#f1f5f9 !important; }
          .email-paper { background-color:#ffffff !important; border-color:#e2e8f0 !important; }
          .email-header { background:#fff7ed !important; background-image:linear-gradient(135deg,#fff7ed,#ffffff) !important; color:#0f172a !important; }
          .email-card { background-color:#f8fafc !important; border-color:#e2e8f0 !important; }
          .email-panel { background-color:#ffffff !important; border-color:#e2e8f0 !important; }
          .email-title { color:#0f172a !important; }
          .email-copy { color:#475569 !important; }
          .email-muted { color:#64748b !important; }
          [data-ogsc] .email-force-light { background-color:#f1f5f9 !important; }
          [data-ogsc] .email-paper, [data-ogsc] .email-panel { background-color:#ffffff !important; }
          [data-ogsc] .email-card { background-color:#f8fafc !important; }
          [data-ogsc] .email-title { color:#0f172a !important; }
          [data-ogsc] .email-copy { color:#475569 !important; }
          [data-ogsc] .email-muted { color:#64748b !important; }
          @media (prefers-color-scheme: dark) {
            .email-force-light { background-color:#f1f5f9 !important; }
            .email-paper, .email-panel { background-color:#ffffff !important; }
            .email-card { background-color:#f8fafc !important; }
            .email-header { background:#fff7ed !important; background-image:linear-gradient(135deg,#fff7ed,#ffffff) !important; }
            .email-title { color:#0f172a !important; }
            .email-copy { color:#475569 !important; }
            .email-muted { color:#64748b !important; }
          }
        </style>
      </head>
      <body class="email-force-light" style="margin:0; padding:0; background:#f1f5f9; font-family:Arial, sans-serif;">
        <table class="email-force-light" width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#f1f5f9" style="background:#f1f5f9; padding:32px 12px;">
          <tr>
            <td align="center">
              <table class="email-paper" width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#ffffff" style="max-width:720px; background:#ffffff; border:1px solid #e2e8f0; border-radius:20px; overflow:hidden;">
                <tr>
                  <td class="email-header" bgcolor="#fff7ed" style="padding:32px; background:linear-gradient(135deg,#fff7ed,#ffffff); color:#0f172a;">
                    <p style="margin:0 0 8px; color:#F47725; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">
                      Tech AI News Brief
                    </p>
                    <h1 class="email-title" style="margin:0; color:#0f172a; font-size:30px; line-height:1.2;">
                      ${escapeHtml(headerTitle)}
                    </h1>
                    <p class="email-muted" style="margin:12px 0 0; color:#64748b; font-size:14px;">
                      ${escapeHtml(today)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 32px 0;">
                    <p class="email-copy" style="margin:0; color:#475569; font-size:14px; line-height:1.6;">
                      ${escapeHtml(introText)}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 32px 32px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      ${topicSections}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="email-card email-muted" bgcolor="#f8fafc" style="padding:24px 32px; background:#f8fafc; color:#64748b; font-size:12px; text-align:center;">
                    <p style="margin:0;">
                      Sent to ${escapeHtml(userEmail)} because you subscribed to Tech AI News.
                    </p>
                    <p style="margin:8px 0 0;">
                      <a href="${escapeHtml(manageTopicsUrl)}" style="color:#F47725; text-decoration:none;">Manage topics</a>
                      &nbsp;·&nbsp;
                      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#F47725; text-decoration:none;">Unsubscribe</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function getTodayAiProcessedArticlesForTopics({
  topics,
  appBaseUrl,
}: {
  topics: string[];
  appBaseUrl: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const maxArticlesPerTopic = Number(
    process.env.EMAIL_ARTICLES_PER_TOPIC || "3"
  );

  const emailArticles: EmailArticle[] = [];

  for (const topic of topics) {
    const { data, error } = await supabaseAdmin
      .from("processed_articles")
      .select(
        "id, topic, polished_title, polished_title_ko, summary, summary_ko, importance_score, reason, reason_ko, source, published_at, original_url, image_url, is_ai_processed, collection_date"
      )
      .eq("topic", topic)
      .eq("is_ai_processed", true)
      .eq("collection_date", today)
      .order("importance_score", { ascending: false })
      .limit(maxArticlesPerTopic);

    if (error) {
      throw error;
    }

    const articles = (data || []) as ProcessedArticle[];

    for (const article of articles) {
      emailArticles.push({
        id: article.id,
        topic: article.topic,
        polishedTitle: article.polished_title,
        polishedTitleKo: article.polished_title_ko,
        summary: article.summary,
        summaryKo: article.summary_ko,
        importanceScore: article.importance_score,
        reason: article.reason,
        reasonKo: article.reason_ko,
        source: article.source,
        publishedAt: new Date(article.published_at).toLocaleString(),
        internalArticleUrl: `${appBaseUrl}/brief-article/${article.id}`,
      });
    }
  }

  return emailArticles;
}

async function processSubscriber({
  subscriber,
  resendApiKey,
  appBaseUrl,
}: {
  subscriber: UserPreference;
  resendApiKey: string;
  appBaseUrl: string;
}): Promise<SubscriberResult> {
  const languagePreference = normalizeLanguagePreference(
    subscriber.news_language_preference
  );

  const topics = uniqueTopics([
    ...(subscriber.mandatory_topics || []),
    ...(subscriber.optional_topics || []),
  ]);

  const emailArticles = await getTodayAiProcessedArticlesForTopics({
    topics,
    appBaseUrl,
  });

  if (emailArticles.length === 0) {
    return {
      email: subscriber.email,
      success: false,
      languagePreference,
      topicsRequested: topics,
      articlesSent: 0,
      error:
        "No AI processed articles found for this subscriber's topics today.",
    };
  }

  emailArticles.sort((a, b) => b.importanceScore - a.importanceScore);

  const resend = new Resend(resendApiKey);

  const { error: emailError } = await resend.emails.send({
    from: "Tech AI News <onboarding@resend.dev>",
    to: [subscriber.email],
    subject: getEmailSubject(languagePreference),
    html: buildEmailHtml({
      userEmail: subscriber.email,
      articles: emailArticles,
      languagePreference,
    }),
  });

  if (emailError) {
    return {
      email: subscriber.email,
      success: false,
      languagePreference,
      topicsRequested: topics,
      articlesSent: emailArticles.length,
      error: JSON.stringify(emailError),
    };
  }

  return {
    email: subscriber.email,
    success: true,
    languagePreference,
    topicsRequested: topics,
    articlesSent: emailArticles.length,
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
          error: "Unauthorized cron request.",
        },
        { status: 401 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const maxSubscribers = Number(process.env.MAX_EMAIL_SUBSCRIBERS || "400");

    const { data: subscribers, error: subscriberError } = await supabaseAdmin
      .from("user_topic_preferences")
      .select("*")
      .eq("is_subscribed", true)
      .limit(maxSubscribers);

    if (subscriberError) {
      throw subscriberError;
    }

    const subscribedUsers = (subscribers || []) as UserPreference[];

    if (subscribedUsers.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No subscribed users found.",
      });
    }

    const results: SubscriberResult[] = [];

    for (const subscriber of subscribedUsers) {
      const result = await processSubscriber({
        subscriber,
        resendApiKey,
        appBaseUrl,
      });

      results.push(result);
    }

    const successfulSends = results.filter((result) => result.success).length;
    const failedSends = results.filter((result) => !result.success).length;

    return NextResponse.json({
      success: successfulSends > 0,
      message: "Daily email job completed using stored AI processed articles.",
      subscribersChecked: subscribedUsers.length,
      successfulSends,
      failedSends,
      results,
    });
  } catch (error) {
    console.error("Daily brief email job error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send daily brief emails.",
      },
      { status: 500 }
    );
  }
}

