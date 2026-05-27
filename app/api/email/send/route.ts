import { NextResponse } from "next/server";
import { Resend } from "resend";

type EmailArticle = {
  polishedTitle: string;
  topic: string;
  summary: string;
  importanceScore: number;
  reason: string;
  source: string;
  publishedAt: string;
  originalUrl: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildEmailHtml(articles: EmailArticle[]) {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

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
      const cards = topicArticles
        .map((article) => {
          return `
            <tr>
              <td style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700;">
                    ${escapeHtml(article.topic)}
                  </span>
                  <span style="float: right; color: #64748b; font-size: 12px;">
                    Score ${article.importanceScore}/10
                  </span>
                </div>

                <h3 style="margin: 10px 0; color: #0f172a; font-size: 18px; line-height: 1.35;">
                  ${escapeHtml(article.polishedTitle)}
                </h3>

                <p style="margin: 0 0 12px; color: #475569; font-size: 14px; line-height: 1.6;">
                  ${escapeHtml(article.summary)}
                </p>

                <div style="margin: 12px 0; padding: 12px; background: #ffffff; border-radius: 10px;">
                  <p style="margin: 0 0 4px; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                    Why this matters
                  </p>
                  <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
                    ${escapeHtml(article.reason)}
                  </p>
                </div>

                <p style="margin: 0 0 12px; color: #64748b; font-size: 12px;">
                  Source: ${escapeHtml(article.source)}<br />
                  Published: ${escapeHtml(
                    new Date(article.publishedAt).toLocaleString()
                  )}
                </p>

                <a href="${escapeHtml(article.originalUrl)}" style="display: inline-block; padding: 10px 14px; border-radius: 8px; background: #2563eb; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none;">
                  Read Full Article
                </a>
              </td>
            </tr>
            <tr><td style="height: 14px;"></td></tr>
          `;
        })
        .join("");

      return `
        <tr>
          <td style="padding-top: 24px;">
            <h2 style="margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 22px;">
              ${escapeHtml(topic)}
            </h2>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              ${cards}
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <body style="margin: 0; padding: 0; background: #0f172a; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: #0f172a; padding: 32px 12px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 720px; background: #ffffff; border-radius: 20px; overflow: hidden;">
                <tr>
                  <td style="padding: 32px; background: linear-gradient(90deg, #2563eb, #06b6d4); color: #ffffff;">
                    <p style="margin: 0 0 8px; color: #dbeafe; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
                      SK hynix AI News Brief
                    </p>
                    <h1 style="margin: 0; font-size: 30px; line-height: 1.2;">
                      Daily Semiconductor & Technology Brief
                    </h1>
                    <p style="margin: 12px 0 0; color: #e0f2fe; font-size: 14px;">
                      ${today}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 24px 32px 0;">
                    <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
                      Good morning. Here are today&apos;s selected articles from public news sources. Each article was processed with AI to generate a professional summary, topic classification, and importance score.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 0 32px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      ${topicSections}
                    </table>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 24px 32px; background: #f1f5f9; color: #64748b; font-size: 12px; text-align: center;">
                    <p style="margin: 0;">
                      You are receiving this because you subscribed to SK hynix AI News Demo.
                    </p>
                    <p style="margin: 8px 0 0;">
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

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing RESEND_API_KEY. Check .env.local and restart npm run dev.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const to = body.to;
    const articles: EmailArticle[] = body.articles || [];

    if (!to) {
      return NextResponse.json(
        { success: false, error: "Recipient email is required." },
        { status: 400 }
      );
    }

    if (articles.length === 0) {
      return NextResponse.json(
        { success: false, error: "No articles were provided." },
        { status: 400 }
      );
    }

    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from: "SK hynix AI News <onboarding@resend.dev>",
      to: [to],
      subject: "Daily Semiconductor & Technology Brief",
      html: buildEmailHtml(articles),
    });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Send email error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send email.",
      },
      { status: 500 }
    );
  }
}