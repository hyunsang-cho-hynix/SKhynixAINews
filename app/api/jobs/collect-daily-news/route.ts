import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  polishedTitleKo: string;
  topic: string;
  summary: string;
  summaryKo: string;
  importanceScore: number;
  reason: string;
  reasonKo: string;
};

const topics = [
  "Semiconductor",
  "AI",
  "SK hynix / Memory Industry",
  "Automation",
  "Robotics",
  "IT",
  "Cloud",
];

const importantKeywords = [
  "sk hynix",
  "hynix",
  "hbm",
  "memory",
  "dram",
  "nand",
  "semiconductor",
  "advanced packaging",
  "chip",
  "ai chip",
  "gpu",
  "nvidia",
  "tsmc",
  "samsung",
  "intel",
  "amd",
  "micron",
  "openai",
  "google",
  "microsoft",
  "data center",
  "robotics",
  "automation",
  "manufacturing",
  "cybersecurity",
  "cloud",
];

function getTopicQuery(topic: string) {
  const topicMap: Record<string, string> = {
    Semiconductor: "semiconductor OR HBM OR memory chip OR advanced packaging",
    AI: "artificial intelligence OR AI infrastructure OR AI chip",
    "SK hynix / Memory Industry": "SK hynix OR HBM OR memory semiconductor",
    Automation: "factory automation OR smart factory OR industrial automation",
    Robotics: "industrial robotics OR AI robotics OR warehouse robots",
    IT: "enterprise IT OR cybersecurity OR cloud infrastructure",
    Cloud: "cloud infrastructure OR data center OR enterprise cloud",
  };

  return topicMap[topic] || topic;
}

function normalizeUrl(url: string) {
  return url.trim();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scoreArticle(article: GNewsArticle, topic: string) {
  const text = `${article.title} ${article.description || ""} ${
    article.content || ""
  } ${article.source?.name || ""}`.toLowerCase();

  let score = 0;

  for (const keyword of importantKeywords) {
    if (text.includes(keyword)) {
      score += 3;
    }
  }

  const topicWords = topic
    .toLowerCase()
    .replace("/", " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const word of topicWords) {
    if (text.includes(word)) {
      score += 2;
    }
  }

  if (article.image) {
    score += 1;
  }

  if (article.description && article.description.length > 80) {
    score += 1;
  }

  const publishedTime = new Date(article.publishedAt).getTime();

  if (!Number.isNaN(publishedTime)) {
    const ageHours = (Date.now() - publishedTime) / 1000 / 60 / 60;

    if (ageHours <= 24) {
      score += 3;
    } else if (ageHours <= 72) {
      score += 1;
    }
  }

  return score;
}

function estimateImportanceScore(article: GNewsArticle, topic: string) {
  const rawScore = scoreArticle(article, topic);

  if (rawScore >= 18) return 8;
  if (rawScore >= 12) return 7;
  if (rawScore >= 8) return 6;
  return 5;
}

async function fetchNewsArticlesForTopic({
  topic,
  apiKey,
  requestsPerTopic,
}: {
  topic: string;
  apiKey: string;
  requestsPerTopic: number;
}) {
  const query = getTopicQuery(topic);
  const articles: GNewsArticle[] = [];

  for (let page = 1; page <= requestsPerTopic; page += 1) {
    const url = new URL("https://gnews.io/api/v4/search");

    url.searchParams.set("q", query);
    url.searchParams.set("lang", "en");
    url.searchParams.set("country", "us");
    url.searchParams.set("max", "10");
    url.searchParams.set("page", String(page));
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

    const pageArticles = (data.articles || []) as GNewsArticle[];

    if (pageArticles.length === 0) {
      break;
    }

    articles.push(...pageArticles);
    await sleep(1500);
  }

  const uniqueMap = new Map<string, GNewsArticle>();

  for (const article of articles) {
    if (!article.url) {
      continue;
    }

    uniqueMap.set(normalizeUrl(article.url), article);
  }

  return Array.from(uniqueMap.values());
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

Analyze this public English news article.

Important:
- Keep the topic as this exact topic: ${topic}
- Create a professional English title, summary, and reason.
- Also create a natural Korean translation suitable for a Korean corporate technology news brief.
- The Korean text should not sound machine-translated.
- Keep the summary concise and professional.

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
  "polishedTitle": "professional rewritten English title",
  "polishedTitleKo": "professional Korean translated title",
  "topic": "${topic}",
  "summary": "2 sentence professional English summary",
  "summaryKo": "2 sentence professional Korean summary",
  "importanceScore": number from 1 to 10,
  "reason": "brief English reason why this article matters",
  "reasonKo": "brief Korean reason why this article matters"
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
    const parsed = JSON.parse(cleanedText) as Partial<AiResult>;

    return {
      polishedTitle: parsed.polishedTitle || article.title,
      polishedTitleKo: parsed.polishedTitleKo || article.title,
      topic,
      summary: parsed.summary || article.description || article.title,
      summaryKo:
        parsed.summaryKo ||
        parsed.summary ||
        article.description ||
        article.title,
      importanceScore:
        typeof parsed.importanceScore === "number"
          ? parsed.importanceScore
          : estimateImportanceScore(article, topic),
      reason:
        parsed.reason ||
        "This article may be relevant to semiconductor, AI, and technology market trends.",
      reasonKo:
        parsed.reasonKo ||
        "이 기사는 반도체, AI 및 기술 시장 흐름과 관련이 있을 수 있습니다.",
    };
  } catch {
    return {
      polishedTitle: article.title,
      polishedTitleKo: article.title,
      topic,
      summary: article.description || article.content || article.title,
      summaryKo: article.description || article.content || article.title,
      importanceScore: estimateImportanceScore(article, topic),
      reason:
        "Gemini returned text that was not valid JSON, so the original article description was used.",
      reasonKo:
        "Gemini 응답이 올바른 JSON 형식이 아니어서 원문 설명을 사용했습니다.",
    };
  }
}

async function saveRawArticle(article: GNewsArticle, topic: string) {
  const rawDescription =
    article.description || article.content || article.title || "";

  const { error } = await supabaseAdmin.from("processed_articles").upsert(
    {
      topic,
      original_title: article.title,
      polished_title: article.title,
      summary: rawDescription,
      importance_score: estimateImportanceScore(article, topic),
      reason: "This article has been collected and is awaiting AI processing.",
      source: article.source?.name || "Unknown source",
      published_at: article.publishedAt,
      original_url: article.url,
      image_url: article.image,
      raw_description: rawDescription,
      original_language: "en",
      collection_date: new Date().toISOString().slice(0, 10),
      fetched_at: new Date().toISOString(),
      is_ai_processed: false,
    },
    {
      onConflict: "original_url",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw error;
  }
}

async function saveAiProcessedArticle(article: GNewsArticle, topic: string) {
  const aiResult = await processWithGemini(article, topic);

  const { error } = await supabaseAdmin
    .from("processed_articles")
    .update({
      topic,
      polished_title: aiResult.polishedTitle,
      polished_title_ko: aiResult.polishedTitleKo,
      summary: aiResult.summary,
      summary_ko: aiResult.summaryKo,
      importance_score: aiResult.importanceScore,
      reason: aiResult.reason,
      reason_ko: aiResult.reasonKo,
      is_ai_processed: true,
      ai_processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("original_url", article.url);

  if (error) {
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const { searchParams } = new URL(request.url);
    const requestSecret = searchParams.get("secret");
    const authHeader = request.headers.get("authorization");

    const isAuthorizedByQuery = requestSecret === cronSecret;
    const isAuthorizedByHeader = authHeader === `Bearer ${cronSecret}`;

    if (cronSecret && !isAuthorizedByQuery && !isAuthorizedByHeader) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized cron request.",
        },
        { status: 401 }
      );
    }

    const gnewsApiKey = process.env.GNEWS_API_KEY;

    if (!gnewsApiKey) {
      throw new Error("Missing GNEWS_API_KEY");
    }

    const dailyRequestBudget = Number(
      process.env.GNEWS_DAILY_REQUEST_BUDGET || "80"
    );

    const aiArticlesPerTopic = Number(
      process.env.AI_ARTICLES_PER_TOPIC || "5"
    );

    const requestsPerTopic = Math.max(
      1,
      Math.floor(dailyRequestBudget / topics.length)
    );

    const results: {
      topic: string;
      fetched: number;
      rawSaved: number;
      aiProcessed: number;
      failedAi: number;
      errors: string[];
    }[] = [];

    for (const topic of topics) {
      const topicResult = {
        topic,
        fetched: 0,
        rawSaved: 0,
        aiProcessed: 0,
        failedAi: 0,
        errors: [] as string[],
      };

      try {
        const articles = await fetchNewsArticlesForTopic({
          topic,
          apiKey: gnewsApiKey,
          requestsPerTopic,
        });

        topicResult.fetched = articles.length;

        for (const article of articles) {
          try {
            await saveRawArticle(article, topic);
            topicResult.rawSaved += 1;
          } catch (error) {
            topicResult.errors.push(
              error instanceof Error
                ? error.message
                : "Failed to save raw article."
            );
          }
        }

        const topCandidates = [...articles]
          .sort((a, b) => scoreArticle(b, topic) - scoreArticle(a, topic))
          .slice(0, aiArticlesPerTopic);

        for (const article of topCandidates) {
          try {
            await saveAiProcessedArticle(article, topic);
            topicResult.aiProcessed += 1;
          } catch (error) {
            topicResult.failedAi += 1;
            topicResult.errors.push(
              error instanceof Error
                ? error.message
                : "Failed to process article with Gemini."
            );
          }
        }
      } catch (error) {
        topicResult.errors.push(
          error instanceof Error
            ? error.message
            : `Failed to collect topic: ${topic}`
        );
      }

      results.push(topicResult);
      await sleep(2500);
    }

    return NextResponse.json({
      success: true,
      message: "Daily news collection completed.",
      dailyRequestBudget,
      requestsPerTopic,
      aiArticlesPerTopic,
      topicsProcessed: topics.length,
      results,
    });
  } catch (error) {
    console.error("Daily collection error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to collect daily news.",
      },
      { status: 500 }
    );
  }
}