import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type UserPreference = {
  user_id: string;
  email: string;
  mandatory_topics: string[];
  optional_topics: string[];
  send_time: string;
  timezone: string;
  is_subscribed: boolean;
};

type GNewsArticle = {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
};

type AiResult = {
  polishedTitle: string;
  topic: string;
  summary: string;
  importanceScore: number;
  reason: string;
};

type ProcessedEmailArticle = {
  id: string;
  topic: string;
  polishedTitle: string;
  summary: string;
  importanceScore: number;
  reason: string;
  source: string;
  publishedAt: string;
  internalArticleUrl: string;
};

type SubscriberResult = {
  email: string;
  success: boolean;
  topicsRequested: string[];
  articlesSent: number;
  failedTopics: { topic: string; error: string }[];
  error?: string;
};

function getTopicQuery(topic: string) {
  const topicMap: Record<string, string> = {
    Semiconductor: "semiconductor OR HBM OR memory chip OR advanced packaging",
    AI: "artificial intelligence OR AI infrastructure OR AI chip",
    "SK hynix / Memory Industry": "SK hynix OR HBM OR memory semiconductor",
    Automation: "factory automation OR smart factory OR industrial automation",
    Robotics: "industrial robotics OR AI robotics OR warehouse robots",
    IT: "enterprise IT OR cybersecurity OR cloud infrastructure",
    Cloud: "cloud infrastructure OR data center OR enterprise cloud",
    Cybersecurity: "cybersecurity OR zero trust OR enterprise security",
    "Data Center": "data center OR AI data center OR cloud infrastructure",
    Manufacturing: "advanced manufacturing OR smart manufacturing",
  };

  return topicMap[topic] || topic;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function uniqueTopics(topics: string[]) {
  return Array.from(new Set(topics.filter(Boolean)));
}

function getLocalHour(timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
  });

  const hourString = formatter.format(new Date());
  return Number(hourString);
}

function shouldSendNow(subscriber: UserPreference) {
  const timezone = subscriber.timezone || "America/New_York";
  const localHour = getLocalHour(timezone);

  return localHour === 8;
}

async function fetchOneNewsArticle(topic: string, apiKey: string) {
  const query = getTopicQuery(topic);

  const url = new URL("https://gnews.io/api/v4/search");
  url.searchParams.set("q", query);
  url.searchParams.set("lang", "en");
  url.searchParams.set("country", "us");
  url.searchParams.set("max", "1");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url.toString(), {
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.errors?.[0] || `Failed to fetch news for topic: ${topic}`
    );
  }

  const article = data.articles?.[0] as GNewsArticle | undefined;

  if (!article) {
    throw new Error(`No article found for topic: ${topic}`);
  }

  return article;
}

async function processWithGemini(article: GNewsArticle, topic: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const prompt = `
You are an AI news analyst for an SK hynix-style internal daily technology briefing.

Analyze this public news article.

Expected topic:
${topic}

Article title:
${article.title}

Article description:
${article.description || article.content || "No description provided."}

Source:
${article.source?.name || "Unknown source"}

Return ONLY valid JSON.
Do not include markdown.

JSON format:
{
  "polishedTitle": "professional rewritten title",
  "topic": "Semiconductor | AI | SK hynix / Memory Industry | Automation | Robotics | IT | Cloud | Cybersecurity | Data Center | Manufacturing",
  "summary": "2 sentence professional summary",
  "importanceScore": number from 1 to 10,
  "reason": "brief reason why this article matters"
}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const text = response.text ?? "";

  const cleanedText = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleanedText) as AiResult;
  } catch {
    return {
      polishedTitle: article.title,
      topic,
      summary: cleanedText || article.description || article.title,
      importanceScore: 5,
      reason:
        "Gemini returned text that was not valid JSON, so the raw result was used as the summary.",
    };
  }
}

function buildEmailHtml({
  userEmail,
  articles,
}: {
  userEmail: string;
  articles: ProcessedEmailArticle[];
}) {
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const unsubscribeUrl = `${appBaseUrl}/unsubscribe?email=${encodeURIComponent(
    userEmail
  )}`;

  const manageTopicsUrl = `${appBaseUrl}/settings/topics`;

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const groupedArticles = articles.reduce<
    Record<string, ProcessedEmailArticle[]>
  >((groups, article) => {
    if (!groups[article.topic]) {
      groups[article.topic] = [];
    }

    groups[article.topic].push(article);
    return groups;
  }, {});

  const topicSections = Object.entries(groupedArticles)
    .map(([topic, topicArticles]) => {
      const articleCards = topicArticles
        .map((article) => {
          return `
            <tr>
              <td style="padding:18px; border:1px solid #e2e8f0; border-radius:14px; background:#f8fafc;">
                <div style="margin-bottom:8px;">
                  <span style="display:inline-block; padding:4px 10px; border-radius:999px; background:#dbeafe; color:#1d4ed8; font-size:12px; font-weight:700;">
                    ${escapeHtml(article.topic)}
                  </span>
                  <span style="float:right; color:#64748b; font-size:12px;">
                    Score ${article.importanceScore}/10
                  </span>
                </div>

                <h3 style="margin:12px 0; color:#0f172a; font-size:20px; line-height:1.35;">
                  ${escapeHtml(article.polishedTitle)}
                </h3>

                <p style="margin:0 0 14px; color:#475569; font-size:14px; line-height:1.6;">
                  ${escapeHtml(article.summary)}
                </p>

                <div style="margin:14px 0; padding:12px; background:#ffffff; border-radius:10px;">
                  <p style="margin:0 0 4px; color:#94a3b8; font-size:11px; font-weight:700; text-transform:uppercase;">
                    Why this matters
                  </p>
                  <p style="margin:0; color:#475569; font-size:13px; line-height:1.5;">
                    ${escapeHtml(article.reason)}
                  </p>
                </div>

                <p style="margin:0 0 14px; color:#64748b; font-size:12px;">
                  Source: ${escapeHtml(article.source)}<br />
                  Published: ${escapeHtml(article.publishedAt)}
                </p>

                <a href="${escapeHtml(article.internalArticleUrl)}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#2563eb; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none;">
                  Read Full Brief
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
            <h2 style="margin:0 0 12px; padding-bottom:8px; border-bottom:1px solid #e2e8f0; color:#0f172a; font-size:22px;">
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
      <body style="margin:0; padding:0; background:#0f172a; font-family:Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#0f172a; padding:32px 12px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:720px; background:#ffffff; border-radius:20px; overflow:hidden;">
                <tr>
                  <td style="padding:32px; background:linear-gradient(90deg,#2563eb,#06b6d4); color:#ffffff;">
                    <p style="margin:0 0 8px; color:#dbeafe; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">
                      SK hynix AI News Brief
                    </p>
                    <h1 style="margin:0; font-size:30px; line-height:1.2;">
                      Daily Semiconductor & Technology Brief
                    </h1>
                    <p style="margin:12px 0 0; color:#e0f2fe; font-size:14px;">
                      ${today}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 32px 0;">
                    <p style="margin:0; color:#475569; font-size:14px; line-height:1.6;">
                      Good morning. Here is your daily AI-curated technology news brief based on your saved topic preferences.
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
                  <td style="padding:24px 32px; background:#f1f5f9; color:#64748b; font-size:12px; text-align:center;">
                    <p style="margin:0;">
                      Sent to ${escapeHtml(userEmail)} because you subscribed to SK hynix AI News.
                    </p>
                    <p style="margin:8px 0 0;">
                      <a href="${escapeHtml(manageTopicsUrl)}" style="color:#2563eb; text-decoration:none;">Manage topics</a>
                      &nbsp;·&nbsp;
                      <a href="${escapeHtml(unsubscribeUrl)}" style="color:#2563eb; text-decoration:none;">Unsubscribe</a>
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

async function processSubscriber({
  subscriber,
  gnewsApiKey,
  resendApiKey,
  appBaseUrl,
}: {
  subscriber: UserPreference;
  gnewsApiKey: string;
  resendApiKey: string;
  appBaseUrl: string;
}): Promise<SubscriberResult> {
  const allTopics = uniqueTopics([
    ...(subscriber.mandatory_topics || []),
    ...(subscriber.optional_topics || []),
  ]);

  const topicsToProcess = allTopics.slice(0, 5);

  const processedArticles: ProcessedEmailArticle[] = [];
  const failedTopics: { topic: string; error: string }[] = [];

  for (const topic of topicsToProcess) {
    try {
      const newsArticle = await fetchOneNewsArticle(topic, gnewsApiKey);
      const aiResult = await processWithGemini(newsArticle, topic);

    //   const { data: insertedArticle, error: insertError } = await supabaseAdmin
    //     .from("processed_articles")
    //     .insert({
    //       topic: aiResult.topic || topic,
    //       original_title: newsArticle.title,
    //       polished_title: aiResult.polishedTitle,
    //       summary: aiResult.summary,
    //       importance_score: aiResult.importanceScore,
    //       reason: aiResult.reason,
    //       source: newsArticle.source?.name || "Unknown source",
    //       published_at: newsArticle.publishedAt,
    //       original_url: newsArticle.url,
    //       image_url: newsArticle.image,
    //     })
    //     .select("id")
    //     .single();

    //   if (insertError) {
    //     throw insertError;
    //   }

    //   const internalArticleUrl = `${appBaseUrl}/brief-article/${insertedArticle.id}`;

    //   processedArticles.push({
    //     id: insertedArticle.id,
    
        const { data: existingArticle, error: existingArticleError } =
    await supabaseAdmin
        .from("processed_articles")
        .select("id")
        .eq("original_url", newsArticle.url)
        .maybeSingle();

    if (existingArticleError) {
    throw existingArticleError;
    }

    let articleId = existingArticle?.id;

    if (!articleId) {
    const { data: insertedArticle, error: insertError } = await supabaseAdmin
        .from("processed_articles")
        .insert({
        topic: aiResult.topic || topic,
        original_title: newsArticle.title,
        polished_title: aiResult.polishedTitle,
        summary: aiResult.summary,
        importance_score: aiResult.importanceScore,
        reason: aiResult.reason,
        source: newsArticle.source?.name || "Unknown source",
        published_at: newsArticle.publishedAt,
        original_url: newsArticle.url,
        image_url: newsArticle.image,
        })
        .select("id")
        .single();

    if (insertError) {
        throw insertError;
    }

    articleId = insertedArticle.id;
    }

    const internalArticleUrl = `${appBaseUrl}/brief-article/${articleId}`;

    processedArticles.push({
    id: articleId,
        topic: aiResult.topic || topic,
        polishedTitle: aiResult.polishedTitle,
        summary: aiResult.summary,
        importanceScore: aiResult.importanceScore,
        reason: aiResult.reason,
        source: newsArticle.source?.name || "Unknown source",
        publishedAt: new Date(newsArticle.publishedAt).toLocaleString(),
        internalArticleUrl,
      });
    } catch (error) {
      failedTopics.push({
        topic,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  if (processedArticles.length === 0) {
    return {
      email: subscriber.email,
      success: false,
      topicsRequested: topicsToProcess,
      articlesSent: 0,
      failedTopics,
      error: "No articles were processed successfully.",
    };
  }

  processedArticles.sort((a, b) => b.importanceScore - a.importanceScore);

  const resend = new Resend(resendApiKey);

  const { error: emailError } = await resend.emails.send({
    from: "SK hynix AI News <onboarding@resend.dev>",
    to: [subscriber.email],
    subject: "Daily Semiconductor & Technology Brief",
    html: buildEmailHtml({
      userEmail: subscriber.email,
      articles: processedArticles,
    }),
  });

  if (emailError) {
    return {
      email: subscriber.email,
      success: false,
      topicsRequested: topicsToProcess,
      articlesSent: processedArticles.length,
      failedTopics,
      error: JSON.stringify(emailError),
    };
  }

  return {
    email: subscriber.email,
    success: true,
    topicsRequested: topicsToProcess,
    articlesSent: processedArticles.length,
    failedTopics,
  };
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const { searchParams } = new URL(request.url);
    const requestSecret = searchParams.get("secret");
    const forceSend = searchParams.get("force") === "true";

    if (cronSecret && requestSecret !== cronSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized cron request.",
        },
        { status: 401 }
      );
    }

    const gnewsApiKey = process.env.GNEWS_API_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;
    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

    if (!gnewsApiKey) {
      throw new Error("Missing GNEWS_API_KEY");
    }

    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY");
    }

    const { data: subscribers, error: subscriberError } = await supabaseAdmin
      .from("user_topic_preferences")
      .select("*")
      .eq("is_subscribed", true)
      .limit(5);

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

    const eligibleUsers = forceSend
    ? subscribedUsers
    : subscribedUsers.filter((subscriber) => shouldSendNow(subscriber));

    if (eligibleUsers.length === 0) {
    return NextResponse.json({
        success: true,
        message:
        "No subscribers are scheduled for this hour based on their time zone.",
        subscribersChecked: subscribedUsers.length,
        successfulSends: 0,
        failedSends: 0,
        results: [],
    });
    }

    const results: SubscriberResult[] = [];

    for (const subscriber of eligibleUsers) {
      const result = await processSubscriber({
        subscriber,
        gnewsApiKey,
        resendApiKey,
        appBaseUrl,
      });

      results.push(result);
    }

    const successfulSends = results.filter((result) => result.success).length;
    const failedSends = results.filter((result) => !result.success).length;

    return NextResponse.json({
      success: successfulSends > 0,
      message: "Daily brief job completed.",
      subscribersChecked: eligibleUsers.length,
      totalSubscribedUsers: subscribedUsers.length,
      forceSend,
      successfulSends,
      failedSends,
      results,
    });
  } catch (error) {
    console.error("Daily brief job error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send daily brief.",
      },
      { status: 500 }
    );
  }
}