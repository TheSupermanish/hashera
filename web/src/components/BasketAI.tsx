"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/format";

const TELEGRAM_BOT = process.env.NEXT_PUBLIC_TELEGRAM_BOT || "hasherafi_bot";

const SENTIMENT_STYLE: Record<string, string> = {
  bullish: "bg-cesto-emerald/15 text-cesto-emerald",
  bearish: "bg-destructive/15 text-destructive",
  neutral: "bg-secondary text-muted-foreground",
};

const SUGGESTED = [
  "What's driving this index right now?",
  "What are the biggest risks this week?",
  "What is the agent watching for the next rebalance?",
];

export function BasketAI({
  slug,
  name,
  rebalances,
}: {
  slug: string;
  name: string;
  rebalances: any[];
}) {
  const [news, setNews] = useState<any[] | null>(null);
  const [question, setQuestion] = useState("");
  const [insight, setInsight] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/news?basket=${slug}&limit=6`)
      .then((r) => r.json())
      .then((d) => setNews(d.news ?? []))
      .catch(() => setNews([]));
  }, [slug]);

  const latestAction = rebalances?.[0];

  const ask = async (q: string) => {
    const query = q || question;
    if (!query.trim()) return;
    setQuestion(query);
    setAsking(true);
    setError("");
    setInsight("");
    try {
      const r = await fetch("/api/ai/insight", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, question: query }),
      });
      const d = await r.json();
      if (!r.ok) setError(d.error ?? "AI request failed");
      else setInsight(d.insight);
    } catch {
      setError("Request failed");
    } finally {
      setAsking(false);
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-md bg-cesto-green/15 text-cesto-green">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
          </svg>
        </span>
        <h2 className="font-manrope text-xl font-semibold text-white">Moltiply AI</h2>
        <span className="rounded-full bg-cesto-green px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[#091313]">
          Beta
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        The AI agent that manages {name}: its latest on-chain action, live news for these holdings,
        and answers to your questions.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: agent action + ask */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-cesto-border bg-card/20 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <span className="size-1.5 rounded-full bg-cesto-green" />
              Latest agent action
            </div>
            {latestAction ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-foreground">{latestAction.reason}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {new Date(latestAction.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}{" "}
                  · rebalanced on-chain by the AI agent
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No rebalance yet. The agent monitors this index daily and acts when the thesis
                shifts.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-cesto-border bg-card/40 p-5">
            <h3 className="font-manrope font-semibold text-white">Ask the Portfolio AI</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Moltiply AI (Gemini) analyzes live allocations, prices and news for {name}.
            </p>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              placeholder="e.g. What happens to this index if rates get cut?"
              className="mt-3 w-full resize-none rounded-lg border border-cesto-border bg-background/60 px-3 py-2.5 text-sm text-white outline-none placeholder:text-muted-foreground focus:border-cesto-green/40"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  disabled={asking}
                  className="rounded-full border border-cesto-border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-cesto-green/50 hover:text-cesto-green disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              onClick={() => ask(question)}
              disabled={asking || !question.trim()}
              className="mt-3 w-full rounded-lg bg-cesto-green py-2.5 text-sm font-semibold uppercase tracking-wide text-[#091313] transition-colors hover:bg-cesto-green/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {asking ? "Analyzing..." : "Get AI Insight"}
            </button>
            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
            {insight && (
              <div className="mt-4 whitespace-pre-wrap rounded-lg border border-cesto-border bg-background/60 p-4 text-sm leading-relaxed text-muted-foreground">
                {insight}
              </div>
            )}
          </div>
        </div>

        {/* Right: basket news */}
        <div className="rounded-xl border border-cesto-border bg-card/20 p-5">
          <h3 className="font-manrope font-semibold text-white">News</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            AI-scored for impact on this index&apos;s holdings.
          </p>
          <div className="mt-4 space-y-4">
            {news === null && (
              <div className="h-24 animate-pulse rounded-lg border border-cesto-border bg-background/40" />
            )}
            {news?.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No news tagged to this index yet.
              </p>
            )}
            {news?.map((n, i) => (
              <article key={i} className="border-b border-cesto-border/50 pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${
                      SENTIMENT_STYLE[n.sentiment] ?? SENTIMENT_STYLE.neutral
                    }`}
                  >
                    {n.sentiment}
                  </span>
                  <span className="text-[11px] capitalize text-muted-foreground">{n.impact} impact</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">
                    {n.publishedAt ? timeAgo(n.publishedAt) : ""}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-medium leading-snug text-white">
                  {n.url ? (
                    <a href={n.url} target="_blank" rel="noreferrer" className="hover:text-cesto-green">
                      {n.title}
                    </a>
                  ) : (
                    n.title
                  )}
                </h4>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{n.summary}</p>
              </article>
            ))}
          </div>

          {/* Connect Telegram for live alerts on this index */}
          <a
            href={`https://t.me/${TELEGRAM_BOT}?start=${slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center gap-3 rounded-lg border border-cesto-border bg-background/40 p-3 transition-colors hover:border-cesto-green/50"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cesto-green/15 text-cesto-green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21.9 4.3L18.5 20c-.3 1.1-.9 1.4-1.9.9l-5.2-3.8-2.5 2.4c-.3.3-.5.5-1 .5l.4-5.1L16.6 6c.4-.4-.1-.6-.6-.2L6.3 12l-4.9-1.5c-1.1-.3-1.1-1 .2-1.5l19.1-7.4c.9-.3 1.7.2 1.2 2.7z" />
              </svg>
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">Connect Telegram</div>
              <div className="text-xs text-muted-foreground">
                Get news &amp; rebalance alerts for {name} the moment they happen.
              </div>
            </div>
            <span className="ml-auto text-cesto-green">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
