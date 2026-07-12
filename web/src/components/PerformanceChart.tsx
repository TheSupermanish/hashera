"use client";

import { useEffect, useState } from "react";
import { fmtUsd } from "@/lib/format";

interface HistoryResponse {
  series: { ts: string; value: number }[];
  benchmark: { ts: string; value: number }[];
  benchmarkLabel: string;
}

const RANGES = ["3M", "6M", "1Y"] as const;

function toPath(pts: number[], w: number, h: number, min: number, max: number) {
  const span = max - min || 1;
  return pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - ((p - min) / span) * (h - 12) - 6;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export interface TradeMarker {
  ts: string;
  side: "buy" | "sell";
  amount: number;
  price: number;
  units?: number;
}

export function PerformanceChart({
  slug,
  name,
  historyPath,
  markers,
}: {
  slug: string;
  name: string;
  historyPath?: (range: string) => string;
  markers?: TradeMarker[];
}) {
  const [range, setRange] = useState<(typeof RANGES)[number]>("1Y");
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = historyPath ? historyPath(range) : `/api/baskets/${slug}/history?range=${range}`;
    fetch(url)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [slug, range, historyPath]);

  const W = 640;
  const H = 220;
  const port = data?.series.map((p) => p.value) ?? [];
  const bench = data?.benchmark.map((p) => p.value) ?? [];
  const all = [...port, ...bench];
  const min = all.length ? Math.min(...all) : 0;
  const max = all.length ? Math.max(...all) : 1;

  // Five evenly spaced x labels from the actual series dates.
  const labels =
    data && data.series.length > 1
      ? [0, 0.25, 0.5, 0.75, 1].map((f) =>
          fmtDate(data.series[Math.round(f * (data.series.length - 1))].ts)
        )
      : [];

  // Map trade markers onto the line: x by nearest date, y by the line value.
  const span = max - min || 1;
  const n = port.length;
  const firstTs = data && data.series.length ? new Date(data.series[0].ts).getTime() : 0;
  const lastTs = data && data.series.length ? new Date(data.series[data.series.length - 1].ts).getTime() : 0;
  const markerPts = (markers ?? [])
    .filter(() => n > 1)
    // Only plot trades within the visible window so an out-of-range trade
    // doesn't clamp misleadingly to the left edge.
    .filter((m) => {
      const t = new Date(m.ts).getTime();
      return t >= firstTs - 86400_000 && t <= lastTs + 86400_000;
    })
    .map((m) => {
      const t = new Date(m.ts).getTime();
      let idx = 0;
      let best = Infinity;
      data!.series.forEach((p, i) => {
        const dd = Math.abs(new Date(p.ts).getTime() - t);
        if (dd < best) { best = dd; idx = i; }
      });
      const v = port[idx];
      const leftPct = (idx / (n - 1)) * 100;
      const topPct = ((H - ((v - min) / span) * (H - 12) - 6) / H) * 100;
      return { ...m, leftPct, topPct };
    });

  return (
    <div className="rounded-xl border border-cesto-border bg-card/20 p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-manrope text-lg font-semibold text-white">Backtested Performance</h3>
        <div className="flex items-center gap-1 rounded-md border border-cesto-border bg-[#0c1a18] p-0.5">
          {RANGES.map((t) => (
            <button
              key={t}
              onClick={() => setRange(t)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                range === t ? "bg-[#1a2924] text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {loading || !data ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Loading chart...
          </div>
        ) : (
          <>
            <div className="relative h-56 w-full">
              <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="none">
                {[0.25, 0.5, 0.75].map((f) => (
                  <line
                    key={f}
                    x1={0}
                    x2={W}
                    y1={H * f}
                    y2={H * f}
                    stroke="#1f3a31"
                    strokeWidth={1}
                    strokeDasharray="4 6"
                  />
                ))}
                <path d={toPath(bench, W, H, min, max)} fill="none" stroke="#4d7cff" strokeWidth={1.6} />
                <path d={toPath(port, W, H, min, max)} fill="none" stroke="#00ff6a" strokeWidth={1.6} />
              </svg>

              {/* Trade markers: your buys/sells on this line, hover for details */}
              {markerPts.map((m, i) => (
                <div
                  key={i}
                  className="group absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${m.leftPct}%`, top: `${m.topPct}%` }}
                >
                  <span
                    className={`flex size-4 items-center justify-center rounded-full text-[8px] font-bold text-[#091313] ring-2 ring-[#09110c] ${
                      m.side === "buy" ? "bg-cesto-green" : "bg-destructive"
                    }`}
                  >
                    {m.side === "buy" ? "B" : "S"}
                  </span>
                  <div className="pointer-events-none absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-cesto-border bg-[#0c1a18] px-2.5 py-1.5 text-[11px] text-white shadow-lg group-hover:block">
                    <span className={m.side === "buy" ? "text-cesto-green" : "text-destructive"}>
                      {m.side === "buy" ? "Bought" : "Sold"}
                    </span>{" "}
                    {m.units ? `${m.units.toFixed(3)} ` : ""}@ {fmtUsd(m.price)}
                    <div className="text-muted-foreground">{fmtUsd(m.amount)} · {fmtDate(m.ts)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between px-1 text-[11px] text-muted-foreground">
              {labels.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <span className="flex items-center gap-1.5 text-cesto-green">
          <span className="h-0.5 w-4 rounded bg-cesto-green" />
          {name}
        </span>
        <span className="flex items-center gap-1.5 text-[#4d7cff]">
          <span className="h-0.5 w-4 rounded bg-[#4d7cff]" />
          {data?.benchmarkLabel ?? "S&P 500"}
        </span>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        *Backtested results are hypothetical and for illustrative purposes only. Past simulated
        performance does not guarantee future results.
      </p>
    </div>
  );
}
