"use client";

import Link from "next/link";
import Image from "next/image";
import { TokenLogoStack, TokenIconData } from "./TokenLogo";
import { fmtPct } from "@/lib/format";

export interface BasketListItem {
  slug: string;
  name: string;
  badge: string;
  image?: string;
  gradient?: string;
  shortDescription: string;
  tags: string[];
  platform: string;
  returnLabel: string;
  annualReturnPct: number;
  allocation: TokenIconData[];
}

export function BasketCard({ basket }: { basket: BasketListItem }) {
  const shown = basket.allocation.slice(0, 3);
  const extra = basket.allocation.length - shown.length;

  return (
    <Link
      href={`/baskets/${basket.slug}`}
      className="group block h-full rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cesto-green/60"
    >
      <article className="cesto-card-gradient relative flex h-full flex-col overflow-hidden rounded-xl border border-cesto-border transition-all duration-200 hover:border-cesto-border/60">
        <div className="relative p-1">
          <div className="relative h-[260px] w-full overflow-hidden rounded-lg">
            {basket.image ? (
              <Image
                src={basket.image}
                alt={`${basket.name} basket preview`}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: basket.gradient ?? "linear-gradient(135deg,#0c1a18,#09110c)" }}
              >
                <span className="font-manrope text-5xl font-extrabold text-white/20">
                  {basket.name.split(" ").map((w) => w[0]).join("")}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div>
            <div className="flex items-center gap-1.5 pb-2">
              <h3 className="line-clamp-1 font-manrope text-lg font-bold text-white">
                {basket.name}
              </h3>
              {basket.badge && (
                <span className="flex items-center gap-1 rounded-sm bg-purple-500/20 px-2 py-0.5 text-xs font-semibold tabular-nums text-purple-400">
                  {basket.badge}
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-sm text-cesto-desc">{basket.shortDescription}</p>
          </div>

          <div className="mt-auto flex min-w-0 items-center justify-between gap-3 pt-4">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-cesto-border px-2 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-2 shrink-0 rounded-full bg-cesto-green" />
                <span className="leading-none">HashKey</span>
              </div>

              <div className="flex shrink-0 items-center">
                <TokenLogoStack tokens={shown} max={3} size={24} />
                {extra > 0 && (
                  <span className="relative z-0 -ml-1.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-medium text-muted-foreground ring-2 ring-background">
                    +{extra}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p className="whitespace-nowrap text-[11px] leading-tight text-muted-foreground">
                {basket.returnLabel} <span className="text-[9px] uppercase tracking-wide opacity-70">· backtested</span>
              </p>
              <p
                className={`font-manrope text-sm font-bold ${
                  basket.annualReturnPct >= 0 ? "text-cesto-emerald" : "text-destructive"
                }`}
              >
                {fmtPct(basket.annualReturnPct)}
              </p>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
