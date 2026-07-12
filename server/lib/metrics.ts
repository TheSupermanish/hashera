import { PricePoint } from "./models";
import type { Allocation, Quote } from "../types";

async function latest(symbol: string, n = 2) {
  return PricePoint.find({ symbol }).sort({ ts: -1 }).limit(n).lean();
}

/** { price, changePct24h } for one symbol. */
export async function quote(symbol: string): Promise<Quote | null> {
  const [now, prev] = await latest(symbol, 2);
  if (!now) return null;
  const p = prev?.price ?? now.price;
  return {
    price: now.price,
    changePct24h: p ? +(((now.price - p) / p) * 100).toFixed(2) : 0,
  };
}

/** Weighted basket return (%) over `days` using daily closes. */
export async function basketReturn(allocation: Allocation[], days: number): Promise<number> {
  const since = new Date(Date.now() - days * 86400_000);
  let total = 0;
  let weight = 0;
  for (const a of allocation) {
    const first = await PricePoint.findOne({ symbol: a.symbol, ts: { $gte: since } })
      .sort({ ts: 1 })
      .lean();
    const last = await PricePoint.findOne({ symbol: a.symbol }).sort({ ts: -1 }).lean();
    if (!first || !last || !first.price) continue;
    total += (a.weightBps / 10000) * ((last.price - first.price) / first.price);
    weight += a.weightBps / 10000;
  }
  if (!weight) return 0;
  return +((total / weight) * 100).toFixed(2);
}
