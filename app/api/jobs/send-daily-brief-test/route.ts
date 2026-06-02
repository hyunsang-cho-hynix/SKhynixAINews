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
  articleUrl,
  aiResult,
  source,
  publishedAt,
}: {
  userEmail: string;
  articleUrl: string;
  aiResult: AiResult;
  source: string;
  publishedAt: string;
}) {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
                      Daily Semiconductor & Technology Brief
                    </h1>
                    <p class="email-muted" style="margin:12px 0 0; color:#64748b; font-size:14px;">
                      ${today}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px 32px;">
                    <p class="email-copy" style="margin:0; color:#475569; font-size:14px; line-height:1.6;">
                      Good morning. Here is a test daily brief generated from your saved topic preferences.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 32px 32px;">
                    <div class="email-card" style="padding:18px; border:1px solid #e2e8f0; border-radius:14px; background:#f8fafc;">
                      <div style="margin-bottom:8px;">
                        <span style="display:inline-block; padding:4px 10px; border-radius:999px; background:#F47725; color:#ffffff; font-size:12px; font-weight:700;">
                          ${escapeHtml(aiResult.topic)}
                        </span>
                        <span class="email-muted" style="float:right; color:#64748b; font-size:12px;">
                          Score ${aiResult.importanceScore}/10
                        </span>
                      </div>

                      <h2 class="email-title" style="margin:12px 0; color:#0f172a; font-size:20px; line-height:1.35;">
                        ${escapeHtml(aiResult.polishedTitle)}
                      </h2>

                      <p class="email-copy" style="margin:0 0 14px; color:#475569; font-size:14px; line-height:1.6;">
                        ${escapeHtml(aiResult.summary)}
                      </p>

                      <div class="email-panel" style="margin:14px 0; padding:12px; background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
                        <p class="email-muted" style="margin:0 0 4px; color:#94a3b8; font-size:11px; font-weight:700; text-transform:uppercase;">
                          Why this matters
                        </p>
                        <p class="email-copy" style="margin:0; color:#475569; font-size:13px; line-height:1.5;">
                          ${escapeHtml(aiResult.reason)}
                        </p>
                      </div>

                      <p class="email-muted" style="margin:0 0 14px; color:#64748b; font-size:12px;">
                        Source: ${escapeHtml(source)}<br />
                        Published: ${escapeHtml(publishedAt)}
                      </p>

                      <a href="${escapeHtml(articleUrl)}" style="display:inline-block; padding:10px 14px; border-radius:8px; background:#F47725; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none;">
                        Read Full Brief
                      </a>
                    </div>
                  </td>
                </tr>

                <tr>
                  <td class="email-card email-muted" bgcolor="#f8fafc" style="padding:24px 32px; background:#f8fafc; color:#64748b; font-size:12px; text-align:center;">
                    <p style="margin:0;">
                      Sent to ${escapeHtml(userEmail)} because you subscribed to Tech AI News.
                    </p>
                    <p style="margin:8px 0 0;">
                      Manage topics · Unsubscribe · View in browser
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

export async function GET() {
  try {
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
      .limit(1);

    if (subscriberError) {
      throw subscriberError;
    }

    const subscriber = subscribers?.[0] as UserPreference | undefined;

    if (!subscriber) {
      return NextResponse.json({
        success: false,
        message: "No subscribed users found.",
      });
    }

    const topics = [
      ...(subscriber.mandatory_topics || []),
      ...(subscriber.optional_topics || []),
    ];

    const selectedTopic = topics[0] || "Semiconductor";

    const newsArticle = await fetchOneNewsArticle(selectedTopic, gnewsApiKey);
    const aiResult = await processWithGemini(newsArticle, selectedTopic);

    const { data: insertedArticle, error: insertError } = await supabaseAdmin
      .from("processed_articles")
      .insert({
        topic: aiResult.topic || selectedTopic,
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

    const internalArticleUrl = `${appBaseUrl}/brief-article/${insertedArticle.id}`;

    const resend = new Resend(resendApiKey);

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: "Tech AI News <onboarding@resend.dev>",
      to: [subscriber.email],
      subject: "Daily Semiconductor & Technology Brief",
      html: buildEmailHtml({
        userEmail: subscriber.email,
        articleUrl: internalArticleUrl,
        aiResult,
        source: newsArticle.source?.name || "Unknown source",
        publishedAt: new Date(newsArticle.publishedAt).toLocaleString(),
      }),
    });

    if (emailError) {
      throw new Error(JSON.stringify(emailError));
    }

    return NextResponse.json({
      success: true,
      message: "Test daily brief sent successfully.",
      subscriber: subscriber.email,
      topic: selectedTopic,
      articleId: insertedArticle.id,
      internalArticleUrl,
      emailData,
    });
  } catch (error) {
    console.error("Daily brief test job error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to send test daily brief.",
      },
      { status: 500 }
    );
  }
}

