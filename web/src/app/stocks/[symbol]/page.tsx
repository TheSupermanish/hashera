"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { TokenLogo } from "@/components/TokenLogo";
import { TradingViewChart } from "@/components/TradingViewChart";
import { TradePanel } from "@/components/TradePanel";
import { PerformanceChart, TradeMarker } from "@/components/PerformanceChart";
import { ERC20_ABI } from "@/lib/contracts";
import { costBasis, fmtUsd, fmtPct, shortAddr, ticker } from "@/lib/format";
import { explorerAddress } from "@/lib/chain";

interface Stock {
  symbol: string;
  name: string;
  underlying: string;
  kind: string;
  logo?: string;
  logoText: string;
  logoBg: string;
  tvSymbol: string;
  tokenAddress: string;
  price: number;
  change24h: number;
  changePct24h: number;
}

export default function StockDetailPage({ params }: { params: { symbol: string } }) {
  const [stock, setStock] = useState<Stock | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [txs, setTxs] = useState<any[]>([]);
  const { address } = useAccount();

  useEffect(() => {
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((d) => {
        const s = (d.stocks ?? []).find((x: Stock) => x.symbol === params.symbol);
        if (s) setStock(s);
        else setNotFound(true);
      });
  }, [params.symbol]);

  const loadTxs = useCallback(() => {
    if (!address) return setTxs([]);
    fetch(`/api/transactions?wallet=${address}&symbol=${params.symbol}`)
      .then((r) => r.json())
      .then((d) => setTxs(d.transactions ?? []))
      .catch(() => {});
  }, [address, params.symbol]);

  useEffect(() => {
    loadTxs();
  }, [loadTxs]);

  // Live on-chain holding of this token.
  const { data: tokBal, refetch: refetchBal } = useReadContract({
    address: (stock?.tokenAddress || "0x") as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address && !!stock?.tokenAddress },
  });

  if (notFound)
    return (
      <div className="pt-24 text-center text-muted-foreground">
        Stock not found.{" "}
        <Link className="text-cesto-green hover:underline" href="/stocks">
          Back to stocks
        </Link>
      </div>
    );
  if (!stock)
    return (
      <div className="grid grid-cols-1 gap-8 py-12 lg:grid-cols-[1fr_360px]">
        <div className="h-[520px] animate-pulse rounded-xl border border-cesto-border bg-card/20" />
        <div className="h-80 animate-pulse rounded-xl border border-cesto-border bg-card/20" />
      </div>
    );

  const up = stock.changePct24h >= 0;

  // Position from live on-chain balance + recorded cost basis.
  const units = tokBal !== undefined ? Number(formatUnits(tokBal as bigint, 18)) : 0;
  const value = units * stock.price;
  const netCost = costBasis(txs, stock.symbol, units);
  const pnl = value - netCost;
  const hasPosition = units > 1e-9;

  // Buy/sell markers for the chart.
  const markers: TradeMarker[] = txs
    .filter((t) => t.price)
    .map((t) => ({
      ts: t.ts ?? t.createdAt,
      side: t.type === "buy" ? "buy" : "sell",
      amount: Number(t.usdcAmount) || 0,
      price: Number(t.price),
      units: Number(t.shares) || undefined,
    }));

  return (
    <div className="py-8">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/stocks" className="transition-colors hover:text-white">
          Stocks
        </Link>
        <span>›</span>
        <span className="text-white">{ticker(stock.symbol)}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <TokenLogo token={stock} size={48} />
            <div>
              <h1 className="font-manrope text-2xl font-bold text-white">
                {ticker(stock.symbol)}{" "}
                <span className="text-base font-normal text-muted-foreground">{stock.name}</span>
              </h1>
              <div className="mt-0.5 flex items-center gap-3">
                <span className="font-manrope text-xl font-bold text-white">{fmtUsd(stock.price)}</span>
                <span className={`text-sm ${up ? "text-cesto-emerald" : "text-destructive"}`}>
                  {up ? "▲" : "▼"} {fmtUsd(Math.abs(stock.change24h))} ({Math.abs(stock.changePct24h).toFixed(2)}%) 24H
                </span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">{stock.underlying}</p>

          <div className="mt-5">
            <TradingViewChart tvSymbol={stock.tvSymbol} height={480} />
          </div>

          <div className="mt-6">
            <PerformanceChart
              slug={stock.symbol}
              name={ticker(stock.symbol)}
              historyPath={(range) => `/api/stocks/${stock.symbol}/history?range=${range}`}
              markers={markers}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-cesto-border px-2 py-1">
              <span className="size-2 rounded-full bg-cesto-green" /> HashKey Chain
            </span>
            {stock.tokenAddress && (
              <a
                href={explorerAddress(stock.tokenAddress)}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-cesto-border px-2 py-1 hover:text-white"
              >
                Token {shortAddr(stock.tokenAddress)} ↗
              </a>
            )}
            <span className="rounded-md border border-cesto-border px-2 py-1">
              Synthetic RWA · oracle priced
            </span>
          </div>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <TradePanel
            symbol={stock.symbol}
            tokenAddress={stock.tokenAddress}
            price={stock.price}
            onTraded={() => {
              loadTxs();
              refetchBal();
            }}
          />

          {hasPosition && (
            <div className="mt-4 rounded-xl border border-cesto-border bg-card/20 p-5">
              <h3 className="font-manrope font-semibold text-white">Your Position</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Holding</span>
                  <span className="text-white">{units.toFixed(4)} {ticker(stock.symbol)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Value</span>
                  <span className="font-manrope font-semibold text-white">{fmtUsd(value)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Net invested</span>
                  <span className="text-white">{fmtUsd(Math.max(netCost, 0))}</span>
                </div>
                <div className="flex justify-between border-t border-cesto-border pt-2 text-muted-foreground">
                  <span>Unrealized PnL</span>
                  <span className={pnl >= 0 ? "font-semibold text-cesto-emerald" : "font-semibold text-destructive"}>
                    {fmtUsd(pnl)}{netCost > 0 ? ` (${fmtPct((pnl / netCost) * 100)})` : ""}
                  </span>
                </div>
              </div>
            </div>
          )}

          <p className="mt-3 px-1 text-xs leading-relaxed text-muted-foreground">
            Synthetic spot exposure minted against USDC at the oracle price. No leverage, no
            liquidation. Chart data by TradingView.
          </p>
        </div>
      </div>
    </div>
  );
}
