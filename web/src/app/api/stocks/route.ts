import { NextResponse } from "next/server";
import { SEED_ASSETS } from "@/lib/seedData";
import { latestPrices, priceSeries } from "@/lib/metrics";
import { DEPLOYMENT } from "@/lib/contracts";
import { dbConnect } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/stocks — the tradable single-asset catalog (equities + crypto),
// each with a 90-day daily-close sparkline for the card charts.
export async function GET() {
  await dbConnect();
  const assets = SEED_ASSETS.filter((a) => a.kind !== "index");
  const prices = await latestPrices(assets.map((a) => a.symbol));

  const stocks = await Promise.all(
    assets.map(async (a) => {
      const spark = await priceSeries(a.symbol, 90);
      return {
        symbol: a.symbol,
        name: a.name,
        underlying: a.underlying,
        kind: a.kind,
        sector: a.sector ?? "",
        logo: a.logo ?? "",
        logoText: a.logoText,
        logoBg: a.logoBg,
        tvSymbol: a.tvSymbol ?? "",
        tokenAddress: DEPLOYMENT.tokens[a.symbol] ?? "",
        price: prices[a.symbol]?.price ?? a.basePrice,
        change24h: prices[a.symbol]?.change24h ?? 0,
        changePct24h: prices[a.symbol]?.changePct24h ?? 0,
        sparkline: spark.map((p) => p.value),
      };
    })
  );

  return NextResponse.json({ stocks });
}
