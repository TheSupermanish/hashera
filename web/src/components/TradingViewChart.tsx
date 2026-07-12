"use client";

import { useEffect, useRef } from "react";

// Embeds TradingView's free Advanced Chart widget for a symbol like "NASDAQ:INTC".
// Falls back to a message when no TradingView symbol is available (e.g. HSK).
export function TradingViewChart({ tvSymbol, height = 480 }: { tvSymbol: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tvSymbol || !ref.current) return;
    const el = ref.current;
    el.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "3", // area
      locale: "en",
      backgroundColor: "rgba(9, 17, 12, 1)",
      gridColor: "rgba(31, 58, 49, 0.4)",
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, [tvSymbol]);

  if (!tvSymbol) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-cesto-border bg-card/20 text-sm text-muted-foreground"
        style={{ height }}
      >
        No external chart for this asset. Live oracle price shown above.
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-cesto-border bg-[#09110c]"
      style={{ height }}
    >
      <div ref={ref} className="tradingview-widget-container h-full w-full" />
    </div>
  );
}

// Compact mini-symbol widget used on the stocks grid cards.
export function TradingViewMini({ tvSymbol, height = 88 }: { tvSymbol: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tvSymbol || !ref.current) return;
    const el = ref.current;
    el.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: tvSymbol,
      width: "100%",
      height,
      locale: "en",
      dateRange: "3M",
      colorTheme: "dark",
      isTransparent: true,
      autosize: false,
      noTimeScale: true,
      chartOnly: true,
    });
    el.appendChild(script);
    return () => {
      el.innerHTML = "";
    };
  }, [tvSymbol, height]);

  if (!tvSymbol) return <div style={{ height }} />;
  return <div ref={ref} className="tradingview-widget-container" style={{ height }} />;
}
