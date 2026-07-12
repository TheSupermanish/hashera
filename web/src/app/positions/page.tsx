"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { VAULT_ABI, ERC20_ABI } from "@/lib/contracts";
import { costBasis, fmtPct, fmtUsd, ticker, timeAgo } from "@/lib/format";
import { TokenLogo } from "@/components/TokenLogo";
import { ConnectButton } from "@/components/ConnectButton";
import { explorerTx } from "@/lib/chain";

export default function PositionsPage() {
  const { address, isConnected } = useAccount();
  const [baskets, setBaskets] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/baskets").then((r) => r.json()).then((d) => setBaskets(d.baskets ?? []));
    fetch("/api/stocks").then((r) => r.json()).then((d) => setStocks(d.stocks ?? []));
  }, []);

  useEffect(() => {
    if (!address) return;
    fetch(`/api/transactions?wallet=${address}`)
      .then((r) => r.json())
      .then((d) => setTxs(d.transactions ?? []));
  }, [address]);

  const stockBySymbol = useMemo(
    () => Object.fromEntries(stocks.map((s) => [s.symbol, s])),
    [stocks]
  );

  const deployedBaskets = useMemo(
    () => baskets.filter((b: any) => b.vaultAddress && b.vaultAddress.length === 42),
    [baskets]
  );

  // Stock symbols the wallet has traded (so we only read those balances).
  const tradedStocks = useMemo(() => {
    const set = new Set<string>();
    txs.forEach((t) => t.market === "stock" && set.add(t.basketSlug));
    return [...set].map((sym) => stockBySymbol[sym]).filter(Boolean);
  }, [txs, stockBySymbol]);

  const { data: basketReads } = useReadContracts({
    contracts: deployedBaskets.flatMap((b: any) => [
      { address: b.vaultAddress, abi: VAULT_ABI, functionName: "balanceOf", args: [address ?? "0x0000000000000000000000000000000000000000"] },
      { address: b.vaultAddress, abi: VAULT_ABI, functionName: "sharePrice" },
    ]),
    query: { enabled: !!address && deployedBaskets.length > 0, refetchInterval: 15000 },
  });

  const { data: stockReads } = useReadContracts({
    contracts: tradedStocks.map((s: any) => ({
      address: s.tokenAddress, abi: ERC20_ABI, functionName: "balanceOf",
      args: [address ?? "0x0000000000000000000000000000000000000000"],
    })),
    query: { enabled: !!address && tradedStocks.length > 0, refetchInterval: 15000 },
  });

  const indexPositions = deployedBaskets
    .map((b: any, i: number) => {
      const shares = basketReads?.[i * 2]?.result as bigint | undefined;
      const sp = basketReads?.[i * 2 + 1]?.result as bigint | undefined;
      const sharesNum = shares ? Number(formatUnits(shares, 18)) : 0;
      const value = sharesNum * (sp ? Number(formatUnits(sp, 6)) : 1);
      const cost = costBasis(txs, b.slug, sharesNum);
      return { kind: "Index", href: `/baskets/${b.slug}`, name: b.name, logo: null as any, sub: `${sharesNum.toFixed(4)} shares`, holding: sharesNum, value, cost, pnl: value - cost };
    })
    .filter((p) => p.holding > 1e-9);

  const stockPositions = tradedStocks
    .map((s: any, i: number) => {
      const bal = stockReads?.[i]?.result as bigint | undefined;
      const units = bal ? Number(formatUnits(bal, 18)) : 0;
      const value = units * s.price;
      const cost = costBasis(txs, s.symbol, units);
      return { kind: "Stock", href: `/stocks/${s.symbol}`, name: ticker(s.symbol), logo: s, sub: `${units.toFixed(4)} ${ticker(s.symbol)}`, holding: units, value, cost, pnl: value - cost };
    })
    .filter((p) => p.holding > 1e-9);

  const positions = [...stockPositions, ...indexPositions];
  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  const totalCost = positions.reduce((s, p) => s + Math.max(p.cost, 0), 0);
  const totalPnl = totalValue - totalCost;

  // Are on-chain reads still pending? Avoid flashing "no positions" first.
  const loadingReads =
    (deployedBaskets.length > 0 && basketReads === undefined) ||
    (tradedStocks.length > 0 && stockReads === undefined);

  return (
    <div className="py-12">
      <h1 className="font-manrope text-3xl font-semibold tracking-tight text-white">Positions</h1>
      <p className="mt-2 text-muted-foreground">
        Your indexes and single stocks on HashKey Chain, valued live at the on-chain oracle price.
      </p>

      {!isConnected ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-cesto-border bg-card/20 p-12 text-center">
          <p className="text-muted-foreground">Connect your wallet to view positions.</p>
          <ConnectButton />
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Portfolio Value", value: fmtUsd(totalValue), cls: "text-white", sub: `${positions.length} position${positions.length === 1 ? "" : "s"}` },
              { label: "Net Invested", value: fmtUsd(totalCost), cls: "text-white", sub: "cost basis" },
              { label: "Unrealized PnL", value: fmtUsd(totalPnl), cls: totalPnl >= 0 ? "text-cesto-emerald" : "text-destructive", sub: totalCost > 0 ? fmtPct((totalPnl / totalCost) * 100) : "—" },
              { label: "Return", value: totalCost > 0 ? fmtPct((totalPnl / totalCost) * 100) : "—", cls: totalPnl >= 0 ? "text-cesto-emerald" : "text-destructive", sub: "on invested" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-cesto-border bg-card/20 p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
                <div className={`mt-1 font-manrope text-2xl font-bold ${c.cls}`}>{c.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.sub}</div>
              </div>
            ))}
          </div>

          {loadingReads ? (
            <div className="mt-6 h-40 animate-pulse rounded-xl border border-cesto-border bg-card/20" />
          ) : positions.length === 0 ? (
            <div className="mt-6 flex flex-col items-center gap-2 rounded-xl border border-cesto-border bg-card/20 py-16 text-center">
              <span className="flex size-12 items-center justify-center rounded-full border border-cesto-border text-muted-foreground">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" /><path d="M3 8l9 5 9-5M12 13v8" />
                </svg>
              </span>
              <p className="mt-2 font-medium text-white">No open positions</p>
              <p className="text-sm text-muted-foreground">
                <Link href="/baskets" className="text-cesto-green hover:underline">Browse indexes</Link>
                {" or "}
                <Link href="/stocks" className="text-cesto-green hover:underline">buy a stock</Link>
                {" to get started"}
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-xl border border-cesto-border bg-card/20">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-cesto-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-4 font-medium">Asset</th>
                    <th className="px-5 py-4 font-medium">Holding</th>
                    <th className="px-5 py-4 text-right font-medium">Value</th>
                    <th className="px-5 py-4 text-right font-medium">Net Invested</th>
                    <th className="px-5 py-4 text-right font-medium">PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p, i) => (
                    <tr key={i} className="border-b border-cesto-border/50 last:border-0 hover:bg-card/20">
                      <td className="px-5 py-4">
                        <Link href={p.href} className="flex items-center gap-3">
                          {p.logo ? (
                            <TokenLogo token={p.logo} size={32} />
                          ) : (
                            <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-cesto-green">
                              IDX
                            </span>
                          )}
                          <span>
                            <span className="block font-medium text-white hover:text-cesto-green">{p.name}</span>
                            <span className={`text-[11px] ${p.kind === "Stock" ? "text-blue-300" : "text-cesto-green"}`}>{p.kind}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{p.sub}</td>
                      <td className="px-5 py-4 text-right font-manrope font-semibold text-white">{fmtUsd(p.value)}</td>
                      <td className="px-5 py-4 text-right text-muted-foreground">{fmtUsd(Math.max(p.cost, 0))}</td>
                      <td className={`px-5 py-4 text-right font-medium ${p.pnl >= 0 ? "text-cesto-emerald" : "text-destructive"}`}>
                        {fmtUsd(p.pnl)}
                        {p.cost > 0 && <span className="ml-1 text-[11px]">({fmtPct((p.pnl / p.cost) * 100)})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {txs.length > 0 && (
            <div className="mt-10">
              <h2 className="font-manrope text-xl font-semibold text-white">Activity</h2>
              <div className="mt-4 divide-y divide-cesto-border/50 rounded-xl border border-cesto-border bg-card/20">
                {txs.slice(0, 20).map((t, i) => {
                  const isBuy = t.type === "buy" || t.type === "invest";
                  const label = t.market === "stock" ? ticker(t.basketSlug) : t.basketSlug;
                  return (
                    <div key={i} className="flex items-center justify-between px-5 py-3.5 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase ${isBuy ? "bg-cesto-emerald/15 text-cesto-emerald" : "bg-destructive/15 text-destructive"}`}>
                          {t.type}
                        </span>
                        <span className="font-medium text-white">{label}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {t.shares ? `${Number(t.shares).toFixed(4)} ${t.market === "stock" ? "units" : "shares"}` : ""}
                          {t.price ? ` @ ${fmtUsd(Number(t.price))}` : ""}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="font-medium text-white">{fmtUsd(Number(t.usdcAmount) || 0)}</span>
                        <span className="text-xs text-muted-foreground">{timeAgo(t.ts ?? t.createdAt)}</span>
                        {t.txHash && (
                          <a href={explorerTx(t.txHash)} target="_blank" rel="noreferrer" className="text-xs text-cesto-green hover:underline">tx ↗</a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
