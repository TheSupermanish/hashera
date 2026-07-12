// AI news engine: pulls market/crypto headlines from RSS, has Gemini score
// each item for sentiment + impact and map it to the affected baskets, then
// stores the digest in Mongo (consumed by the web Labs page and Telegram bot).

const Parser = require("rss-parser");
const { generate, hasAI } = require("./ai");
const { NewsItem, Basket } = require("./models");

const parser = new Parser({ timeout: 15000 });

const FEEDS = [
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
  { url: "https://finance.yahoo.com/news/rssindex", source: "Yahoo Finance" },
];

async function fetchHeadlines(limit = 8) {
  const items = [];
  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of (parsed.items ?? []).slice(0, limit)) {
        items.push({
          title: item.title?.trim(),
          url: item.link,
          source: feed.source,
          publishedAt: item.isoDate ? new Date(item.isoDate) : new Date(),
          snippet: (item.contentSnippet ?? "").slice(0, 400),
        });
      }
    } catch (e) {
      console.warn(`[news] feed ${feed.source} failed: ${e.message}`);
    }
  }
  return items.filter((i) => i.title);
}

async function digestNews() {
  if (!hasAI()) {
    console.warn("[news] GEMINI_API_KEY not set, skipping digest");
    return { added: 0 };
  }

  const headlines = await fetchHeadlines();
  if (!headlines.length) return { added: 0 };

  // Skip already-ingested URLs.
  const fresh = [];
  for (const h of headlines) {
    if (!(await NewsItem.exists({ $or: [{ url: h.url }, { title: h.title }] }))) fresh.push(h);
  }
  if (!fresh.length) return { added: 0 };

  const baskets = await Basket.find({}).lean();
  const basketContext = baskets.map((b) => ({
    slug: b.slug,
    name: b.name,
    holdings: (b.allocation ?? []).map((a) => `${a.symbol} (${a.underlying})`),
  }));

  const text = await generate({
    maxTokens: 3000,
    json: true,
    system:
      "You are the Moltiply market intelligence engine for tokenized RWA baskets on HashKey Chain. " +
      "You receive raw headlines and the platform's basket catalog. Select ONLY headlines that are " +
      "materially relevant to at least one basket's holdings or theme (equities, semis, AI capex, " +
      "Japan, crypto majors, RWA/tokenization policy).",
    user:
      `Baskets:\n${JSON.stringify(basketContext, null, 2)}\n\n` +
      `Headlines:\n${JSON.stringify(fresh, null, 2)}\n\n` +
      `Return a JSON array. For each RELEVANT headline only:\n` +
      `{"title": original title, "url": original url, "source": original source, ` +
      `"publishedAt": original publishedAt, "summary": 1-2 sentences on what happened AND why it ` +
      `matters for the affected basket(s), "sentiment": "bullish"|"bearish"|"neutral" (for the baskets), ` +
      `"impact": "high"|"medium"|"low", "tickers": affected holding symbols e.g. ["NVDAon"], ` +
      `"basketSlugs": affected basket slugs}. Return [] if nothing is relevant.`,
  });

  let items = [];
  try {
    items = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim());
    if (!Array.isArray(items)) items = [];
  } catch (e) {
    console.warn(`[news] could not parse AI response: ${e.message}`);
    return { added: 0 };
  }

  let added = 0;
  for (const item of items) {
    if (!item?.title) continue;
    await NewsItem.create({
      title: item.title,
      url: item.url,
      source: `${item.source} · AI Digest`,
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
      summary: item.summary,
      sentiment: ["bullish", "bearish", "neutral"].includes(item.sentiment) ? item.sentiment : "neutral",
      impact: ["high", "medium", "low"].includes(item.impact) ? item.impact : "medium",
      tickers: item.tickers ?? [],
      basketSlugs: item.basketSlugs ?? [],
      sentToTelegram: false,
    });
    added++;
  }
  console.log(`[news] digested ${added} new items`);
  return { added };
}

module.exports = { digestNews, fetchHeadlines };
