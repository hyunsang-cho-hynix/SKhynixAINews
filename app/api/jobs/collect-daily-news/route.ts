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

type CollectedArticle = {
  title: string;
  description: string;
  content: string;
  originalUrl: string;
  imageUrl: string | null;
  publishedAt: string;
  sourceName: string;
  originalLanguage: "en" | "ko";
  score: number;
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

const RECENT_NEWS_WINDOW_HOURS = 24;
const GNEWS_LOOKBACK_HOURS = 72;
const ARTICLE_RETENTION_DAYS = 7;
const DEFAULT_AI_PROCESSING_COVERAGE = 0.8;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRecentNewsCutoff() {
  return new Date(Date.now() - RECENT_NEWS_WINDOW_HOURS * 60 * 60 * 1000);
}

function isPublishedWithinRecentWindow(publishedAt: string) {
  const publishedTime = new Date(publishedAt).getTime();

  if (Number.isNaN(publishedTime)) {
    return false;
  }

  return publishedTime >= getRecentNewsCutoff().getTime();
}

function filterArticlesWithinProviderWindow<T>(
  articles: T[],
  getPublishedAt: (article: T) => string
) {
  const publishedTimes = articles
    .map((article) => new Date(getPublishedAt(article)).getTime())
    .filter((time) => !Number.isNaN(time));

  if (publishedTimes.length === 0) {
    return [];
  }

  const providerLatestTime = Math.max(...publishedTimes);
  const providerCutoff = providerLatestTime - RECENT_NEWS_WINDOW_HOURS * 60 * 60 * 1000;

  return articles.filter((article) => {
    const publishedTime = new Date(getPublishedAt(article)).getTime();
    return !Number.isNaN(publishedTime) && publishedTime >= providerCutoff;
  });
}

async function cleanupExpiredArticles() {
  const retentionCutoff = new Date(
    Date.now() - ARTICLE_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabaseAdmin
    .from("processed_articles")
    .delete()
    .lt("published_at", retentionCutoff)
    .select("id");

  if (error) {
    throw error;
  }

  return data?.length || 0;
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
  currentArticle: CollectedArticle,
  candidateArticles: CollectedArticle[],
  topic: string
) {
  return candidateArticles
    .filter((article) => article.originalUrl !== currentArticle.originalUrl)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((article) => ({
      title: article.title,
      source: article.sourceName,
      originalUrl: article.originalUrl,
      publishedAt: article.publishedAt,
      topic,
      originalLanguage: article.originalLanguage,
      estimatedImportanceScore: estimateImportanceScoreFromScore(article.score),
      reason: article.description || article.content || "",
    }));
}

function getAiProcessingCoverage() {
  const coverage = Number(
    process.env.AI_PROCESSING_COVERAGE || DEFAULT_AI_PROCESSING_COVERAGE
  );

  if (Number.isNaN(coverage)) {
    return DEFAULT_AI_PROCESSING_COVERAGE;
  }

  return Math.min(1, Math.max(0, coverage));
}

function getAiTargetCount(totalArticles: number, coverage: number) {
  if (totalArticles === 0 || coverage <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(totalArticles * coverage));
}

async function processArticlesWithConcurrency({
  articles,
  topic,
  allCandidates,
  concurrency,
  delayMs,
}: {
  articles: CollectedArticle[];
  topic: string;
  allCandidates: CollectedArticle[];
  concurrency: number;
  delayMs: number;
}) {
  let nextIndex = 0;
  const results: { success: boolean; error?: string }[] = [];

  async function worker() {
    while (nextIndex < articles.length) {
      const article = articles[nextIndex];
      nextIndex += 1;

      try {
        await saveAiProcessedArticle(article, topic, allCandidates);
        results.push({ success: true });
      } catch (error) {
        results.push({
          success: false,
          error:
            error instanceof Error
              ? error.message
              : `Failed to process ${article.originalLanguage} article with Gemini.`,
        });
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, () => worker())
  );

  return results;
}

async function getAiProcessedOriginalUrls(articles: CollectedArticle[]) {
  const originalUrls = articles
    .map((article) => article.originalUrl)
    .filter(Boolean);

  if (originalUrls.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabaseAdmin
    .from("processed_articles")
    .select("original_url")
    .in("original_url", originalUrls)
    .eq("is_ai_processed", true);

  if (error) {
    throw error;
  }

  return new Set((data || []).map((row) => row.original_url as string));
}

function toCollectedEnglishArticle(
  article: GNewsArticle,
  topic: string
): CollectedArticle {
  return {
    title: article.title,
    description: article.description || "",
    content: article.content || "",
    originalUrl: article.url,
    imageUrl: article.image || null,
    publishedAt: article.publishedAt,
    sourceName: article.source?.name || "Unknown source",
    originalLanguage: "en",
    score: scoreArticle(article, topic),
  };
}

function toCollectedKoreanArticle(
  article: Awaited<ReturnType<typeof fetchNaverNewsArticlesForTopic>>[number],
  topic: string
): CollectedArticle {
  return {
    title: article.title,
    description: article.description || "",
    content: article.description || "",
    originalUrl: article.originalUrl,
    imageUrl: null,
    publishedAt: article.publishedAt,
    sourceName: article.source,
    originalLanguage: "ko",
    score: scoreText(
      `${article.title} ${article.description || ""} ${article.source}`,
      topic
    ),
  };
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
    url.searchParams.set("sortby", "publishedAt");
    url.searchParams.set(
      "from",
      new Date(Date.now() - GNEWS_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString()
    );
    url.searchParams.set("to", new Date().toISOString());
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

  return filterArticlesWithinProviderWindow(
    Array.from(uniqueMap.values()),
    (article) => article.publishedAt
  );
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

  const recentItems = filterArticlesWithinProviderWindow(
    (data.items || []) as NaverNewsItem[],
    (item) => item.pubDate
  );

  const items = recentItems.map((item) => {
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

async function processWithGemini(article: CollectedArticle, topic: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const ai = new GoogleGenAI({
    apiKey,
  });

  const fullArticleText = await fetchReadableArticleText(article.originalUrl);
  const articleText =
    fullArticleText || article.description || article.content || article.title;
  const originalContentReadAt = new Date().toISOString();

  const prompt = `
You are an AI news analyst for an SK hynix-style internal daily technology briefing.

Analyze this public ${article.originalLanguage === "ko" ? "Korean" : "English"} news article using the full article text when available.

Important:
- Keep the topic as this exact topic: ${topic}
- Create a professional English title, summary, and reason.
- Also create a natural Korean title, summary, and reason suitable for a Korean corporate technology news brief.
- If the original article is Korean, preserve the nuance in Korean and translate accurately into English.
- If the original article is English, translate naturally into Korean without sounding machine-translated.
- Write a detailed, factual summary so employees can understand the article without opening the original link.
- Include concrete companies, products, numbers, dates, market context, and technical details when present.
- Explain why this matters specifically to SK hynix employees.
- Do not invent facts that are not in the article.

Article title:
${article.title}

Original language:
${article.originalLanguage}

Full article text:
${articleText}

Source:
${article.sourceName}

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
        : estimateImportanceScoreFromScore(article.score);

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
    const importanceScore = estimateImportanceScoreFromScore(article.score);

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

async function saveAiProcessedArticle(
  article: CollectedArticle,
  topic: string,
  candidateArticles: CollectedArticle[]
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
    .eq("original_url", article.originalUrl);

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

    const aiProcessingCoverage = getAiProcessingCoverage();

    const requestsPerTopic = Math.max(
      1,
      Math.floor(dailyRequestBudget / topics.length)
    );

    const aiProcessingConcurrency = Number(
      process.env.AI_PROCESSING_CONCURRENCY || "4"
    );
    const aiProcessingDelayMs = Number(
      process.env.AI_PROCESSING_DELAY_MS || "0"
    );
    const expiredArticlesDeleted = await cleanupExpiredArticles();

    const results: {
      topic: string;
      englishFetched: number;
      englishSaved: number;
      koreanFetched: number;
      koreanSaved: number;
      aiCandidates: number;
      aiTargeted: number;
      aiAlreadyProcessed: number;
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
        aiCandidates: 0,
        aiTargeted: 0,
        aiAlreadyProcessed: 0,
        aiProcessed: 0,
        failedAi: 0,
        errors: [] as string[],
      };
      const aiCandidates: CollectedArticle[] = [];

      try {
        const englishArticles = await fetchGNewsArticlesForTopic({
          topic,
          apiKey: gnewsApiKey,
          requestsPerTopic,
        });

        topicResult.englishFetched = englishArticles.length;
        aiCandidates.push(
          ...englishArticles.map((article) =>
            toCollectedEnglishArticle(article, topic)
          )
        );

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
        aiCandidates.push(
          ...koreanArticles.map((article) =>
            toCollectedKoreanArticle(article, topic)
          )
        );

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

      topicResult.aiCandidates = aiCandidates.length;
      topicResult.aiTargeted = getAiTargetCount(
        aiCandidates.length,
        aiProcessingCoverage
      );

      const topAiCandidates = [...aiCandidates]
        .sort((a, b) => b.score - a.score)
        .slice(0, topicResult.aiTargeted);
      const alreadyProcessedUrls = await getAiProcessedOriginalUrls(
        topAiCandidates
      );
      const pendingAiCandidates = topAiCandidates.filter(
        (article) => !alreadyProcessedUrls.has(article.originalUrl)
      );

      topicResult.aiAlreadyProcessed =
        topAiCandidates.length - pendingAiCandidates.length;

      const aiResults = await processArticlesWithConcurrency({
        articles: pendingAiCandidates,
        topic,
        allCandidates: aiCandidates,
        concurrency: aiProcessingConcurrency,
        delayMs: aiProcessingDelayMs,
      });

      topicResult.aiProcessed += aiResults.filter(
        (result) => result.success
      ).length;
      topicResult.failedAi += aiResults.filter(
        (result) => !result.success
      ).length;
      topicResult.errors.push(
        ...aiResults
          .map((result) => result.error)
          .filter((error): error is string => Boolean(error))
      );

      results.push(topicResult);
      await sleep(2500);
    }

    return NextResponse.json({
      success: true,
      message: "Daily news collection completed.",
      dailyRequestBudget,
      requestsPerTopic,
      aiProcessingCoverage,
      aiProcessingConcurrency,
      aiProcessingDelayMs,
      naverDisplayPerTopic: process.env.NAVER_NEWS_DISPLAY_PER_TOPIC || "30",
      recentNewsWindowHours: RECENT_NEWS_WINDOW_HOURS,
      gnewsLookbackHours: GNEWS_LOOKBACK_HOURS,
      recentNewsCutoff: getRecentNewsCutoff().toISOString(),
      articleRetentionDays: ARTICLE_RETENTION_DAYS,
      expiredArticlesDeleted,
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
