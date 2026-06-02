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
              <td class="email-card" bgcolor="#f8fafc" style="padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #f8fafc;">
                <div style="margin-bottom: 8px;">
                  <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; background: #F47725; color: #ffffff; font-size: 12px; font-weight: 700;">
                    ${escapeHtml(article.topic)}
                  </span>
                  <span class="email-muted" style="float: right; color: #64748b; font-size: 12px;">
                    Score ${article.importanceScore}/10
                  </span>
                </div>

                <h3 class="email-title" style="margin: 10px 0; color: #0f172a; font-size: 18px; line-height: 1.35;">
                  ${escapeHtml(article.polishedTitle)}
                </h3>

                <p class="email-copy" style="margin: 0 0 12px; color: #475569; font-size: 14px; line-height: 1.6;">
                  ${escapeHtml(article.summary)}
                </p>

                <div class="email-panel" style="margin: 12px 0; padding: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px;">
                  <p class="email-muted" style="margin: 0 0 4px; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                    Why this matters
                  </p>
                  <p class="email-copy" style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5;">
                    ${escapeHtml(article.reason)}
                  </p>
                </div>

                <p class="email-muted" style="margin: 0 0 12px; color: #64748b; font-size: 12px;">
                  Source: ${escapeHtml(article.source)}<br />
                  Published: ${escapeHtml(
                    new Date(article.publishedAt).toLocaleString()
                  )}
                </p>

                <a href="${escapeHtml(article.originalUrl)}" style="display: inline-block; padding: 10px 14px; border-radius: 8px; background: #F47725; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none;">
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
            <h2 class="email-title" style="margin: 0 0 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 22px;">
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
      <body class="email-force-light" style="margin: 0; padding: 0; background: #f1f5f9; font-family: Arial, sans-serif;">
        <table class="email-force-light" width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#f1f5f9" style="background: #f1f5f9; padding: 32px 12px;">
          <tr>
            <td align="center">
              <table class="email-paper" width="100%" cellpadding="0" cellspacing="0" role="presentation" bgcolor="#ffffff" style="max-width: 720px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
                <tr>
                  <td class="email-header" bgcolor="#fff7ed" style="padding: 32px; background: linear-gradient(135deg, #fff7ed, #ffffff); color: #0f172a;">
                    <p style="margin: 0 0 8px; color: #F47725; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;">
                      Tech AI News Brief
                    </p>
                    <h1 class="email-title" style="margin: 0; color: #0f172a; font-size: 30px; line-height: 1.2;">
                      Daily Semiconductor & Technology Brief
                    </h1>
                    <p class="email-muted" style="margin: 12px 0 0; color: #64748b; font-size: 14px;">
                      ${today}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 24px 32px 0;">
                    <p class="email-copy" style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">
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
                  <td class="email-card email-muted" bgcolor="#f8fafc" style="padding: 24px 32px; background: #f8fafc; color: #64748b; font-size: 12px; text-align: center;">
                    <p style="margin: 0;">
                      You are receiving this because you subscribed to Tech AI News Demo.
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
      from: "Tech AI News <onboarding@resend.dev>",
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

