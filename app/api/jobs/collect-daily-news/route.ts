import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { fetchReadableArticleText } from "@/lib/articleContent";
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

type NaverNewsItem = {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
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
  scoreExplanation?: string;
  scoreFactors?: Record<string, unknown> | null;
};

const topics = [
  "Semiconductor",
  "AI",
  "SK hynix / Memory Industry",
  "Automation",
  "Robotics",
  "IT",
  "Cloud",
  "Stock Market",
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
  "stock market",
  "earnings",
  "shares",
  "stock",
  "nasdaq",
  "s&p 500",
  "market cap",
  "guidance",
  "revenue",
  "profit",
  "investor",
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEnglishTopicQuery(topic: string) {
  const topicMap: Record<string, string> = {
    Semiconductor: "semiconductor OR HBM OR memory chip OR advanced packaging",
    AI: "artificial intelligence OR AI infrastructure OR AI chip",
    "SK hynix / Memory Industry": "SK hynix OR HBM OR memory semiconductor",
    Automation: "factory automation OR smart factory OR industrial automation",
    Robotics: "industrial robotics OR AI robotics OR warehouse robots",
    IT: "enterprise IT OR cybersecurity OR cloud infrastructure",
    Cloud: "cloud infrastructure OR data center OR enterprise cloud",
    "Stock Market":
      "stock market OR earnings OR shares OR Nasdaq OR S&P 500 OR semiconductor stocks OR AI stocks OR technology stocks",
  };

  return topicMap[topic] || topic;
}

function getKoreanTopicQuery(topic: string) {
  const topicMap: Record<string, string> = {
    Semiconductor: "반도체 HBM 메모리 반도체 패키징",
    AI: "인공지능 AI 반도체 AI 인프라",
    "SK hynix / Memory Industry": "SK하이닉스 HBM 메모리 반도체",
    Automation: "스마트팩토리 자동화 제조",
    Robotics: "로봇 산업 자동화 로보틱스",
    IT: "IT 보안 클라우드 인프라",
    Cloud: "클라우드 데이터센터 AI 인프라",
    "Stock Market": "증시 반도체 주가 나스닥 엔비디아 SK하이닉스",
  };

  return topicMap[topic] || topic;
}

function normalizeUrl(url: string) {
  return url.trim();
}

function cleanNaverText(value: string) {
  return String(value || "")
    .replaceAll("<b>", "")
    .replaceAll("</b>", "")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .trim();
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Naver News";
  }
}

function scoreText(text: string, topic: string) {
  const lowerText = text.toLowerCase();
  let score = 0;

  for (const keyword of importantKeywords) {
    if (lowerText.includes(keyword)) {
      score += 3;
    }
  }

  const topicWords = topic
    .toLowerCase()
    .replace("/", " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const word of topicWords) {
    if (lowerText.includes(word)) {
      score += 2;
    }
  }

  return score;
}

function scoreArticle(article: GNewsArticle, topic: string) {
  const text = `${article.title} ${article.description || ""} ${
    article.content || ""
  } ${article.source?.name || ""}`;

  let score = scoreText(text, topic);

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

function estimateImportanceScoreFromScore(rawScore: number) {
  if (rawScore >= 18) return 8;
  if (rawScore >= 12) return 7;
  if (rawScore >= 8) return 6;
  return 5;
}

function estimateImportanceScore(article: GNewsArticle, topic: string) {
  return estimateImportanceScoreFromScore(scoreArticle(article, topic));
}

function estimateKoreanImportanceScore({
  title,
  description,
  source,
  topic,
}: {
  title: string;
  description: string;
  source: string;
  topic: string;
}) {
  const rawScore = scoreText(`${title} ${description} ${source}`, topic);
  return estimateImportanceScoreFromScore(rawScore);
}

function buildComparedArticleSnapshot(
  currentArticle: GNewsArticle,
  candidateArticles: GNewsArticle[],
  topic: string
) {
  return candidateArticles
    .filter((article) => article.url !== currentArticle.url)
    .sort((a, b) => scoreArticle(b, topic) - scoreArticle(a, topic))
    .slice(0, 5)
    .map((article) => ({
      title: article.title,
      source: article.source?.name || "Unknown source",
      originalUrl: article.url,
      publishedAt: article.publishedAt,
      topic,
      estimatedImportanceScore: estimateImportanceScore(article, topic),
      reason: article.description || article.content || "",
    }));
}

async function fetchGNewsArticlesForTopic({
  topic,
  apiKey,
  requestsPerTopic,
}: {
  topic: string;
  apiKey: string;
  requestsPerTopic: number;
}) {
  const query = getEnglishTopicQuery(topic);
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
        data.errors?.[0] || `Failed to fetch GNews for topic: ${topic}`
      );
    }

    const pageArticles = (data.articles || []) as GNewsArticle[];

    if (pageArticles.length === 0) {
      break;
    }

    articles.push(...pageArticles);
    await sleep(Number(process.env.GNEWS_DELAY_MS || "1500"));
  }

  const uniqueMap = new Map<string, GNewsArticle>();

  for (const article of articles) {
    if (!article.url) continue;
    uniqueMap.set(normalizeUrl(article.url), article);
  }

  return Array.from(uniqueMap.values());
}

async function fetchNaverNewsArticlesForTopic(topic: string) {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET");
  }

  const query = getKoreanTopicQuery(topic);
  const display = process.env.NAVER_NEWS_DISPLAY_PER_TOPIC || "30";

  const url = new URL("https://openapi.naver.com/v1/search/news.json");
  url.searchParams.set("query", query);
  url.searchParams.set("display", display);
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "date");

  const response = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.errorMessage || data.message || `Failed to fetch Naver news: ${topic}`
    );
  }

  const items = ((data.items || []) as NaverNewsItem[]).map((item) => {
    const originalUrl = item.originallink || item.link;
    const title = cleanNaverText(item.title);
    const description = cleanNaverText(item.description);
    const source = getHostname(originalUrl);

    return {
      title,
      description,
      originalUrl,
      naverUrl: item.link,
      source,
      publishedAt: item.pubDate,
    };
  });

  return items;
}

async function processWithGemini(article: GNewsArticle, topic: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });
  const fullArticleText = await fetchReadableArticleText(article.url);
  const articleText =
    fullArticleText || article.description || article.content || article.title;
  const originalContentReadAt = new Date().toISOString();

  const prompt = `
You are an AI news analyst for an SK hynix-style internal daily technology briefing.

Analyze this public English news article using the full article text when available.

Important:
- Keep the topic as this exact topic: ${topic}
- Create a professional English title, summary, and reason.
- Also create a natural Korean translation suitable for a Korean corporate technology news brief.
- The Korean text should not sound machine-translated.
- Write a detailed, factual summary so employees can understand the article without opening the original link.
- Include concrete companies, products, numbers, dates, market context, and technical details when present.
- Explain why this matters specifically to SK hynix employees.
- Do not invent facts that are not in the article.

Article title:
${article.title}

Full article text:
${articleText}

Source:
${article.source?.name || "Unknown source"}

Return ONLY valid JSON.
Do not include markdown.

JSON format:
{
  "polishedTitle": "professional rewritten English title",
  "polishedTitleKo": "professional Korean translated title",
  "topic": "${topic}",
  "summary": "detailed professional English summary",
  "summaryKo": "detailed professional Korean summary",
  "importanceScore": number from 1 to 10,
  "reason": "specific English reason why this article matters to SK hynix employees",
  "reasonKo": "specific Korean reason why this article matters to SK hynix employees",
  "scoreExplanation": "plain-language English explanation of why this exact score was assigned, including what would make it higher or lower",
  "scoreFactors": {
    "skHynixRelevance": "direct, indirect, or low relevance and why",
    "marketImpact": "customer, competitor, investor, supply-chain, or demand signal",
    "technologySignal": "technology or product signal considered",
    "urgency": "why this needs immediate attention or only monitoring"
  }
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

    const importanceScore =
      typeof parsed.importanceScore === "number"
        ? parsed.importanceScore
        : estimateImportanceScore(article, topic);

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
      importanceScore,
      reason:
        parsed.reason ||
        "This article may be relevant to semiconductor, AI, and technology market trends.",
      reasonKo:
        parsed.reasonKo ||
        "이 기사는 반도체, AI 및 기술 시장 흐름과 관련이 있을 수 있습니다.",
      scoreExplanation:
        parsed.scoreExplanation ||
        `This article received ${importanceScore}/10 because it contains signals relevant to SK hynix employee priorities, including memory demand, AI infrastructure, customer and competitor movement, market impact, and semiconductor supply-chain trends.`,
      scoreFactors: parsed.scoreFactors || null,
      sourceTextExcerpt: articleText.slice(0, 2000),
      aiModel: "gemini-2.5-flash",
      aiProcessedVersion: "daily-brief-v2",
      originalContentReadAt,
    };
  } catch {
    const importanceScore = estimateImportanceScore(article, topic);

    return {
      polishedTitle: article.title,
      polishedTitleKo: article.title,
      topic,
      summary: article.description || article.content || article.title,
      summaryKo: article.description || article.content || article.title,
      importanceScore,
      reason:
        "Gemini returned text that was not valid JSON, so the original article description was used.",
      reasonKo:
        "Gemini 응답이 올바른 JSON 형식이 아니어서 원문 설명을 사용했습니다.",
      scoreExplanation:
        `This fallback score is ${importanceScore}/10 based on keyword relevance, recency, source metadata, and topic match. Gemini did not return valid structured scoring details for this article.`,
      scoreFactors: null,
      sourceTextExcerpt: articleText.slice(0, 2000),
      aiModel: "gemini-2.5-flash",
      aiProcessedVersion: "daily-brief-v2",
      originalContentReadAt,
    };
  }
}

async function saveRawEnglishArticle(article: GNewsArticle, topic: string) {
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

async function saveRawKoreanArticle({
  topic,
  title,
  description,
  originalUrl,
  source,
  publishedAt,
}: {
  topic: string;
  title: string;
  description: string;
  originalUrl: string;
  source: string;
  publishedAt: string;
}) {
  const publishedDate = new Date(publishedAt);
  const safePublishedAt = Number.isNaN(publishedDate.getTime())
    ? new Date().toISOString()
    : publishedDate.toISOString();

  const importanceScore = estimateKoreanImportanceScore({
    title,
    description,
    source,
    topic,
  });

  const { error } = await supabaseAdmin.from("processed_articles").upsert(
    {
      topic,
      original_title: title,
      polished_title: title,
      polished_title_ko: title,
      summary: description,
      summary_ko: description,
      importance_score: importanceScore,
      reason: "This Korean article has been collected from Naver News and is awaiting AI processing.",
      reason_ko:
        "네이버 뉴스에서 수집된 한국어 기사이며, 아직 AI 중요도 분석은 적용되지 않았습니다.",
      source,
      published_at: safePublishedAt,
      original_url: originalUrl,
      image_url: null,
      raw_description: description,
      original_language: "ko",
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

async function saveAiProcessedEnglishArticle(
  article: GNewsArticle,
  topic: string,
  candidateArticles: GNewsArticle[]
) {
  const aiResult = await processWithGemini(article, topic);
  const comparedArticleSnapshot = buildComparedArticleSnapshot(
    article,
    candidateArticles,
    topic
  );

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
      score_explanation: aiResult.scoreExplanation,
      score_factors: aiResult.scoreFactors,
      compared_article_snapshot: comparedArticleSnapshot,
      source_text_excerpt: aiResult.sourceTextExcerpt,
      ai_model: aiResult.aiModel,
      ai_processed_version: aiResult.aiProcessedVersion,
      original_content_read_at: aiResult.originalContentReadAt,
      is_ai_processed: true,
      ai_processed_at: new Date().toISOString(),
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
      process.env.GNEWS_DAILY_REQUEST_BUDGET || "35"
    );

    const aiArticlesPerTopic = Number(
      process.env.AI_ARTICLES_PER_TOPIC || "1"
    );

    const requestsPerTopic = Math.max(
      1,
      Math.floor(dailyRequestBudget / topics.length)
    );

    const geminiDelayMs = Number(process.env.GEMINI_DELAY_MS || "15000");

    const results: {
      topic: string;
      englishFetched: number;
      englishSaved: number;
      koreanFetched: number;
      koreanSaved: number;
      aiProcessed: number;
      failedAi: number;
      errors: string[];
    }[] = [];

    for (const topic of topics) {
      const topicResult = {
        topic,
        englishFetched: 0,
        englishSaved: 0,
        koreanFetched: 0,
        koreanSaved: 0,
        aiProcessed: 0,
        failedAi: 0,
        errors: [] as string[],
      };

      try {
        const englishArticles = await fetchGNewsArticlesForTopic({
          topic,
          apiKey: gnewsApiKey,
          requestsPerTopic,
        });

        topicResult.englishFetched = englishArticles.length;

        for (const article of englishArticles) {
          try {
            await saveRawEnglishArticle(article, topic);
            topicResult.englishSaved += 1;
          } catch (error) {
            topicResult.errors.push(
              error instanceof Error
                ? error.message
                : "Failed to save English article."
            );
          }
        }

        const topEnglishCandidates = [...englishArticles]
          .sort((a, b) => scoreArticle(b, topic) - scoreArticle(a, topic))
          .slice(0, aiArticlesPerTopic);

        for (const article of topEnglishCandidates) {
          try {
            await saveAiProcessedEnglishArticle(article, topic, englishArticles);
            topicResult.aiProcessed += 1;
          } catch (error) {
            topicResult.failedAi += 1;
            topicResult.errors.push(
              error instanceof Error
                ? error.message
                : "Failed to process English article with Gemini."
            );
          }

          await sleep(geminiDelayMs);
        }
      } catch (error) {
        topicResult.errors.push(
          error instanceof Error
            ? `English collection failed: ${error.message}`
            : `English collection failed for topic: ${topic}`
        );
      }

      try {
        const koreanArticles = await fetchNaverNewsArticlesForTopic(topic);

        topicResult.koreanFetched = koreanArticles.length;

        for (const article of koreanArticles) {
          try {
            await saveRawKoreanArticle({
              topic,
              title: article.title,
              description: article.description,
              originalUrl: article.originalUrl,
              source: article.source,
              publishedAt: article.publishedAt,
            });

            topicResult.koreanSaved += 1;
          } catch (error) {
            topicResult.errors.push(
              error instanceof Error
                ? error.message
                : "Failed to save Korean article."
            );
          }
        }
      } catch (error) {
        topicResult.errors.push(
          error instanceof Error
            ? `Korean collection failed: ${error.message}`
            : `Korean collection failed for topic: ${topic}`
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
      naverDisplayPerTopic: process.env.NAVER_NEWS_DISPLAY_PER_TOPIC || "30",
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
