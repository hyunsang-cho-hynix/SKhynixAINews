import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ArticleRow = {
  id: string;
  polished_title: string;
  polished_title_ko: string | null;
  summary: string;
  summary_ko: string | null;
  reason: string;
  reason_ko: string | null;
};

type TranslationResult = {
  polishedTitleKo: string;
  summaryKo: string;
  reasonKo: string;
};

function cleanJsonText(value: string) {
  return value.replace(/```json/g, "").replace(/```/g, "").trim();
}

function getReadableError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object") {
    return JSON.stringify(error);
  }

  return "Failed to translate article.";
}

async function generateTranslationWithFallback({
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

      return response.text ?? "";
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(getReadableError(lastError));
}

export async function POST(request: Request) {
  try {
    const { articleId } = await request.json();

    if (!articleId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing articleId.",
        },
        { status: 400 }
      );
    }

    const { data: articleData, error: articleError } = await supabaseAdmin
      .from("processed_articles")
      .select(
        "id, polished_title, polished_title_ko, summary, summary_ko, reason, reason_ko"
      )
      .eq("id", articleId)
      .single();

    if (articleError) {
      throw articleError;
    }

    const article = articleData as ArticleRow;

    if (
      article.polished_title_ko &&
      article.summary_ko &&
      article.reason_ko
    ) {
      return NextResponse.json({
        success: true,
        translated: false,
        article: {
          polished_title_ko: article.polished_title_ko,
          summary_ko: article.summary_ko,
          reason_ko: article.reason_ko,
        },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const prompt = `
Translate this English technology news brief into natural Korean for a Korean corporate audience.

Do not sound machine-translated.
Keep the tone professional, concise, and suitable for an internal SK hynix-style news briefing.

Return ONLY valid JSON.
Do not include markdown.

English title:
${article.polished_title}

English summary:
${article.summary}

English reason why this matters:
${article.reason}

JSON format:
{
  "polishedTitleKo": "Korean translated title",
  "summaryKo": "Korean translated summary",
  "reasonKo": "Korean translated reason"
}
`;

    const text = await generateTranslationWithFallback({ ai, prompt });
    const cleanedText = cleanJsonText(text);

    let parsed: TranslationResult;

    try {
      parsed = JSON.parse(cleanedText) as TranslationResult;
    } catch {
      parsed = {
        polishedTitleKo: article.polished_title,
        summaryKo: article.summary,
        reasonKo: article.reason,
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from("processed_articles")
      .update({
        polished_title_ko: parsed.polishedTitleKo,
        summary_ko: parsed.summaryKo,
        reason_ko: parsed.reasonKo,
      })
      .eq("id", articleId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      translated: true,
      article: {
        polished_title_ko: parsed.polishedTitleKo,
        summary_ko: parsed.summaryKo,
        reason_ko: parsed.reasonKo,
      },
    });
  } catch (error) {
    const errorMessage = getReadableError(error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage.includes("UNAVAILABLE")
          ? "Gemini is temporarily overloaded. Please try translation again in a minute."
          : errorMessage,
      },
      { status: 500 }
    );
  }
}
