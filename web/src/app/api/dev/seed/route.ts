import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Basket, PricePoint, RebalanceEvent, NewsItem } from "@/lib/models";
import { SEED_ASSETS, SEED_BASKETS, generateHistory, donutColor } from "@/lib/seedData";
import { DEPLOYMENT } from "@/lib/contracts";

export const dynamic = "force-dynamic";

// POST /api/dev/seed  — idempotent database seed (baskets, price history, samples)
export async function POST() {
  await dbConnect();

  // 1. Price history (only if empty per symbol, so live cron data is preserved)
  let insertedPoints = 0;
  for (const asset of SEED_ASSETS) {
    const exists = await PricePoint.exists({ symbol: asset.symbol });
    if (exists) continue;
    const history = generateHistory(asset);
    await PricePoint.insertMany(history.map((h) => ({ symbol: asset.symbol, ...h })));
    insertedPoints += history.length;
  }

  // 2. Baskets (upsert, merging on-chain addresses from deployment.json)
  const assetsBySymbol = Object.fromEntries(SEED_ASSETS.map((a) => [a.symbol, a]));
  for (const b of SEED_BASKETS) {
    const allocation = b.allocation.map(([symbol, weightBps], i) => {
      const a = assetsBySymbol[symbol];
      return {
        symbol,
        name: a.name,
        underlying: a.underlying,
        tokenAddress: DEPLOYMENT.tokens[symbol] ?? "",
        weightBps,
        color: donutColor(i),
        logo: a.logo ?? "",
        logoText: a.logoText,
        logoBg: a.logoBg,
      };
    });
    await Basket.findOneAndUpdate(
      { slug: b.slug },
      {
        $set: {
          name: b.name,
          symbol: b.symbol,
          badge: b.badge,
          gradient: b.gradient,
          image: b.image,
          shortDescription: b.shortDescription,
          description: b.description,
          tags: b.tags,
          platform: "HashKey Chain",
          vaultAddress: DEPLOYMENT.baskets[b.slug] ?? "",
          entryFeeBps: 50,
          minInvest: 25,
          returnLabel: b.returnLabel,
          allocation,
          risk: b.risk,
          resources: b.resources,
          launchedAt: new Date(Date.now() - 200 * 86400_000),
          version: 2,
        },
      },
      { upsert: true }
    );
  }

  // 3. Sample rebalance history
  if (!(await RebalanceEvent.exists({ basketSlug: "made-in-america" }))) {
    await RebalanceEvent.create([
      {
        basketSlug: "made-in-america",
        date: new Date(Date.now() - 90 * 86400_000),
        oldAllocation: [
          { symbol: "INTCon", weightBps: 1200 }, { symbol: "MUon", weightBps: 1200 },
          { symbol: "GEVon", weightBps: 1400 }, { symbol: "CATon", weightBps: 1400 },
          { symbol: "MPon", weightBps: 1000 }, { symbol: "VRTon", weightBps: 1200 },
          { symbol: "ETNon", weightBps: 1200 }, { symbol: "VSTon", weightBps: 1400 },
        ],
        newAllocation: SEED_BASKETS[0].allocation.map(([symbol, weightBps]) => ({ symbol, weightBps })),
        reason:
          "v2: Increased Intel and Micron on CHIPS Act disbursement acceleration and memory pricing upcycle; trimmed Vistra after weak 1y price action while keeping the forward nuclear thesis.",
        triggeredBy: "ai-agent",
      },
      {
        basketSlug: "pelosi-tracker",
        date: new Date(Date.now() - 30 * 86400_000),
        oldAllocation: [
          { symbol: "NVDAon", weightBps: 2400 }, { symbol: "AVGOon", weightBps: 1500 },
          { symbol: "MSFTon", weightBps: 1500 }, { symbol: "GOOGLon", weightBps: 1200 },
          { symbol: "AAPLon", weightBps: 1200 }, { symbol: "PANWon", weightBps: 1000 },
          { symbol: "VSTon", weightBps: 600 }, { symbol: "TEMon", weightBps: 600 },
        ],
        newAllocation: SEED_BASKETS[1].allocation.map(([symbol, weightBps]) => ({ symbol, weightBps })),
        reason:
          "New STOCK Act filing detected: added to Tempus AI and Vistra call positions; NVDA trimmed to 20% on partial disposition.",
        triggeredBy: "ai-agent",
      },
    ]);
  }

  // 4. Sample news (real feed comes from the server news engine)
  if (!(await NewsItem.exists({}))) {
    await NewsItem.create([
      {
        title: "Micron guides Q4 revenue above estimates on HBM demand",
        source: "Hashera AI Digest",
        publishedAt: new Date(Date.now() - 3 * 3600_000),
        summary:
          "Micron raised guidance on high-bandwidth memory sold out through 2027. Directly supportive of the Made in America and AI Revolution baskets, where MU and the memory complex are top weights.",
        sentiment: "bullish",
        impact: "high",
        tickers: ["MUon", "NVDAon"],
        basketSlugs: ["made-in-america", "ai-revolution"],
      },
      {
        title: "White House announces additional 10% tariff tranche on imported semiconductors",
        source: "Hashera AI Digest",
        publishedAt: new Date(Date.now() - 8 * 3600_000),
        summary:
          "New tariff tranche strengthens the reshoring thesis behind Made in America (INTC, MU fabs) but raises input costs for downstream hardware. Net bullish for the basket per the AI agent's read.",
        sentiment: "bullish",
        impact: "medium",
        tickers: ["INTCon", "MUon", "CATon"],
        basketSlugs: ["made-in-america"],
      },
      {
        title: "BoJ holds rates; yen slides past 165",
        source: "Hashera AI Digest",
        publishedAt: new Date(Date.now() - 20 * 3600_000),
        summary:
          "A weaker yen boosts exporter earnings for Sony, Toyota and Nintendo ADRs in the Tokyo Blue Chips basket, while pressuring MUFG's rate-normalization thesis.",
        sentiment: "neutral",
        impact: "medium",
        tickers: ["SONYon", "TMon", "MUFGon"],
        basketSlugs: ["tokyo-blue-chips"],
      },
    ]);
  }

  const basketCount = await Basket.countDocuments();
  return NextResponse.json({ ok: true, basketCount, insertedPoints });
}
