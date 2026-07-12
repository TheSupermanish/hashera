# Hashera — AI-managed RWA Investment Baskets on HashKey Chain

DeFAI = **DeFi + AI + RWA**. Hashera packages tokenized real-world assets
(US and Japanese equities, crypto majors) into one-click investment baskets on
**HashKey Chain**, managed by an AI agent that digests market news, alerts users
on Telegram, and rebalances portfolios on-chain. USDC settlement is structured
to route through **HSP** (HashKey Settlement Protocol) for compliant,
receipt-backed transfers.

Built for the **On-Chain Horizon Hackathon** (HashKey Chain · DeFi + AI tracks).

## What it does

- **Investment Baskets**: themed portfolios ("Made in America", "Nancy Pelosi
  Tracker", "AI Revolution", "Tokyo Blue Chips", "Crypto Majors") of synthetic
  RWA tokens. Users invest USDC and receive basket shares at oracle NAV, in a
  single transaction.
- **Build-your-own index**: the `/create` page lets anyone compose a custom
  basket from the asset catalog; an admin step deploys its on-chain vault via
  the `BasketFactory` so it becomes investable.
- **Single-stock trading**: the `/stocks` page and `StockStore` contract let
  users buy/sell individual tokenized equities directly at the oracle price.
- **Synthetic RWA engine**: each equity (Intel, NVIDIA, Sony, ...) is an ERC-20
  `RWAToken` minted/burned only by basket vaults / the stock store against USDC
  collateral at the `PriceOracle` price. Spot exposure, no margin, no liquidation.
- **AI news engine**: Gemini reads market headlines, keeps only what is
  material to a basket, scores sentiment + impact, and maps it to affected
  baskets. Shown in the web app and pushed to Telegram.
- **AI rebalancing agent**: Gemini reviews performance + news per basket, and
  can execute `BasketVault.rebalance()` on-chain (guard-railed: ±500 bps max
  move per asset, weights must sum to 100%, 7-day cooldown). Every rebalance is
  recorded on a public timeline and broadcast to subscribers.
- **HSP settlement layer**: the USDC payment leg is designed to settle through
  HSP mandates — a payer signs an EIP-712 Mandate, an adapter settles it and
  emits a signed Receipt, and a verifier checks compliance capabilities
  (KYC/sanctions) before acceptance.
- **Telegram bot**: `/baskets`, `/basket <slug>`, `/news`, `/subscribe <slug>`,
  plus automatic push of news digests and rebalance alerts.
- **Portfolio**: positions valued at live on-chain NAV, PnL vs. recorded cost
  basis, full activity history with explorer links.

## Architecture

```
hashera/
├── contracts/        Hardhat + Solidity 0.8.24 (HashKey Chain)
│   ├── MockUSDC      6-dec test stable with public faucet
│   ├── PriceOracle   push oracle, USD 8-dec, role-gated updaters
│   ├── RWAToken      synthetic tokenized equity (vault-only mint/burn)
│   ├── BasketVault   ERC-20 shares; invest/redeem at NAV; AI rebalance
│   ├── BasketFactory deploys + registers vaults
│   └── StockStore    single-stock buy/sell at oracle price
├── web/              Next.js 14 (App Router) + MongoDB + wagmi/viem
│   ├── /baskets              basket grid with live returns
│   ├── /baskets/[slug]       About / Historical / Risk / Resources tabs,
│   │                         allocation donut, per-asset cards + sparklines,
│   │                         backtest vs S&P 500, invest panel, rebalance timeline
│   ├── /stocks, /stocks/[symbol]  tokenized single-stock trading
│   ├── /positions            portfolio, PnL, activity
│   ├── /create               build a custom index from the asset catalog
│   └── /api/*                baskets, stocks, history, news, transactions, AI insight, seed
└── server/           Express + grammY + node-cron + ethers (TypeScript)
    ├── price engine  REAL market data via Yahoo Finance (equities + crypto),
    │                 HSK lightly simulated; pushes prices on-chain every 15 min
    ├── news engine   RSS → Gemini digest → MongoDB → Telegram push
    ├── AI rebalancer daily agent run, on-chain execution via MANAGER_ROLE
    └── Telegram bot  quotes, subscriptions, alerts
```

**Chain**: HashKey Chain mainnet (chainId **177**, RPC `https://mainnet.hsk.xyz`,
explorer `https://hashkey.blockscout.com`) and testnet (chainId **133**,
RPC `https://testnet.hsk.xyz`, faucet `https://faucet.hsk.xyz/faucet`).
Mainnet USDC.e: `0x054ed45810DbBAb8B27668922D110669c9D88D0a` (6 decimals).

**Deployment status**: fully deployed and running on **testnet** (see
`contracts/deployments/hashkeyTestnet.json`). Mainnet deployment is a single
command once the deployer wallet holds HSK for gas (mainnet gas is ~0.001 gwei,
so a full deploy costs a fraction of an HSK).

## Quick start

Prereqs: Node 20+, MongoDB running locally (or an Atlas URI).

### 1. Contracts

```bash
cd contracts
npm install
npx hardhat test

cp .env.example .env                   # add DEPLOYER_PRIVATE_KEY
npx hardhat run scripts/deploy.js --network hashkeyTestnet
# mainnet (hackathon requirement):
npx hardhat run scripts/deploy.js --network hashkey
```

The deploy script writes `deployments/<network>.json` and copies it into
`web/src/lib/deployment.json` and `server/deployment.json` automatically.
By default it deploys `MockUSDC` (with a faucet, so judges can demo). To use
real USDC.e on mainnet set `STABLE_ADDRESS=0x054ed45810DbBAb8B27668922D110669c9D88D0a`.

### 2. Web app (http://localhost:7811)

```bash
cd web
npm install
cp .env.example .env.local             # MONGODB_URI, GEMINI_API_KEY (or Vertex ADC)
npm run dev
curl -X POST http://localhost:7811/api/dev/seed   # seed baskets + price history
```

Open http://localhost:7811. Connect MetaMask (the app prompts to switch to
HashKey Chain), grab test USDC from the in-app faucet button, and invest.

### 3. Server — bot + AI engines (http://localhost:7812)

```bash
cd server
npm install
cp .env.example .env    # TELEGRAM_BOT_TOKEN, GEMINI_API_KEY (or Vertex ADC),
                        # ORACLE_UPDATER_KEY, REBALANCER_KEY, MONGODB_URI
npm start
npm run backfill        # optional: load 1y of real Yahoo price history + on-chain sync
```

Cron cadence: prices every 5 min, on-chain oracle push every 15 min, AI news
digest every 30 min, Telegram news push every 10 min, AI rebalancer daily.
Manual triggers (Bearer `ADMIN_TOKEN`):

```bash
curl -X POST localhost:7812/api/tick/news
curl -X POST "localhost:7812/api/tick/rebalance?execute=1"
curl -X POST localhost:7812/api/tick/oracle
```

## How the money flows

1. `invest(amount)`: user's USDC moves to the vault (fee to treasury). The
   vault mints each underlying `RWAToken` to itself pro-rata to target weights
   at oracle prices, and mints basket shares to the user at NAV.
2. Prices update on-chain; `sharePrice()` = basket NAV per share, so shares
   track the underlying equities.
3. `redeem(shares)`: burns shares and underlying units pro-rata, pays USDC at
   the lesser of NAV and the redeemer's pro-rata collateral slice (solvent by
   construction; `fund()` is the treasury's solvency backstop).
4. `rebalance(newWeights, reason)`: MANAGER_ROLE (the AI agent) re-targets
   weights value-neutrally; the event powers the public rebalance timeline.

The USDC settlement leg is structured to route through **HSP** mandates so each
transfer carries a verifiable, compliance-attested receipt.

## AI

Both the news engine and the portfolio agent use **Google Gemini**
(`gemini-2.5-flash` by default), via either a Vertex AI login (gcloud ADC) or an
AI Studio `GEMINI_API_KEY`. The web app's "Ask the Hashera AI" (`/api/ai/insight`)
answers questions about a basket's live allocation, prices and news.

## Hackathon mapping

- **DeFi track**: on-chain basket vaults, oracle-priced synthetic RWAs, a
  single-stock store, USDC settlement on HashKey Chain, and an **HSP** settlement
  layer for compliant, receipt-backed transfers.
- **AI track**: Gemini-powered news digestion, portfolio Q&A, and an autonomous
  guard-railed rebalancing agent with on-chain execution.
- **RWA**: tokenized US/JP equities under the same institutional-RWA thesis as
  HashKey Chain's ecosystem (Bosera tokenized MMF, GF Token).
- **HSP**: settlement of the USDC payment leg through HSP (HashKey Settlement
  Protocol) mandates — see `https://github.com/project-hsp/hsp` and the manual
  on `https://hashfans.io/`.

## Notes

- Equity/crypto prices are **real**, pulled from Yahoo Finance; HSK (no market
  feed) is lightly simulated. Swap in a licensed feed (Polygon.io, Twelve Data)
  in `server/lib/prices.ts` for production.
- Backtests are hypothetical, computed from the seeded/backfilled price history.
- HSP integration covers the settlement design and app-level flow; the on-chain
  mandate/adapter/verifier wiring is in progress.
- Nothing here is financial advice.
```
