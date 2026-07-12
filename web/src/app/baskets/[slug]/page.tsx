"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { AllocationDonut } from "@/components/AllocationDonut";
import { AssetCard, AssetData } from "@/components/AssetCard";
import { PerformanceChart } from "@/components/PerformanceChart";
import { InvestPanel } from "@/components/InvestPanel";
import { TokenLogoStack } from "@/components/TokenLogo";
import { BasketAI } from "@/components/BasketAI";
import { VAULT_ABI } from "@/lib/contracts";
import { fmtUsd, ticker } from "@/lib/format";
import { explorerAddress } from "@/lib/chain";

const TABS = ["About", "Historical", "AI", "Risk", "Resources"] as const;
const BOTTOM_TABS = ["Positions", "Rebalance"] as const;

interface Detail {
  basket: any;
  assets: AssetData[];
  rebalances: any[];
}

export default function BasketDetailPage({ params }: { params: { slug: string } }) {
  const [data, setData] = useState<Detail | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("About");
  const [bottomTab, setBottomTab] = useState<(typeof BOTTOM_TABS)[number]>("Positions");
  const [expanded, setExpanded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    fetch(`/api/baskets/${params.slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setNotFound(true));
  }, [params.slug]);

  if (notFound)
    return (
      <div className="pt-24 text-center text-muted-foreground">
        Index not found.{" "}
        <Link className="text-cesto-green hover:underline" href="/baskets">
          Back to indexes
        </Link>
      </div>
    );
  if (!data)
    return (
      <div className="grid grid-cols-1 gap-8 py-12 lg:grid-cols-[1fr_360px]">
        <div className="h-[560px] animate-pulse rounded-xl border border-cesto-border bg-card/20" />
        <div className="h-80 animate-pulse rounded-xl border border-cesto-border bg-card/20" />
      </div>
    );

  const { basket, assets, rebalances } = data;

  return (
    <div className="py-8">
      <nav className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <Link href="/baskets" className="transition-colors hover:text-white">
          Indexes
        </Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span className="text-white">{basket.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="min-w-0">
          {/* Header */}
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="relative size-[152px] shrink-0 overflow-hidden rounded-xl">
              {basket.image ? (
                <Image src={basket.image} alt={basket.name} fill className="object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ background: basket.gradient ?? "#0c1a18" }}
                >
                  <span className="font-manrope text-3xl font-extrabold text-white/25">
                    {basket.name.split(" ").map((w: string) => w[0]).join("")}
                  </span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-manrope text-3xl font-bold text-white">{basket.name}</h1>
                  {basket.badge && (
                    <span className="rounded-sm bg-purple-500/20 px-2 py-0.5 text-xs font-semibold text-purple-400">
                      {basket.badge}
                    </span>
                  )}
                </div>
                <button
                  aria-label="Share"
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setShared(true);
                    setTimeout(() => setShared(false), 1500);
                  }}
                  className="flex shrink-0 items-center gap-1.5 rounded-md px-2 py-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-white"
                >
                  {shared ? (
                    <span className="text-xs font-medium text-cesto-green">Link copied</span>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="18" cy="5" r="3" />
                      <circle cx="6" cy="12" r="3" />
                      <circle cx="18" cy="19" r="3" />
                      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                by <span className="text-white">Moltiply</span>
              </p>
              <p className={`mt-3 text-sm text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}>
                {basket.description}
              </p>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1 text-sm font-medium text-white hover:underline"
              >
                {expanded ? "Show less" : "Show more"}
              </button>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-cesto-border px-2 py-1 text-xs font-medium text-muted-foreground">
                  <span className="size-2 rounded-full bg-cesto-green" />
                  HashKey
                </span>
                <TokenLogoStack tokens={basket.allocation} max={4} size={24} />
                <button
                  onClick={() => setBottomTab("Rebalance")}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-white"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  Rebalance Timeline
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8">
            <div
              role="tablist"
              className="grid h-10 w-full grid-cols-5 gap-1 rounded-lg border border-[#1a2924] bg-[#0c1a18] p-1"
            >
              {TABS.map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    tab === t
                      ? "bg-[#1a2924] text-white shadow-sm"
                      : "text-muted-foreground hover:bg-[#1a2924] hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === "About" && (
              <div className="mt-6 rounded-xl border border-cesto-border bg-card/20 p-5 sm:p-6">
                <h2 className="font-manrope text-xl font-semibold text-white">Allocation</h2>
                <div className="mt-4">
                  <AllocationDonut allocation={basket.allocation} />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {assets.map((a) => (
                    <AssetCard key={a.symbol} asset={a} />
                  ))}
                </div>

                <h3 className="mt-8 font-manrope text-lg font-semibold text-white">
                  About This Strategy
                </h3>
                <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                  {(basket.description ?? "").split("\n\n").map((para: string, i: number) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            )}

            {tab === "Historical" && (
              <div className="mt-6">
                <PerformanceChart slug={basket.slug} name={basket.name} />
              </div>
            )}

            {tab === "AI" && (
              <div className="mt-6">
                <BasketAI slug={basket.slug} name={basket.name} rebalances={rebalances} />
              </div>
            )}

            {tab === "Risk" && (
              <div className="mt-6 rounded-xl border border-cesto-border bg-card/20 p-5 sm:p-6">
                <h2 className="font-manrope text-2xl font-bold text-white">
                  {basket.risk?.title ?? `${basket.name} Strategy`}
                </h2>
                <div className="my-5 border-t border-cesto-border" />

                <h3 className="font-manrope text-xl font-semibold text-white">
                  Key Characteristics
                </h3>
                <ul className="mt-4 space-y-3">
                  {basket.risk?.characteristics?.map((c: any, i: number) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-white">{c.label}</span>, {c.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <h3 className="mt-8 font-manrope text-xl font-semibold text-white">Risk Factors</h3>
                <ul className="mt-4 space-y-3">
                  {basket.risk?.factors?.map((f: any, i: number) => (
                    <li key={i} className="flex gap-3 text-sm leading-relaxed">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-white">{f.label}</span>, {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <h3 className="mt-8 font-manrope text-xl font-semibold text-white">
                  Oracle-Based Pricing
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{basket.risk?.oracleNote}</p>
              </div>
            )}

            {tab === "Resources" && (
              <div className="mt-6 rounded-xl border border-cesto-border bg-card/20 p-5 sm:p-6">
                <h3 className="font-manrope text-lg font-semibold text-white">Resources</h3>
                <ul className="mt-4 space-y-3">
                  {basket.resources?.map((r: any, i: number) => (
                    <li key={i}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-cesto-green underline-offset-4 hover:underline"
                      >
                        {r.label} ↗
                      </a>
                    </li>
                  ))}
                  {basket.vaultAddress && (
                    <li>
                      <a
                        href={explorerAddress(basket.vaultAddress)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-cesto-green underline-offset-4 hover:underline"
                      >
                        Basket vault contract ↗
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Positions / Rebalance */}
          <div className="mt-10">
            <div className="flex items-center gap-6 border-b border-cesto-border">
              {BOTTOM_TABS.map((s) => (
                <button
                  key={s}
                  onClick={() => setBottomTab(s)}
                  className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
                    bottomTab === s
                      ? "border-white text-white"
                      : "border-transparent text-muted-foreground hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="py-8">
              {bottomTab === "Positions" ? (
                <PositionSection vaultAddress={basket.vaultAddress} />
              ) : (
                <RebalanceTimeline rebalances={rebalances} />
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <InvestPanel
            slug={basket.slug}
            vaultAddress={basket.vaultAddress}
            minInvest={basket.minInvest ?? 25}
            entryFeeBps={basket.entryFeeBps ?? 50}
            annualReturnPct={basket.annualReturnPct ?? 0}
          />
        </div>
      </div>
    </div>
  );
}

function PositionSection({ vaultAddress }: { vaultAddress?: string }) {
  const { address } = useAccount();
  const deployed = !!vaultAddress && vaultAddress.length === 42;
  const { data: shares } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: deployed && !!address },
  });
  const { data: sharePrice } = useReadContract({
    address: vaultAddress as `0x${string}`,
    abi: VAULT_ABI,
    functionName: "sharePrice",
    query: { enabled: deployed },
  });

  const sharesNum = shares !== undefined ? Number(formatUnits(shares, 18)) : 0;
  const value = sharesNum * (sharePrice !== undefined ? Number(formatUnits(sharePrice, 6)) : 1);

  if (!address || sharesNum === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full border border-cesto-border text-muted-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
            <path d="M3 8l9 5 9-5M12 13v8" />
          </svg>
        </span>
        <p className="mt-2 font-medium text-white">No open position</p>
        <p className="text-sm text-muted-foreground">Open a position to view your portfolio details</p>
      </div>
    );
  }

  return (
    <div className="max-w-md rounded-xl border border-cesto-border bg-card/20 p-5 text-sm">
      <div className="flex justify-between text-muted-foreground">
        <span>Shares</span>
        <span className="text-white">{sharesNum.toFixed(4)}</span>
      </div>
      <div className="mt-3 flex justify-between text-muted-foreground">
        <span>Current value</span>
        <span className="font-manrope text-lg font-bold text-white">{fmtUsd(value)}</span>
      </div>
    </div>
  );
}

function RebalanceTimeline({ rebalances }: { rebalances: any[] }) {
  if (!rebalances?.length)
    return <p className="py-10 text-center text-sm text-muted-foreground">No rebalances yet.</p>;

  return (
    <ol className="relative ml-3 space-y-8 border-l border-cesto-border pl-6">
      {rebalances.map((r, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[31px] top-1 size-2.5 rounded-full bg-cesto-green" />
          <div className="text-xs text-muted-foreground">
            {new Date(r.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            <span className="uppercase tracking-wide text-cesto-purple">{r.triggeredBy}</span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{r.reason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {r.newAllocation?.map((a: any) => {
              const old = r.oldAllocation?.find((o: any) => o.symbol === a.symbol);
              const delta = old ? a.weightBps - old.weightBps : 0;
              return (
                <span
                  key={a.symbol}
                  className="rounded-full border border-cesto-border bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {ticker(a.symbol)} {(a.weightBps / 100).toFixed(0)}%
                  {delta !== 0 && (
                    <span className={delta > 0 ? "ml-1 text-cesto-emerald" : "ml-1 text-destructive"}>
                      {delta > 0 ? "+" : ""}
                      {(delta / 100).toFixed(0)}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </li>
      ))}
    </ol>
  );
}
