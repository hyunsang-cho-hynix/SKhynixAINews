import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing GEMINI_API_KEY. Check that .env.local exists in the project root and restart npm run dev.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const title = body.title;
    const description = body.description;
    const source = body.source ?? "Unknown source";

    if (!title || !description) {
      return NextResponse.json(
        {
          success: false,
          error: "Title and description are required.",
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const prompt = `
You are an AI news analyst for an internal SK hynix-style technology news briefing.

Analyze the article below.

Article title:
${title}

Article description:
${description}

Source:
${source}

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside JSON.

JSON format:
{
  "polishedTitle": "professional rewritten title",
  "topic": "Semiconductor | AI | Automation | Robotics | IT | Cloud | Cybersecurity | Data Center | Manufacturing",
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

    let parsedResult;

    try {
      parsedResult = JSON.parse(cleanedText);
    } catch {
      parsedResult = {
        polishedTitle: title,
        topic: "AI",
        summary: cleanedText,
        importanceScore: 5,
        reason:
          "Gemini returned text, but it was not valid JSON. Showing raw result as summary.",
      };
    }

    return NextResponse.json({
      success: true,
      result: parsedResult,
    });
  } catch (error) {
    console.error("Gemini summarize error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process article with Gemini.",
      },
      { status: 500 }
    );
  }
}