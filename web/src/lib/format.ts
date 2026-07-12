// Display ticker: our internal keys are Ondo-style (NVDAon, cBTC); show them
// HashKey-branded as hNVDA / hBTC. Display-only, internal keys are unchanged.
export function ticker(symbol: string) {
  if (!symbol) return symbol;
  if (symbol.endsWith("on")) return "h" + symbol.slice(0, -2);
  if (/^c[A-Z]/.test(symbol)) return "h" + symbol.slice(1);
  return symbol;
}

/**
 * Average-cost basis of the units currently held for one asset key.
 * Uses avg buy price × units held, so partial sells (return of capital) don't
 * zero out "invested" or inflate PnL the way net-cash accounting does.
 */
export function costBasis(
  txs: { basketSlug?: string; type?: string; usdcAmount?: number; shares?: number }[],
  key: string,
  unitsHeld: number
) {
  const buys = txs.filter(
    (t) => t.basketSlug === key && (t.type === "buy" || t.type === "invest")
  );
  const totUsdc = buys.reduce((s, t) => s + (Number(t.usdcAmount) || 0), 0);
  const totUnits = buys.reduce((s, t) => s + (Number(t.shares) || 0), 0);
  const avg = totUnits > 0 ? totUsdc / totUnits : 0;
  return +(avg * unitsHeld).toFixed(2);
}

export function fmtUsd(v: number, opts: Intl.NumberFormatOptions = {}) {
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  });
}

export function fmtPct(v: number, signed = true) {
  const s = signed && v > 0 ? "+" : "";
  return `${s}${v.toFixed(2)}%`;
}

export function shortAddr(addr?: string | null, chars = 4) {
  if (!addr) return "";
  return `${addr.slice(0, chars + 2)}...${addr.slice(-chars)}`;
}

export function fmtCompact(v: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
}

export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
