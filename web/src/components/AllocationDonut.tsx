"use client";

import { ticker } from "@/lib/format";

export interface AllocationEntry {
  symbol: string;
  weightBps: number;
  color: string;
}

export function AllocationDonut({
  allocation,
  compact = false,
}: {
  allocation: AllocationEntry[];
  compact?: boolean;
}) {
  const size = 200;
  const stroke = 34;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  let offset = 0;
  const segments = allocation
    .filter((a) => a.weightBps > 0)
    .map((a) => {
      const len = (a.weightBps / 10000) * c;
      const seg = { color: a.color, dash: len, offset, symbol: a.symbol };
      offset += len;
      return seg;
    });

  return (
    <div
      className={
        compact
          ? "flex flex-col items-center gap-5 py-2"
          : "flex flex-col items-center gap-8 py-2 sm:flex-row sm:justify-center sm:gap-14"
      }
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 -rotate-90"
        role="img"
        aria-label="Allocation donut chart"
      >
        {segments.length === 0 && (
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1f3a31" strokeWidth={stroke} />
        )}
        {segments.map((s, i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${c - s.dash}`}
            strokeDashoffset={-s.offset}
          >
            <title>{`${s.symbol} ${(segments[i].dash / c) * 100 > 0 ? "" : ""}`}</title>
          </circle>
        ))}
      </svg>

      <ul className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-2">
        {allocation.map((a) => (
          <li key={a.symbol} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ backgroundColor: a.color }}
            />
            <span className="font-medium text-white">{ticker(a.symbol)}</span>
            <span className="text-muted-foreground">{(a.weightBps / 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
