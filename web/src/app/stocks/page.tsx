"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { TokenLogo } from "@/components/TokenLogo";
import { Sparkline } from "@/components/Sparkline";
import { fmtUsd, ticker } from "@/lib/format";

interface Stock {
  symbol: string;
  name: string;
  underlying: string;
  kind: string;
  sector: string;
  logo?: string;
  logoText: string;
  logoBg: string;
  tvSymbol: string;
  tokenAddress: string;
  price: number;
  change24h: number;
  changePct24h: number;
  sparkline: number[];
}

const SECTOR_STYLE: Record<string, string> = {
  Semis: "border-blue-500/40 text-blue-300",
  Tech: "border-cesto-green/40 text-cesto-green",
  Industrials: "border-amber-500/40 text-amber-300",
  Japan: "border-rose-500/40 text-rose-300",
  Crypto: "border-violet-500/40 text-violet-300",
};

async function fetchStocks(): Promise<Stock[]> {
  const r = await fetch("/api/stocks");
  const d = await r.json();
  return d.stocks ?? [];
}

export default function StocksPage() {
  const { data: stocks, isLoading } = useQuery({
    queryKey: ["stocks"],
    queryFn: fetchStocks,
    staleTime: 30_000, // cache for 30s, refetch in background after
    refetchInterval: 60_000,
  });
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");

  const filters = useMemo(() => {
    const set = new Set<string>();
    (stocks ?? []).forEach((s) => s.sector && set.add(s.sector));
    return ["All", ...Array.from(set)];
  }, [stocks]);

  const visible = useMemo(() => {
    if (!stocks) return null;
    return stocks.filter((s) => {
      if (filter !== "All" && s.sector !== filter) return false;
      if (q && !`${ticker(s.symbol)} ${s.name}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [stocks, filter, q]);

  return (
    <div className="py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-manrope text-3xl font-semibold tracking-tight text-white">Stocks</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Buy and sell tokenized stocks one by one, directly to your wallet on HashKey Chain. Live
            charts, oracle pricing, no brokerage account.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="w-40 rounded-lg border border-cesto-border bg-background/60 px-3 py-2 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-cesto-green/40"
          />
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                filter === f
                  ? "border-cesto-green/60 bg-cesto-green/10 text-cesto-green"
                  : "border-cesto-border text-muted-foreground hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading || !visible
          ? Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl border border-cesto-border bg-card/20" />
            ))
          : visible.map((s) => {
              const up = s.changePct24h >= 0;
              return (
                <Link
                  key={s.symbol}
                  href={`/stocks/${s.symbol}`}
                  className="group flex flex-col rounded-xl border border-cesto-border bg-card/20 p-4 transition-colors hover:border-cesto-green/40"
                >
                  <div className="flex items-center gap-3">
                    <TokenLogo token={s} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="font-manrope font-semibold text-white">{ticker(s.symbol)}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-manrope font-bold text-white">{fmtUsd(s.price)}</div>
                      <div className={`text-xs ${up ? "text-cesto-emerald" : "text-destructive"}`}>
                        {up ? "▲" : "▼"} {Math.abs(s.changePct24h).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Sparkline
                      data={s.sparkline}
                      stroke={up ? "#10b981" : "#ef8c6b"}
                      fill={up ? "rgba(16,185,129,0.10)" : "rgba(239,140,107,0.10)"}
                      height={56}
                    />
                  </div>
                  {s.sector && (
                    <div className="mt-2.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                          SECTOR_STYLE[s.sector] ?? "border-cesto-border text-muted-foreground"
                        }`}
                      >
                        {s.sector}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}
      </div>
    </div>
  );
}
