import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Basket } from "@/lib/models";
import { basketSeries, seriesReturn } from "@/lib/metrics";

export const dynamic = "force-dynamic";

// GET /api/baskets — list all baskets with computed returns
export async function GET() {
  await dbConnect();
  const baskets = await Basket.find({}).lean();

  const enriched = await Promise.all(
    baskets.map(async (b: any) => {
      const series = await basketSeries(b.allocation, 366);
      return {
        slug: b.slug,
        name: b.name,
        symbol: b.symbol,
        badge: b.badge,
        gradient: b.gradient,
        image: b.image,
        shortDescription: b.shortDescription,
        tags: b.tags,
        platform: b.platform,
        vaultAddress: b.vaultAddress,
        returnLabel: b.returnLabel,
        annualReturnPct: seriesReturn(series),
        allocation: b.allocation.map((a: any) => ({
          symbol: a.symbol,
          logo: a.logo,
          logoText: a.logoText,
          logoBg: a.logoBg,
        })),
      };
    })
  );

  return NextResponse.json({ baskets: enriched });
}
