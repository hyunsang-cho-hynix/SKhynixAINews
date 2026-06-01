import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { fetchReadableArticleText } from "@/lib/articleContent";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ArticleRow = {
  id: string;
  topic: string;
  original_title: string;
  polished_title: string;
  summary: string;
  reason: string;
  source: string;
  original_url: string;
  original_language: string | null;
};

type ReprocessResult = {
  polishedTitle?: string;
  polishedTitleKo?: string;
  summary?: string;
  summaryKo?: string;
  importanceScore?: number;
  reason?: string;
  reasonKo?: string;
  scoreExplanation?: string;
  scoreFactors?: Record<string, unknown>;
};

function cleanJsonText(value: string) {
  return value.replace(/```json/g, "").replace(/```/g, "").trim();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    return JSON.stringify(error);
  }

  return "Failed to reprocess article.";
}

async function generateContentWithFallback({
  ai,
  prompt,
}: {
  ai: GoogleGenAI;
  prompt: string;
}) {
  const models = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let lastError: unknown;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      return response.text || "";
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(getErrorMessage(lastError));
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Login is required to refresh AI briefs." },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, error: "Please log in again to refresh AI briefs." },
        { status: 401 }
      );
    }

    const { articleId } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        { success: false, error: "Missing articleId." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("processed_articles")
      .select(
        "id, topic, original_title, polished_title, summary, reason, source, original_url, original_language"
      )
      .eq("id", articleId)
      .single();

    if (error) {
      throw error;
    }

    const article = data as ArticleRow;
    const fullArticleText = await fetchReadableArticleText(article.original_url);
    const sourceText = fullArticleText || article.summary;

    if (!sourceText || sourceText.length < 300) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not read enough article text from the original source. The source may block automated reading.",
        },
        { status: 422 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const ai = new GoogleGenAI({ apiKey });
    const isKorean = article.original_language === "ko";

    const prompt = `
You are an AI news analyst for an internal SK hynix technology briefing.

Read the full article text below and rewrite the brief so a reader does not need to open the original link.

Requirements:
- Write a detailed, factual summary with enough context to understand the story.
- Include concrete companies, products, numbers, dates, market context, and technical details when present.
- Explain why this matters specifically to SK hynix employees.
- Score importance from 1 to 10 using SK hynix relevance: memory demand, AI infrastructure, customers, competitors, semiconductor supply chain, market impact, and enterprise technology shifts.
- Do not invent facts that are not in the article.
- Return ONLY valid JSON.

Topic:
${article.topic}

Original title:
${article.original_title}

Source:
${article.source}

Full article text:
${sourceText}

JSON format:
{
  "polishedTitle": "professional English title",
  "polishedTitleKo": "natural Korean title${isKorean ? "" : ", if useful"}",
  "summary": "detailed English summary",
  "summaryKo": "detailed Korean summary",
  "importanceScore": number,
  "reason": "specific English explanation why this matters to SK hynix employees",
  "reasonKo": "specific Korean explanation why this matters to SK hynix employees",
  "scoreExplanation": "plain-language English explanation of why this exact score was assigned, including what would make it higher or lower",
  "scoreFactors": {
    "skHynixRelevance": "direct, indirect, or low relevance and why",
    "marketImpact": "customer, competitor, investor, supply-chain, or demand signal",
    "technologySignal": "technology or product signal considered",
    "urgency": "why this needs immediate attention or only monitoring"
  }
}
`;

    const text = await generateContentWithFallback({ ai, prompt });
    const parsed = JSON.parse(cleanJsonText(text)) as ReprocessResult;

    const updatePayload = {
      polished_title: parsed.polishedTitle || article.polished_title,
      polished_title_ko: parsed.polishedTitleKo || null,
      summary: parsed.summary || article.summary,
      summary_ko: parsed.summaryKo || null,
      importance_score:
        typeof parsed.importanceScore === "number"
          ? parsed.importanceScore
          : 5,
      reason: parsed.reason || article.reason,
      reason_ko: parsed.reasonKo || null,
      score_explanation:
        parsed.scoreExplanation ||
        `This article received ${
          typeof parsed.importanceScore === "number"
            ? parsed.importanceScore
            : 5
        }/10 based on its relevance to SK hynix employee priorities, including memory demand, AI infrastructure, customer and competitor movement, market impact, and semiconductor supply-chain signals.`,
      score_factors: parsed.scoreFactors || null,
      source_text_excerpt: sourceText.slice(0, 2000),
      ai_model: "gemini-2.5-flash",
      ai_processed_version: "daily-brief-v2",
      original_content_read_at: new Date().toISOString(),
      is_ai_processed: true,
      ai_processed_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from("processed_articles")
      .update(updatePayload)
      .eq("id", article.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      article: updatePayload,
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
