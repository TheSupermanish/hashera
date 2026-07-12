import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { priceSeries } from "@/lib/metrics";
import { SEED_ASSETS } from "@/lib/seedData";

export const dynamic = "force-dynamic";

const RANGES: Record<string, number> = { "3M": 92, "6M": 183, "1Y": 366 };

// GET /api/stocks/[symbol]/history?range=1Y — single-stock index vs S&P 500,
// both normalized to 100 at the window start.
export async function GET(req: NextRequest, { params }: { params: { symbol: string } }) {
  await dbConnect();
  const range = req.nextUrl.searchParams.get("range") ?? "1Y";
  const days = RANGES[range] ?? 366;

  const asset = SEED_ASSETS.find((a) => a.symbol === params.symbol);
  if (!asset) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [raw, benchRaw] = await Promise.all([
    priceSeries(params.symbol, days),
    priceSeries("SPX", days),
  ]);

  const norm = (arr: { ts: string; value: number }[]) => {
    const base = arr.find((p) => p.value > 0)?.value ?? 0;
    if (!base) return [];
    return arr.map((p) => ({ ts: p.ts, value: +((p.value / base) * 100).toFixed(2) }));
  };

  return NextResponse.json({
    range,
    series: norm(raw),
    benchmark: norm(benchRaw),
    benchmarkLabel: "S&P 500",
  });
}
