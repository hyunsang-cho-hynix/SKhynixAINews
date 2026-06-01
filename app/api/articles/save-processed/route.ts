import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SaveArticleBody = {
  originalTitle?: string;
  title?: string;
  polishedTitle?: string;
  topic?: string;
  summary?: string;
  importanceScore?: number;
  reason?: string;
  source?: string;
  publishedAt?: string;
  originalUrl?: string;
  url?: string;
  imageUrl?: string | null;
  scoreExplanation?: string | null;
  scoreFactors?: Record<string, unknown> | null;
  comparedArticleSnapshot?: Record<string, unknown>[] | null;
  sourceTextExcerpt?: string | null;
  aiModel?: string | null;
  aiProcessedVersion?: string | null;
  originalContentReadAt?: string | null;
};

function getSafePublishedAt(value: string | undefined) {
  if (!value) {
    return new Date().toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    return JSON.stringify(error);
  }

  return "Failed to save processed article.";
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Login is required to save articles." },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, error: "Please log in again to save articles." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as SaveArticleBody;

    const originalUrl = body.originalUrl || body.url;
    const originalTitle = body.originalTitle || body.title || body.polishedTitle;
    const polishedTitle = body.polishedTitle || body.title || body.originalTitle;

    if (!originalUrl) {
      return NextResponse.json(
        { success: false, error: "Original article URL is required." },
        { status: 400 }
      );
    }

    if (!originalTitle || !polishedTitle || !body.summary || !body.reason) {
      return NextResponse.json(
        {
          success: false,
          error: "Title, summary, and reason are required.",
        },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("processed_articles")
      .upsert(
        {
          topic: body.topic || "IT",
          original_title: originalTitle,
          polished_title: polishedTitle,
          summary: body.summary,
          importance_score:
            typeof body.importanceScore === "number"
              ? body.importanceScore
              : 5,
          reason: body.reason,
          source: body.source || "Unknown source",
          published_at: getSafePublishedAt(body.publishedAt),
          original_url: originalUrl,
          image_url: body.imageUrl || null,
          raw_description: body.summary,
          original_language: "en",
          collection_date: new Date().toISOString().slice(0, 10),
          fetched_at: new Date().toISOString(),
          is_ai_processed: true,
          ai_processed_at: new Date().toISOString(),
          score_explanation: body.scoreExplanation || null,
          score_factors: body.scoreFactors || null,
          compared_article_snapshot: body.comparedArticleSnapshot || [],
          source_text_excerpt: body.sourceTextExcerpt || null,
          ai_model: body.aiModel || "gemini-2.5-flash",
          ai_processed_version: body.aiProcessedVersion || "daily-brief-v2",
          original_content_read_at:
            body.originalContentReadAt || new Date().toISOString(),
        },
        {
          onConflict: "original_url",
        }
      )
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      articleId: data.id,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
