"use client";

import { useState } from "react";
import Link from "next/link";
import { TokenLogo } from "./TokenLogo";
import { fmtUsd, shortAddr, ticker } from "@/lib/format";

export interface AssetData {
  symbol: string;
  name: string;
  underlying: string;
  tokenAddress?: string;
  weightBps: number;
  logo?: string | null;
  logoText: string;
  logoBg: string;
  price: number;
  change24h: number;
  changePct24h: number;
  sparkline: number[];
}

function sparkPath(data: number[], width = 260, height = 48) {
  if (!data || data.length < 2) return "";
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 6 - ((v - min) / span) * (height - 12);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function AssetCard({ asset }: { asset: AssetData }) {
  const [copied, setCopied] = useState(false);
  const up = asset.changePct24h >= 0;

  const copy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!asset.tokenAddress) return;
    navigator.clipboard.writeText(asset.tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <Link
      href={`/stocks/${asset.symbol}`}
      className="group flex flex-col gap-3 overflow-hidden rounded-xl border border-cesto-border bg-card/20 p-4 transition-colors hover:border-cesto-green/40"
    >
      <div className="flex items-center gap-2.5">
        <TokenLogo token={asset} size={36} />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-manrope font-semibold text-white">{ticker(asset.symbol)}</span>
            {asset.tokenAddress ? (
              <button
                onClick={copy}
                title={asset.tokenAddress}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-white"
              >
                {copied ? "copied!" : shortAddr(asset.tokenAddress, 3)}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            ) : (
              <span className="text-xs text-cesto-desc">not deployed</span>
            )}
          </div>
          <p className="truncate text-sm text-muted-foreground">{asset.name}</p>
        </div>
        <span className="ml-auto shrink-0 text-xs font-semibold text-cesto-green opacity-0 transition-opacity group-hover:opacity-100">
          Trade →
        </span>
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="font-manrope text-2xl font-bold text-white">{fmtUsd(asset.price)}</span>
        </div>
        <p className={`mt-0.5 text-sm ${up ? "text-cesto-emerald" : "text-destructive"}`}>
          {up ? "▲" : "▼"} {fmtUsd(Math.abs(asset.change24h))} (
          {Math.abs(asset.changePct24h).toFixed(2)}%) <span className="text-muted-foreground">24H</span>
        </p>
      </div>

      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="tracking-wide text-muted-foreground">ALLOCATION</span>
        <span className="font-manrope text-base font-bold text-white">
          {(asset.weightBps / 100).toFixed(0)}%
        </span>
      </div>

      <svg viewBox="0 0 260 48" preserveAspectRatio="none" className="h-12 w-full" aria-hidden>
        <path
          d={sparkPath(asset.sparkline)}
          fill="none"
          stroke="#10b981"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}
