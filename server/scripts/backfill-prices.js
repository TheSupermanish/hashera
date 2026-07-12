// One-shot: replace the simulated price history with REAL 1-year daily closes
// from Yahoo Finance for every tracked asset, and (if a key is present) force
// the on-chain oracle to the latest real price.
//
//   node scripts/backfill-prices.js

require("dotenv").config();
const { ethers } = require("ethers");
const { connect } = require("../lib/db");
const { PricePoint } = require("../lib/models");
const { yahooHistory, YAHOO } = require("../lib/prices");

let deployment = null;
try { deployment = require("../deployment.json"); } catch {}

const ORACLE_ABI = ["function setPriceForce(address asset, uint256 price) external"];

function syntheticHSK(days = 366) {
  const out = [];
  const now = new Date(); now.setUTCHours(0, 0, 0, 0);
  let v = 0.42;
  for (let i = days - 1; i >= 0; i--) {
    v = Math.max(0.05, v * Math.exp(0.7 / 252 - 0.5 * 0.85 * 0.85 / 252 + 0.85 * Math.sqrt(1 / 252) * (Math.random() * 2 - 1)));
    out.push({ ts: new Date(now.getTime() - i * 86400_000), price: +v.toFixed(5) });
  }
  return out;
}

async function main() {
  await connect();
  const symbols = [...Object.keys(YAHOO), "cHSK"];
  const latest = {};

  for (const symbol of symbols) {
    try {
      let hist;
      if (symbol === "cHSK") hist = syntheticHSK();
      else hist = await yahooHistory(YAHOO[symbol], "1y");
      if (!hist.length) { console.warn(`[backfill] ${symbol}: empty`); continue; }
      await PricePoint.deleteMany({ symbol });
      await PricePoint.insertMany(hist.map((h) => ({ symbol, ts: h.ts, price: h.price })));
      latest[symbol] = hist[hist.length - 1].price;
      console.log(`[backfill] ${symbol} (${YAHOO[symbol] ?? "synthetic"}): ${hist.length} days, last $${latest[symbol]}`);
    } catch (e) {
      console.warn(`[backfill] ${symbol} failed: ${e.message}`);
    }
  }

  // Force on-chain oracle to the real latest prices so invest/buy match display.
  if (deployment && process.env.ORACLE_UPDATER_KEY) {
    const rpc = deployment.chainId === 177 ? "https://mainnet.hsk.xyz" : "https://testnet.hsk.xyz";
    const signer = new ethers.Wallet(process.env.ORACLE_UPDATER_KEY, new ethers.JsonRpcProvider(rpc));
    const oracle = new ethers.Contract(deployment.oracle, ORACLE_ABI, signer);
    let pushed = 0;
    for (const [symbol, address] of Object.entries(deployment.tokens)) {
      const price = latest[symbol];
      if (price == null) continue;
      try {
        const tx = await oracle.setPriceForce(address, ethers.parseUnits(price.toFixed(8), 8));
        await tx.wait();
        pushed++;
      } catch (e) {
        console.warn(`[backfill] oracle ${symbol} failed: ${e.message}`);
      }
    }
    console.log(`[backfill] forced ${pushed} on-chain oracle prices`);
  } else {
    console.log("[backfill] skipped on-chain sync (no ORACLE_UPDATER_KEY)");
  }

  console.log("[backfill] done");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
