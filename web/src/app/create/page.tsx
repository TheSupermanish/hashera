"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TokenLogo } from "@/components/TokenLogo";
import { AllocationDonut } from "@/components/AllocationDonut";
import { donutColor } from "@/lib/seedData";
import { fmtUsd } from "@/lib/format";

interface Asset {
  symbol: string;
  name: string;
  underlying: string;
  logo?: string;
  logoText: string;
  logoBg: string;
  kind: string;
  price: number;
}

export default function CreatePage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Asset[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({}); // symbol -> weight %
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filter, setFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/assets")
      .then((r) => r.json())
      .then((d) => setCatalog(d.assets ?? []));
  }, []);

  const chosen = Object.keys(selected);
  const totalPct = useMemo(
    () => Object.values(selected).reduce((s, w) => s + (Number(w) || 0), 0),
    [selected]
  );

  const bySymbol = useMemo(() => Object.fromEntries(catalog.map((a) => [a.symbol, a])), [catalog]);

  const donutData = chosen.map((sym, i) => ({
    symbol: sym,
    weightBps: (Number(selected[sym]) || 0) * 100,
    color: donutColor(i),
  }));

  const toggle = (symbol: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (symbol in next) {
        delete next[symbol];
      } else {
        // seed with an even split rounded to whole %
        const n = Object.keys(next).length + 1;
        const even = Math.floor(100 / n);
        Object.keys(next).forEach((k) => (next[k] = even));
        next[symbol] = 100 - even * (n - 1);
      }
      return next;
    });
  };

  const setWeight = (symbol: string, w: string) => {
    const v = Math.max(0, Math.min(100, Number(w.replace(/[^0-9]/g, "")) || 0));
    setSelected((prev) => ({ ...prev, [symbol]: v }));
  };

  const equalize = () => {
    const n = chosen.length;
    if (!n) return;
    const even = Math.floor(100 / n);
    const next: Record<string, number> = {};
    chosen.forEach((k, i) => (next[k] = i === 0 ? 100 - even * (n - 1) : even));
    setSelected(next);
  };

  const create = async () => {
    setError("");
    if (!name.trim()) return setError("Give your index a name.");
    if (chosen.length < 2) return setError("Pick at least 2 assets.");
    if (totalPct !== 100) return setError(`Weights must total 100% (currently ${totalPct}%).`);
    setCreating(true);
    try {
      const r = await fetch("/api/baskets/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          allocation: chosen.map((s) => ({ symbol: s, weightBps: (Number(selected[s]) || 0) * 100 })),
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "Could not create index.");
        setCreating(false);
      } else {
        router.push(`/baskets/${d.slug}`);
      }
    } catch {
      setError("Request failed.");
      setCreating(false);
    }
  };

  const visible = catalog.filter(
    (a) =>
      !filter ||
      a.symbol.toLowerCase().includes(filter.toLowerCase()) ||
      a.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="py-12">
      <h1 className="font-manrope text-3xl font-semibold tracking-tight text-white">
        Create an Index
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Build your own tokenized index on HashKey Chain. Pick the assets, set the weights, and the
        Moltiply AI agent will track and rebalance it, just like the curated indexes.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        {/* left: asset picker */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-manrope text-lg font-semibold text-white">Choose assets</h2>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search assets..."
              className="w-48 rounded-lg border border-cesto-border bg-background/60 px-3 py-2 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-cesto-green/40"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visible.map((a) => {
              const on = a.symbol in selected;
              return (
                <button
                  key={a.symbol}
                  onClick={() => toggle(a.symbol)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                    on
                      ? "border-cesto-green/60 bg-cesto-green/5"
                      : "border-cesto-border bg-card/20 hover:border-cesto-border/60"
                  }`}
                >
                  <TokenLogo token={a} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="font-manrope text-sm font-semibold text-white">{a.symbol}</div>
                    <div className="truncate text-xs text-muted-foreground">{a.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">{fmtUsd(a.price)}</div>
                    <div
                      className={`text-[11px] ${on ? "text-cesto-green" : "text-muted-foreground"}`}
                    >
                      {on ? "Added" : "Add"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* right: builder panel */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-cesto-border bg-card/40 p-5">
            <h2 className="font-manrope text-lg font-semibold text-white">Your Index</h2>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Index name (e.g. My AI Basket)"
              className="mt-4 w-full rounded-lg border border-cesto-border bg-background/60 px-3 py-2.5 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-cesto-green/40"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short thesis (optional)"
              className="mt-2 w-full resize-none rounded-lg border border-cesto-border bg-background/60 px-3 py-2.5 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-cesto-green/40"
            />

            {chosen.length > 0 && (
              <div className="mt-5">
                <AllocationDonut allocation={donutData} compact />
              </div>
            )}

            <div className="mt-5 space-y-2">
              {chosen.length === 0 && (
                <p className="rounded-lg border border-dashed border-cesto-border py-8 text-center text-sm text-muted-foreground">
                  Select assets to start building.
                </p>
              )}
              {chosen.map((sym) => {
                const a = bySymbol[sym];
                if (!a) return null;
                return (
                  <div key={sym} className="flex items-center gap-2.5 rounded-lg border border-cesto-border bg-background/40 px-3 py-2">
                    <TokenLogo token={a} size={24} />
                    <span className="flex-1 text-sm font-medium text-white">{sym}</span>
                    <input
                      value={selected[sym]}
                      onChange={(e) => setWeight(sym, e.target.value)}
                      inputMode="numeric"
                      className="w-12 rounded border border-cesto-border bg-background/60 px-1.5 py-1 text-right text-sm text-white outline-none focus:border-cesto-green/40"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                    <button
                      onClick={() => toggle(sym)}
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Remove"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {chosen.length > 0 && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <button onClick={equalize} className="text-cesto-green hover:underline">
                  Equalize
                </button>
                <span className={totalPct === 100 ? "text-cesto-emerald" : "text-destructive"}>
                  Total: {totalPct}%
                </span>
              </div>
            )}

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            <button
              onClick={create}
              disabled={creating || chosen.length < 2 || totalPct !== 100 || !name.trim()}
              className="mt-4 w-full rounded-lg bg-cesto-green py-3 text-sm font-semibold uppercase tracking-wide text-[#091313] transition-colors hover:bg-cesto-green/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Index"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
