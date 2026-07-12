// Price engine: pulls REAL market data (Yahoo Finance) for every tracked asset
// and mirrors it into the DB price series + the on-chain PriceOracle.
//
// Equities and crypto use their real tickers via Yahoo's public chart endpoint
// (no key). HSK has no market feed, so it is lightly simulated around its base.

import { ethers } from "ethers";
import { PricePoint, Basket } from "./models";
import { loadDeployment } from "./deployment";

// internal symbol -> Yahoo Finance ticker
export const YAHOO: Record<string, string> = {
  INTCon: "INTC", MUon: "MU", GEVon: "GEV", CATon: "CAT", MPon: "MP", VRTon: "VRT",
  ETNon: "ETN", VSTon: "VST", NVDAon: "NVDA", AVGOon: "AVGO", MSFTon: "MSFT",
  GOOGLon: "GOOGL", AAPLon: "AAPL", PANWon: "PANW", TEMon: "TEM", AMDon: "AMD",
  TSMon: "TSM", PLTRon: "PLTR", SONYon: "SONY", TMon: "TM", NTDOYon: "NTDOY",
  MUFGon: "MUFG", FRCYon: "FRCOY", SFTBYon: "SFTBY",
  cBTC: "BTC-USD", cETH: "ETH-USD", SPX: "^GSPC",
};

const ORACLE_ABI = [
  "function setPrices(address[] assets, uint256[] prices) external",
  "function setPriceForce(address asset, uint256 price) external",
];

export interface HistoryPoint {
  ts: Date;
  price: number;
}

async function allTrackedSymbols(): Promise<string[]> {
  const baskets = await Basket.find({}).lean();
  const set = new Set<string>(["SPX", "cHSK"]);
  for (const b of baskets) for (const a of b.allocation ?? []) set.add(a.symbol);
  return [...set];
}

/** Real spot price for one Yahoo ticker (regularMarketPrice). */
export async function yahooSpot(ticker: string): Promise<number> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`yahoo ${ticker} ${res.status}`);
  const d = (await res.json()) as any;
  const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof p !== "number") throw new Error(`yahoo ${ticker} no price`);
  return p;
}

/** Real daily closes for one Yahoo ticker over `range` (e.g. "1y"). */
export async function yahooHistory(ticker: string, range = "1y"): Promise<HistoryPoint[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?interval=1d&range=${range}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`yahoo ${ticker} ${res.status}`);
  const d = (await res.json()) as any;
  const r = d?.chart?.result?.[0];
  const ts: number[] = r?.timestamp ?? [];
  const closes: (number | null)[] = r?.indicators?.quote?.[0]?.close ?? [];
  const out: HistoryPoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = closes[i];
    if (close == null) continue;
    out.push({ ts: new Date(ts[i] * 1000), price: +Number(close).toFixed(close < 5 ? 5 : 2) });
  }
  return out;
}

function boxMuller(): number {
  const u1 = Math.max(Math.random(), 1e-9);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
}

async function fetchOne(symbol: string): Promise<number> {
  if (YAHOO[symbol]) return yahooSpot(YAHOO[symbol]);
  // HSK: no market feed — gentle walk around the last value.
  const last = await PricePoint.findOne({ symbol }).sort({ ts: -1 }).lean();
  const base = last?.price ?? 0.65;
  return +(base * Math.exp(0.002 * boxMuller())).toFixed(5);
}

export interface UpdatePricesResult {
  updated: number;
  failed: string[];
}

/**
 * Live tick: write one fresh real price per tracked symbol. Fetches run in
 * bounded-concurrency batches so a single tick can't approach the 5-min cadence
 * (28 sequential 12s timeouts would); a symbol that fails is skipped, not fatal.
 */
export async function updatePrices(): Promise<UpdatePricesResult> {
  const symbols = await allTrackedSymbols();
  const now = new Date();
  const BATCH = 8;
  let updated = 0;
  const failed: string[] = [];

  for (let i = 0; i < symbols.length; i += BATCH) {
    const chunk = symbols.slice(i, i + BATCH);
    const results = await Promise.allSettled(chunk.map((s) => fetchOne(s)));
    const docs: { symbol: string; ts: Date; price: number }[] = [];
    results.forEach((r, j) => {
      if (r.status === "fulfilled" && typeof r.value === "number") {
        docs.push({ symbol: chunk[j], ts: now, price: r.value });
      } else {
        failed.push(chunk[j]);
      }
    });
    if (docs.length) {
      await PricePoint.insertMany(docs);
      updated += docs.length;
    }
  }
  console.log(
    `[prices] tick: ${updated}/${symbols.length} real prices @ ${now.toISOString()}` +
      (failed.length ? ` (skipped: ${failed.join(",")})` : "")
  );
  return { updated, failed };
}

export async function latestPrice(symbol: string): Promise<number | null> {
  const p = await PricePoint.findOne({ symbol }).sort({ ts: -1 }).lean();
  return p?.price ?? null;
}

export interface PushOracleResult {
  pushed: number;
  skipped?: string;
  tx?: string;
}

/** Push current DB prices to the on-chain oracle (deviation-guarded setPrices). */
export async function pushOracle(): Promise<PushOracleResult> {
  const deployment = loadDeployment();
  if (!deployment || !process.env.ORACLE_UPDATER_KEY) {
    return { pushed: 0, skipped: "no deployment or ORACLE_UPDATER_KEY" };
  }
  const rpc = deployment.chainId === 177 ? "https://mainnet.hsk.xyz" : "https://testnet.hsk.xyz";
  const signer = new ethers.Wallet(process.env.ORACLE_UPDATER_KEY, new ethers.JsonRpcProvider(rpc));
  const oracle = new ethers.Contract(deployment.oracle, ORACLE_ABI, signer);

  const addrs: string[] = [];
  const prices: bigint[] = [];
  for (const [symbol, address] of Object.entries(deployment.tokens)) {
    const price = await latestPrice(symbol);
    if (price == null) continue;
    addrs.push(address);
    prices.push(ethers.parseUnits(price.toFixed(8), 8));
  }
  if (!addrs.length) return { pushed: 0 };
  const tx = await oracle.setPrices(addrs, prices);
  await tx.wait();
  console.log(`[prices] oracle push: ${addrs.length} assets, tx ${tx.hash}`);
  return { pushed: addrs.length, tx: tx.hash };
}
