import { NextResponse } from "next/server";
import { SEED_ASSETS } from "@/lib/seedData";
import { latestPrices } from "@/lib/metrics";
import { dbConnect } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/assets — the investable asset catalog for the index builder.
export async function GET() {
  await dbConnect();
  const assets = SEED_ASSETS.filter((a) => a.kind !== "index");
  const prices = await latestPrices(assets.map((a) => a.symbol));
  return NextResponse.json({
    assets: assets.map((a) => ({
      symbol: a.symbol,
      name: a.name,
      underlying: a.underlying,
      logo: a.logo ?? "",
      logoText: a.logoText,
      logoBg: a.logoBg,
      kind: a.kind,
      price: prices[a.symbol]?.price ?? a.basePrice,
    })),
  });
}
