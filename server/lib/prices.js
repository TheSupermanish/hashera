// Price engine: pulls REAL market data (Yahoo Finance) for every tracked asset
// and mirrors it into the DB price series + the on-chain PriceOracle.
//
// Equities and crypto use their real tickers via Yahoo's public chart endpoint
// (no key). HSK has no market feed, so it is lightly simulated around its base.

const { ethers } = require("ethers");
const { PricePoint, Basket } = require("./models");

// internal symbol -> Yahoo Finance ticker
const YAHOO = {
  INTCon: "INTC", MUon: "MU", GEVon: "GEV", CATon: "CAT", MPon: "MP", VRTon: "VRT",
  ETNon: "ETN", VSTon: "VST", NVDAon: "NVDA", AVGOon: "AVGO", MSFTon: "MSFT",
  GOOGLon: "GOOGL", AAPLon: "AAPL", PANWon: "PANW", TEMon: "TEM", AMDon: "AMD",
  TSMon: "TSM", PLTRon: "PLTR", SONYon: "SONY", TMon: "TM", NTDOYon: "NTDOY",
  MUFGon: "MUFG", FRCYon: "FRCOY", SFTBYon: "SFTBY",
  cBTC: "BTC-USD", cETH: "ETH-USD", SPX: "^GSPC",
};

let deployment = null;
try {
  deployment = require("../deployment.json");
} catch {}

const ORACLE_ABI = [
  "function setPrices(address[] assets, uint256[] prices) external",
  "function setPriceForce(address asset, uint256 price) external",
];

async function allTrackedSymbols() {
  const baskets = await Basket.find({}).lean();
  const set = new Set(["SPX", "cHSK"]);
  for (const b of baskets) for (const a of b.allocation ?? []) set.add(a.symbol);
  return [...set];
}

/** Real spot price for one Yahoo ticker (regularMarketPrice). */
async function yahooSpot(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?interval=1d&range=1d`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`yahoo ${ticker} ${res.status}`);
  const d = await res.json();
  const p = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof p !== "number") throw new Error(`yahoo ${ticker} no price`);
  return p;
}

/** Real daily closes for one Yahoo ticker over `range` (e.g. "1y"). */
async function yahooHistory(ticker, range = "1y") {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?interval=1d&range=${range}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`yahoo ${ticker} ${res.status}`);
  const d = await res.json();
  const r = d?.chart?.result?.[0];
  const ts = r?.timestamp ?? [];
  const closes = r?.indicators?.quote?.[0]?.close ?? [];
  const out = [];
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] == null) continue;
    out.push({ ts: new Date(ts[i] * 1000), price: +Number(closes[i]).toFixed(closes[i] < 5 ? 5 : 2) });
  }
  return out;
}

function boxMuller() {
  const u1 = Math.max(Math.random(), 1e-9);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
}

async function fetchOne(symbol) {
  if (YAHOO[symbol]) return yahooSpot(YAHOO[symbol]);
  // HSK: no market feed — gentle walk around the last value.
  const last = await PricePoint.findOne({ symbol }).sort({ ts: -1 }).lean();
  const base = last?.price ?? 0.65;
  return +(base * Math.exp(0.002 * boxMuller())).toFixed(5);
}

/**
 * Live tick: write one fresh real price per tracked symbol. Fetches run in
 * bounded-concurrency batches so a single tick can't approach the 5-min cadence
 * (28 sequential 12s timeouts would); a symbol that fails is skipped, not fatal.
 */
async function updatePrices() {
  const symbols = await allTrackedSymbols();
  const now = new Date();
  const BATCH = 8;
  let updated = 0;
  const failed = [];

  for (let i = 0; i < symbols.length; i += BATCH) {
    const chunk = symbols.slice(i, i + BATCH);
    const results = await Promise.allSettled(chunk.map((s) => fetchOne(s)));
    const docs = [];
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

async function latestPrice(symbol) {
  const p = await PricePoint.findOne({ symbol }).sort({ ts: -1 }).lean();
  return p?.price ?? null;
}

/** Push current DB prices to the on-chain oracle (deviation-guarded setPrices). */
async function pushOracle() {
  if (!deployment || !process.env.ORACLE_UPDATER_KEY) {
    return { pushed: 0, skipped: "no deployment or ORACLE_UPDATER_KEY" };
  }
  const rpc = deployment.chainId === 177 ? "https://mainnet.hsk.xyz" : "https://testnet.hsk.xyz";
  const signer = new ethers.Wallet(process.env.ORACLE_UPDATER_KEY, new ethers.JsonRpcProvider(rpc));
  const oracle = new ethers.Contract(deployment.oracle, ORACLE_ABI, signer);

  const addrs = [];
  const prices = [];
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

module.exports = { updatePrices, pushOracle, latestPrice, allTrackedSymbols, yahooSpot, yahooHistory, YAHOO };
