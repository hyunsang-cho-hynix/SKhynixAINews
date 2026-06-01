import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchReadableArticleText } from "@/lib/articleContent";

type GNewsArticle = {
  title: string;
  description?: string;
  content?: string;
  url: string;
  image?: string;
  publishedAt?: string;
  source?: {
    name?: string;
    url?: string;
  };
};

type AiResult = {
  polishedTitle?: string;
  topic?: string;
  summary?: string;
  importanceScore?: number;
  reason?: string;
  scoreExplanation?: string;
  scoreFactors?: {
    skHynixRelevance?: string;
    marketImpact?: string;
    technologySignal?: string;
    urgency?: string;
  };
};

type ProcessedSearchResult = Awaited<ReturnType<typeof processArticleWithGemini>>;

const allowedTopics = [
  "Semiconductor",
  "AI",
  "SK hynix / Memory Industry",
  "Automation",
  "Robotics",
  "IT",
  "Cloud",
  "Cybersecurity",
  "Data Center",
  "Manufacturing",
  "Stock Market",
];

function cleanJsonText(value: string) {
  return value.replace(/```json/g, "").replace(/```/g, "").trim();
}

function fallbackTopic(query: string) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes("stock") || lowerQuery.includes("market")) {
    return "Stock Market";
  }

  if (
    lowerQuery.includes("hbm") ||
    lowerQuery.includes("memory") ||
    lowerQuery.includes("semiconductor") ||
    lowerQuery.includes("chip")
  ) {
    return "Semiconductor";
  }

  if (lowerQuery.includes("cloud") || lowerQuery.includes("data center")) {
    return "Cloud";
  }

  if (lowerQuery.includes("robot")) {
    return "Robotics";
  }

  if (lowerQuery.includes("automation") || lowerQuery.includes("factory")) {
    return "Automation";
  }

  if (lowerQuery.includes("ai") || lowerQuery.includes("artificial intelligence")) {
    return "AI";
  }

  return "IT";
}

function normalizeTopic(value: string | undefined, query: string) {
  if (value && allowedTopics.includes(value)) {
    return value;
  }

  const lowerValue = String(value || "").toLowerCase();

  if (lowerValue.includes("stock") || lowerValue.includes("market")) {
    return "Stock Market";
  }

  if (
    lowerValue.includes("hbm") ||
    lowerValue.includes("memory") ||
    lowerValue.includes("semiconductor") ||
    lowerValue.includes("chip")
  ) {
    return "Semiconductor";
  }

  if (lowerValue.includes("data center")) {
    return "Data Center";
  }

  if (lowerValue.includes("cloud")) {
    return "Cloud";
  }

  if (lowerValue.includes("cyber")) {
    return "Cybersecurity";
  }

  if (lowerValue.includes("manufacturing")) {
    return "Manufacturing";
  }

  if (lowerValue.includes("robot")) {
    return "Robotics";
  }

  if (lowerValue.includes("automation") || lowerValue.includes("factory")) {
    return "Automation";
  }

  if (lowerValue.includes("ai") || lowerValue.includes("artificial intelligence")) {
    return "AI";
  }

  return fallbackTopic(query);
}

function fallbackImportance(article: GNewsArticle, query: string) {
  const text = `${article.title} ${article.description || ""} ${
    article.content || ""
  }`.toLowerCase();
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 2);

  const matchingKeywords = keywords.filter((keyword) => text.includes(keyword));
  const baseScore = 5 + Math.min(matchingKeywords.length, 3);

  return Math.min(baseScore, 8);
}

function fallbackScoreExplanation({
  article,
  query,
  score,
}: {
  article: GNewsArticle;
  query: string;
  score: number;
}) {
  return `This article received ${score}/10 because it matched the search topic "${query}" and contained signals relevant to technology, semiconductor, AI infrastructure, market movement, or enterprise IT trends. The score should be read as an editorial relevance signal for SK hynix employees, not as a financial rating.`;
}

function buildComparisonSnapshot(
  article: ProcessedSearchResult,
  results: ProcessedSearchResult[]
) {
  return results
    .filter((item) => item.originalUrl !== article.originalUrl)
    .filter((item) => item.topic === article.topic)
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 5)
    .map((item) => ({
      title: item.polishedTitle,
      source: item.source,
      originalUrl: item.originalUrl,
      publishedAt: item.publishedAt,
      topic: item.topic,
      importanceScore: item.importanceScore,
      reason: item.reason,
    }));
}

async function processArticleWithGemini({
  ai,
  article,
  query,
}: {
  ai: GoogleGenAI;
  article: GNewsArticle;
  query: string;
}) {
  const source = article.source?.name || "Unknown source";
  const description = article.description || article.content || article.title;
  const fullArticleText = await fetchReadableArticleText(article.url);
  const sourceText = fullArticleText || description;
  const originalContentReadAt = new Date().toISOString();

  const prompt = `
You are an AI news analyst for an internal SK hynix-style technology news briefing.

Analyze this public technology news article for the search query: ${query}

Article title:
${article.title}

Article description:
${description}

Full article text, if available:
${sourceText}

Source:
${source}

Return ONLY valid JSON.
Do not include markdown.

JSON format:
{
  "polishedTitle": "professional rewritten title",
  "topic": "Semiconductor | AI | SK hynix / Memory Industry | Automation | Robotics | IT | Cloud | Cybersecurity | Data Center | Manufacturing | Stock Market",
  "summary": "detailed summary that lets the reader understand the article without opening the original link. Include concrete facts, companies, products, numbers, timelines, and implications when available.",
  "importanceScore": number from 1 to 10,
  "reason": "specific reason why this matters to SK hynix employees",
  "scoreExplanation": "plain-language explanation of why this exact score was assigned, including what would make it higher or lower",
  "scoreFactors": {
    "skHynixRelevance": "direct, indirect, or low relevance and why",
    "marketImpact": "customer, competitor, investor, supply-chain, or demand signal",
    "technologySignal": "technology or product signal considered",
    "urgency": "why this needs immediate attention or only monitoring"
  }
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const parsed = JSON.parse(cleanJsonText(response.text || "")) as AiResult;

    const importanceScore =
      typeof parsed.importanceScore === "number"
        ? parsed.importanceScore
        : fallbackImportance(article, query);

    return {
      title: article.title,
      originalTitle: article.title,
      polishedTitle: parsed.polishedTitle || article.title,
      summary: parsed.summary || description,
      reason:
        parsed.reason ||
        "This article may be relevant to semiconductor, AI, and technology market trends.",
      source,
      url: article.url,
      originalUrl: article.url,
      publishedAt: article.publishedAt,
      imageUrl: article.image || null,
      topic: normalizeTopic(parsed.topic, query),
      importanceScore,
      scoreExplanation:
        parsed.scoreExplanation ||
        fallbackScoreExplanation({ article, query, score: importanceScore }),
      scoreFactors: parsed.scoreFactors || null,
      comparedArticleSnapshot: [],
      sourceTextExcerpt: sourceText.slice(0, 2000),
      aiModel: "gemini-2.5-flash",
      aiProcessedVersion: "daily-brief-v2",
      originalContentReadAt,
    };
  } catch {
    const importanceScore = fallbackImportance(article, query);

    return {
      title: article.title,
      originalTitle: article.title,
      polishedTitle: article.title,
      summary: sourceText,
      reason:
        "This article may be relevant to the searched technology topic.",
      source,
      url: article.url,
      originalUrl: article.url,
      publishedAt: article.publishedAt,
      imageUrl: article.image || null,
      topic: fallbackTopic(query),
      importanceScore,
      scoreExplanation: fallbackScoreExplanation({
        article,
        query,
        score: importanceScore,
      }),
      scoreFactors: null,
      comparedArticleSnapshot: [],
      sourceTextExcerpt: sourceText.slice(0, 2000),
      aiModel: "gemini-2.5-flash",
      aiProcessedVersion: "daily-brief-v2",
      originalContentReadAt,
    };
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : "";

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Login is required to use Search News + AI." },
        { status: 401 }
      );
    }

    const { data: userData, error: userError } =
      await supabaseAdmin.auth.getUser(token);

    if (userError || !userData.user) {
      return NextResponse.json(
        { success: false, error: "Please log in again to use Search News + AI." },
        { status: 401 }
      );
    }

    const gnewsApiKey = process.env.GNEWS_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!gnewsApiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing GNEWS_API_KEY. Check .env.local and restart npm run dev.",
        },
        { status: 500 }
      );
    }

    if (!geminiApiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing GEMINI_API_KEY. Check .env.local and restart npm run dev.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const query = String(body.query || "").trim();

    if (!query) {
      return NextResponse.json(
        { success: false, error: "Search query is required." },
        { status: 400 }
      );
    }

    const url = new URL("https://gnews.io/api/v4/search");
    url.searchParams.set("q", query);
    url.searchParams.set("lang", "en");
    url.searchParams.set("country", "us");
    url.searchParams.set("max", String(Math.min(Number(body.max || 6), 10)));
    url.searchParams.set("apikey", gnewsApiKey);

    const response = await fetch(url.toString(), {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.errors?.[0] || "Failed to fetch news from GNews.",
          details: data,
        },
        { status: response.status }
      );
    }

    const articles = ((data.articles || []) as GNewsArticle[]).filter(
      (article) => article.title && article.url
    );

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });

    const processedResults = await Promise.all(
      articles.map((article) =>
        processArticleWithGemini({
          ai,
          article,
          query,
        })
      )
    );

    const results = processedResults.map((article) => ({
      ...article,
      comparedArticleSnapshot: buildComparisonSnapshot(article, processedResults),
    }));

    return NextResponse.json({
      success: true,
      totalArticles: data.totalArticles,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to search and analyze news.",
      },
      { status: 500 }
    );
  }
}
