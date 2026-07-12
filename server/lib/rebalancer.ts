// AI portfolio agent: Gemini reviews each basket's recent performance + news
// and can propose a rebalance. If REBALANCER_KEY is set (a wallet holding
// MANAGER_ROLE on the vaults), approved proposals are executed on-chain via
// BasketVault.rebalance() and subscribers are alerted on Telegram.

import { ethers } from "ethers";
import { generate, hasAI } from "./ai";
import { Basket, NewsItem, RebalanceEvent, type BasketDoc } from "./models";
import { quote, basketReturn } from "./metrics";
import { broadcastRebalance } from "./telegram";
import { loadDeployment } from "./deployment";
import type { Quote } from "../types";

const VAULT_ABI = ["function rebalance(uint16[] newWeights, string reason) external"];

/** Untrusted AI proposal shape. */
interface WeightEntry {
  symbol?: string;
  weightBps?: number;
}
interface Proposal {
  rebalance?: boolean;
  reason?: string;
  newWeights?: WeightEntry[];
}

interface RebalancerResult {
  checked: number;
  skipped?: string;
  rebalanced?: { slug: string; reason: string; txHash?: string }[];
  previews?: { slug: string; reason: string; newWeights: number[] }[];
}

async function proposeRebalance(basket: BasketDoc): Promise<Proposal> {
  const quotes: Record<string, Quote | null> = {};
  for (const a of basket.allocation) quotes[a.symbol] = await quote(a.symbol);
  const perf30 = await basketReturn(basket.allocation, 30);
  const news = await NewsItem.find({ basketSlugs: basket.slug })
    .sort({ publishedAt: -1 })
    .limit(5)
    .lean();

  const text = await generate({
    maxTokens: 900,
    json: true,
    system:
      "You are the Moltiply AI portfolio agent managing tokenized RWA baskets on HashKey Chain. " +
      "You are conservative: propose a rebalance ONLY when there is a clear thesis-driven reason " +
      "(major news, sustained divergence). Weight changes per asset must stay within ±500 bps. " +
      "Weights are integers in basis points and MUST sum to exactly 10000.",
    user:
      `Basket: ${basket.name} (${basket.slug})\nStrategy: ${basket.description}\n\n` +
      `Current allocation (bps): ${JSON.stringify(
        basket.allocation.map((a) => ({ symbol: a.symbol, weightBps: a.weightBps }))
      )}\n30d basket return: ${perf30}%\n` +
      `Quotes: ${JSON.stringify(quotes)}\n` +
      `Recent news: ${JSON.stringify(news.map((n) => ({ title: n.title, summary: n.summary, sentiment: n.sentiment })))}\n\n` +
      `Return JSON: {"rebalance": boolean, "reason": string, ` +
      `"newWeights": [{"symbol": s, "weightBps": n}, ...] (required if rebalance=true, same symbols, sum 10000)}`,
  });

  try {
    return JSON.parse(text.replace(/^```(json)?|```$/g, "").trim()) as Proposal;
  } catch {
    return { rebalance: false };
  }
}

export async function runRebalancer({ execute = false }: { execute?: boolean } = {}): Promise<RebalancerResult> {
  if (!hasAI()) return { checked: 0, skipped: "no GEMINI_API_KEY" };
  const deployment = loadDeployment();
  const baskets = await Basket.find({}).lean();
  const results: { slug: string; reason: string; txHash?: string }[] = [];
  const previews: { slug: string; reason: string; newWeights: number[] }[] = [];

  for (const basket of baskets) {
    try {
      // Cooldown: at most one rebalance per basket per 7 days.
      const recent = await RebalanceEvent.findOne({
        basketSlug: basket.slug,
        date: { $gte: new Date(Date.now() - 7 * 86400_000) },
      });
      if (recent) continue;

      const proposal = await proposeRebalance(basket);
      if (!proposal?.rebalance || !Array.isArray(proposal.newWeights)) continue;
      const newWeights = proposal.newWeights;

      // Validate: same symbols, integer non-negative weights, ±500bps band, sum 10000.
      const currentBySymbol = Object.fromEntries(basket.allocation.map((a) => [a.symbol, a.weightBps]));
      const symbols = basket.allocation.map((a) => a.symbol);
      const proposed = symbols.map((s) => newWeights.find((w) => w.symbol === s)?.weightBps);
      const valid =
        proposed.every(
          (w, i) =>
            typeof w === "number" &&
            Number.isInteger(w) &&
            w >= 0 &&
            w <= 10000 &&
            Math.abs(w - currentBySymbol[symbols[i]]) <= 500
        ) && proposed.reduce<number>((a, b) => a + (b ?? 0), 0) === 10000;
      if (!valid) {
        console.warn(`[rebalancer] rejected invalid proposal for ${basket.slug}`);
        continue;
      }
      // `valid` proves every entry is an integer in range — safe to treat as numbers.
      const weights = proposed as number[];
      const reason = typeof proposal.reason === "string" ? proposal.reason : "AI rebalance";

      // Dry-run: with execute=false, DO NOT touch the chain, DB, or Telegram.
      // Report the proposal so a caller can inspect it.
      if (!execute) {
        previews.push({ slug: basket.slug, reason, newWeights: weights });
        continue;
      }

      let txHash: string | undefined;
      if (deployment && process.env.REBALANCER_KEY && basket.vaultAddress) {
        const rpc = deployment.chainId === 177 ? "https://mainnet.hsk.xyz" : "https://testnet.hsk.xyz";
        const signer = new ethers.Wallet(process.env.REBALANCER_KEY, new ethers.JsonRpcProvider(rpc));
        const vault = new ethers.Contract(basket.vaultAddress, VAULT_ABI, signer);
        const tx = await vault.rebalance(weights, reason.slice(0, 280));
        await tx.wait();
        txHash = tx.hash;
        console.log(`[rebalancer] executed on-chain for ${basket.slug}: ${txHash}`);
      } else {
        // No on-chain path configured: skip this basket entirely rather than
        // record a rebalance that never happened.
        console.warn(`[rebalancer] execute requested but no chain path for ${basket.slug}, skipping`);
        continue;
      }

      const event = await RebalanceEvent.create({
        basketSlug: basket.slug,
        date: new Date(),
        oldAllocation: basket.allocation.map((a) => ({ symbol: a.symbol, weightBps: a.weightBps })),
        newAllocation: symbols.map((s, i) => ({ symbol: s, weightBps: weights[i] })),
        reason,
        txHash,
        triggeredBy: "ai-agent",
      });

      // Keep DB allocation in sync so the UI reflects the new weights.
      await Basket.updateOne(
        { slug: basket.slug },
        {
          $set: {
            allocation: basket.allocation.map((a) => ({
              ...a,
              weightBps: weights[symbols.indexOf(a.symbol)],
            })),
          },
        }
      );

      await broadcastRebalance(event, basket.name);
      results.push({ slug: basket.slug, reason, txHash });
    } catch (e) {
      console.error(`[rebalancer] ${basket.slug} failed: ${(e as Error).message}`);
    }
  }

  return execute
    ? { checked: baskets.length, rebalanced: results }
    : { checked: baskets.length, previews };
}
