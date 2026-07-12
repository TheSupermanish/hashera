import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Basket, RebalanceEvent } from "@/lib/models";
import { basketSeries, latestPrices, priceSeries, seriesReturn } from "@/lib/metrics";

export const dynamic = "force-dynamic";

// GET /api/baskets/[slug] — full basket detail with live asset data
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  await dbConnect();
  const basket: any = await Basket.findOne({ slug: params.slug }).lean();
  if (!basket) return NextResponse.json({ error: "not found" }, { status: 404 });

  const symbols = basket.allocation.map((a: any) => a.symbol);
  const [prices, series] = await Promise.all([
    latestPrices(symbols),
    basketSeries(basket.allocation, 366),
  ]);

  const assets = await Promise.all(
    basket.allocation.map(async (a: any) => {
      const spark = await priceSeries(a.symbol, 90);
      return {
        ...a,
        price: prices[a.symbol]?.price ?? 0,
        change24h: prices[a.symbol]?.change24h ?? 0,
        changePct24h: prices[a.symbol]?.changePct24h ?? 0,
        sparkline: spark.map((p) => p.value),
      };
    })
  );

  const rebalances = await RebalanceEvent.find({ basketSlug: basket.slug })
    .sort({ date: -1 })
    .lean();

  return NextResponse.json({
    basket: {
      ...basket,
      _id: undefined,
      annualReturnPct: seriesReturn(series),
    },
    assets,
    rebalances,
  });
}
