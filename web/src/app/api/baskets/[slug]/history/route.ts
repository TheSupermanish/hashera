import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Basket } from "@/lib/models";
import { basketSeries, priceSeries } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const RANGES: Record<string, number> = { "3M": 92, "6M": 183, "1Y": 366 };

// GET /api/baskets/[slug]/history?range=1Y — backtested basket index vs benchmark
export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  await dbConnect();
  const range = req.nextUrl.searchParams.get("range") ?? "1Y";
  const days = RANGES[range] ?? 366;

  const basket: any = await Basket.findOne({ slug: params.slug }).lean();
  if (!basket) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [series, benchRaw] = await Promise.all([
    basketSeries(basket.allocation, days),
    priceSeries(basket.benchmark ?? "SPX", days),
  ]);

  // Normalize benchmark to 100 at window start to overlay with the basket index.
  const benchmark = benchRaw.length
    ? benchRaw.map((p) => ({ ts: p.ts, value: +((p.value / benchRaw[0].value) * 100).toFixed(2) }))
    : [];

  return NextResponse.json({
    range,
    series,
    benchmark,
    benchmarkLabel: basket.benchmark === "SPX" ? "S&P 500" : basket.benchmark,
    launchedAt: basket.launchedAt,
  });
}
