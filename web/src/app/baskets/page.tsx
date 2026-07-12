"use client";

import { useEffect, useMemo, useState } from "react";
import { BasketCard, BasketListItem } from "@/components/BasketCard";

const FILTERS = ["All", "RWA", "AI", "Crypto", "Japan"];

export default function BasketsPage() {
  const [baskets, setBaskets] = useState<BasketListItem[] | null>(null);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetch("/api/baskets")
      .then((r) => r.json())
      .then((d) => {
        if (d.baskets?.length === 0) setError("empty");
        setBaskets(d.baskets ?? []);
      })
      .catch(() => setError("load-failed"));
  }, []);

  const visible = useMemo(() => {
    if (!baskets) return null;
    if (filter === "All") return baskets;
    return baskets.filter((b) =>
      b.tags?.some((t) => t.toLowerCase().includes(filter.toLowerCase()))
    );
  }, [baskets, filter]);

  return (
    <div className="py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-manrope text-3xl font-semibold tracking-tight text-white">
            Investment Indexes
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Diversified on-chain indexes reflecting themes, strategies, and narratives, like an
            S&amp;P 500 for any idea. Invest in one click, directly to your wallet, on HashKey Chain.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`${showFilters ? "flex" : "hidden"} gap-2 sm:flex`}>
            {FILTERS.map((f) => (
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
          <button
            aria-label="Filter baskets"
            onClick={() => setShowFilters((v) => !v)}
            className="mt-0.5 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-white sm:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
          </button>
        </div>
      </div>

      {error === "empty" && (
        <div className="rounded-xl border border-cesto-border bg-card/20 p-10 text-center text-sm text-muted-foreground">
          No indexes available right now. Check back shortly.
        </div>
      )}
      {error && error !== "empty" && (
        <div className="rounded-xl border border-cesto-border bg-card/20 p-10 text-center text-sm text-muted-foreground">
          Couldn&apos;t load indexes right now. Please refresh in a moment.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible === null
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[420px] animate-pulse rounded-xl border border-cesto-border bg-card/20" />
            ))
          : visible.map((b) => <BasketCard key={b.slug} basket={b} />)}
      </div>
    </div>
  );
}
