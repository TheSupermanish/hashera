import { PricePoint } from "./models";

export interface SeriesPoint {
  ts: string;
  value: number;
}

/** Latest price and true 24h change for a set of symbols. */
export async function latestPrices(symbols: string[]) {
  const out: Record<string, { price: number; change24h: number; changePct24h: number }> = {};
  const dayAgo = new Date(Date.now() - 86400_000);
  await Promise.all(
    symbols.map(async (symbol) => {
      const latest = await PricePoint.findOne({ symbol }).sort({ ts: -1 }).lean();
      if (!latest) return;
      // Compare against the most recent tick at least 24h old (fall back to the
      // earliest point we have), so the "24H" figure is a real day-over-day move
      // rather than the delta between two 5-minute ticks.
      const prevDoc =
        (await PricePoint.findOne({ symbol, ts: { $lte: dayAgo } }).sort({ ts: -1 }).lean()) ??
        (await PricePoint.findOne({ symbol }).sort({ ts: 1 }).lean());
      const price = latest.price;
      const prev = prevDoc?.price ?? price;
      out[symbol] = {
        price,
        change24h: +(price - prev).toFixed(4),
        changePct24h: prev ? +(((price - prev) / prev) * 100).toFixed(2) : 0,
      };
    })
  );
  return out;
}

/**
 * Daily-close series for one symbol over the last `days` days.
 * The price engine writes intraday (5-minute) ticks; we collapse to one point
 * per calendar day (the last tick of that day) so charts render a clean daily
 * line instead of a dense, flat cluster of intraday ticks at the right edge.
 */
export async function priceSeries(symbol: string, days: number) {
  const since = new Date(Date.now() - days * 86400_000);
  const pts = await PricePoint.find({ symbol, ts: { $gte: since } }).sort({ ts: 1 }).lean();
  const byDay = new Map<string, number>();
  for (const p of pts) byDay.set(p.ts.toISOString().slice(0, 10), p.price); // ascending → last wins
  return [...byDay.entries()].map(([day, value]) => ({
    ts: new Date(`${day}T00:00:00.000Z`).toISOString(),
    value,
  }));
}

/**
 * Weighted basket index over `days`, normalized to 100 at the window start.
 * Assumes constant target weights (daily-rebalanced index).
 */
export async function basketSeries(
  allocation: { symbol: string; weightBps: number }[],
  days: number
): Promise<SeriesPoint[]> {
  const seriesList = await Promise.all(allocation.map((a) => priceSeries(a.symbol, days)));
  if (!seriesList.length || seriesList.some((s) => s.length === 0)) return [];

  // Align on the shortest series by date map.
  const maps = seriesList.map((s) => new Map(s.map((p) => [p.ts.slice(0, 10), p.value])));
  const dates = seriesList[0]
    .map((p) => p.ts.slice(0, 10))
    .filter((d) => maps.every((m) => m.has(d)));
  if (!dates.length) return [];

  const first = allocation.map((_, i) => maps[i].get(dates[0])!);
  return dates.map((d) => {
    let idx = 0;
    allocation.forEach((a, i) => {
      idx += (a.weightBps / 10000) * (maps[i].get(d)! / first[i]);
    });
    return { ts: new Date(d).toISOString(), value: +(idx * 100).toFixed(2) };
  });
}

/** Percentage return over the whole series. */
export function seriesReturn(series: SeriesPoint[]) {
  if (series.length < 2) return 0;
  const a = series[0].value;
  const b = series[series.length - 1].value;
  return +(((b - a) / a) * 100).toFixed(2);
}
