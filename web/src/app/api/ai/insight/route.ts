import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Basket, NewsItem } from "@/lib/models";
import { latestPrices } from "@/lib/metrics";
import { generate, hasAI } from "@/lib/ai";

export const dynamic = "force-dynamic";

// POST /api/ai/insight { slug, question? } — Gemini-powered basket analysis
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  const { slug, question } = body;
  if (!hasAI()) {
    return NextResponse.json(
      { error: "AI is not configured. Set GEMINI_API_KEY or Vertex ADC env." },
      { status: 503 }
    );
  }

  await dbConnect();
  const basket: any = await Basket.findOne({ slug }).lean();
  if (!basket) return NextResponse.json({ error: "basket not found" }, { status: 404 });

  const prices = await latestPrices(basket.allocation.map((a: any) => a.symbol));
  const news = await NewsItem.find({ basketSlugs: slug }).sort({ publishedAt: -1 }).limit(5).lean();

  const context = {
    basket: {
      name: basket.name,
      description: basket.description,
      allocation: basket.allocation.map((a: any) => ({
        symbol: a.symbol,
        underlying: a.underlying,
        weightPct: a.weightBps / 100,
        price: prices[a.symbol]?.price,
        changePct24h: prices[a.symbol]?.changePct24h,
      })),
      risk: basket.risk,
    },
    recentNews: news.map((n: any) => ({ title: n.title, summary: n.summary, sentiment: n.sentiment })),
  };

  const prompt = `Basket data:\n${JSON.stringify(context, null, 2)}\n\n${
    question?.trim() ||
    "Give me the current AI read on this basket: what is driving performance, key risks right now, and what the agent is watching for the next rebalance."
  }`;

  try {
    const text = await generate({
      maxTokens: 700,
      system:
        "You are the Hashera portfolio AI on HashKey Chain. You analyze tokenized RWA investment baskets. " +
        "Be concise, concrete and numeric. Never give personalized financial advice; frame everything as analysis. " +
        "Answer in short paragraphs or tight bullet lists.",
      user: prompt,
    });
    return NextResponse.json({ insight: text });
  } catch (e: any) {
    return NextResponse.json({ error: "AI request failed", detail: e.message }, { status: 502 });
  }
}
