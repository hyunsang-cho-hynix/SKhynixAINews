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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text ?? "";

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

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
        updated_at: new Date().toISOString(),
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
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to translate article.",
      },
      { status: 500 }
    );
  }
}