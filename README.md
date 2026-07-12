# Moltiply — AI-managed RWA Investment Baskets on HashKey Chain

DeFAI = **DeFi + AI + RWA**. Moltiply packages tokenized real-world assets
(US and Japanese equities, crypto majors) into one-click investment baskets on
**HashKey Chain**, managed by an AI agent that digests market news, alerts users
on Telegram, and rebalances portfolios on-chain.

Built for the **On-Chain Horizon Hackathon** (HashKey Chain · DeFi + AI tracks).

## What it does

- **Investment Baskets**: themed portfolios ("Made in America", "Nancy Pelosi
  Tracker", "AI Revolution", "Tokyo Blue Chips", "Crypto Majors") of synthetic
  RWA tokens. Users invest USDC and receive basket shares at oracle NAV, in a
  single transaction.
- **Synthetic RWA engine**: each equity (Intel, NVIDIA, Sony, ...) is an ERC-20
  `RWAToken` minted/burned only by basket vaults against USDC collateral at the
  `PriceOracle` price. Spot exposure, no margin, no liquidation.
- **AI news engine**: Claude reads market headlines, keeps only what is
  material to a basket, scores sentiment + impact, and maps it to affected
  baskets. Shown in the web app (Labs) and pushed to Telegram.
- **AI rebalancing agent**: Claude reviews performance + news per basket, and
  can execute `BasketVault.rebalance()` on-chain (guard-railed: ±5% max move
  per asset, weights must sum to 100%, 7-day cooldown). Every rebalance is
  recorded on a public timeline and broadcast to subscribers.
- **Telegram bot**: `/baskets`, `/basket <slug>`, `/news`, `/subscribe <slug>`,
  plus automatic push of news digests and rebalance alerts.
- **Portfolio**: positions valued at live on-chain NAV, PnL vs. recorded cost
  basis, full activity history with explorer links.

## Architecture

```
moltiply/
├── contracts/        Hardhat + Solidity 0.8.24 (HashKey Chain)
│   ├── MockUSDC      6-dec test stable with public faucet
│   ├── PriceOracle   push oracle, USD 8-dec, role-gated updaters
│   ├── RWAToken      synthetic tokenized equity (vault-only mint/burn)
│   ├── BasketVault   ERC-20 shares; invest/redeem at NAV; AI rebalance
│   └── BasketFactory deploys + registers vaults
├── web/              Next.js 14 (App Router) + MongoDB + wagmi/viem
│   ├── /baskets              basket grid with live returns
│   ├── /baskets/[slug]       About / Historical / Risk / Resources tabs,
│   │                         allocation donut, per-asset cards + sparklines,
│   │                         backtest vs S&P 500, invest panel, rebalance timeline
│   ├── /positions            portfolio, PnL, activity
│   ├── /labs                 AI news digest + "Ask the Portfolio AI" + Telegram
│   └── /api/*                baskets, history, news, transactions, AI insight, seed
└── server/           Express + grammY + node-cron + ethers
    ├── price engine  crypto spot via CoinGecko, equity simulator (demo mode),
    │                 pushes prices on-chain to PriceOracle every 15 min
    ├── news engine   RSS → Claude digest → MongoDB → Telegram push
    ├── AI rebalancer daily agent run, on-chain execution via MANAGER_ROLE
    └── Telegram bot  quotes, subscriptions, alerts
```

**Chain**: HashKey Chain mainnet (chainId **177**, RPC `https://mainnet.hsk.xyz`,
explorer `https://hashkey.blockscout.com`) and testnet (chainId **133**,
RPC `https://testnet.hsk.xyz`, faucet `https://faucet.hsk.xyz/faucet`).
Mainnet USDC.e: `0x054ed45810DbBAb8B27668922D110669c9D88D0a` (6 decimals).

## Quick start

Prereqs: Node 20+, MongoDB running locally (or an Atlas URI).

### 1. Contracts

```bash
cd contracts
npm install
npx hardhat test                       # 8 passing tests

cp .env.example .env                   # add DEPLOYER_PRIVATE_KEY
npx hardhat run scripts/deploy.js --network hashkeyTestnet
# mainnet (hackathon requirement):
npx hardhat run scripts/deploy.js --network hashkey
```

The deploy script writes `deployments/<network>.json` and copies it into
`web/src/lib/deployment.json` and `server/deployment.json` automatically.
By default it deploys `MockUSDC` (with a faucet, so judges can demo). To use
real USDC.e on mainnet set `STABLE_ADDRESS=0x054ed45810DbBAb8B27668922D110669c9D88D0a`.

Verify on Blockscout (optional):
`npx hardhat verify --network hashkey <address> <constructor args>`

### 2. Web app

```bash
cd web
npm install
cp .env.example .env.local             # MONGODB_URI, ANTHROPIC_API_KEY
npm run dev
curl -X POST http://localhost:3000/api/dev/seed   # seed baskets + 1y price history
```

Open http://localhost:3000. Connect MetaMask (the app prompts to switch to
HashKey Chain), grab test USDC from the in-app faucet button, and invest.

### 3. Server (bot + AI engines)

```bash
cd server
npm install
cp .env.example .env    # TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY,
                        # ORACLE_UPDATER_KEY, REBALANCER_KEY, MONGODB_URI
npm start
```

Cron cadence: prices every 5 min, on-chain oracle push every 15 min, AI news
digest every 30 min, Telegram news push every 10 min, AI rebalancer daily.
Manual triggers (Bearer `ADMIN_TOKEN`):

```bash
curl -X POST localhost:4000/api/tick/news
curl -X POST "localhost:4000/api/tick/rebalance?execute=1"
curl -X POST localhost:4000/api/tick/oracle
```

## How the money flows

1. `invest(amount)`: user's USDC moves to the vault (fee to treasury). The
   vault mints each underlying `RWAToken` to itself pro-rata to target weights
   at oracle prices, and mints basket shares to the user at NAV.
2. Prices update on-chain; `sharePrice()` = basket NAV per share, so shares
   track the underlying equities.
3. `redeem(shares)`: burns shares and underlying units pro-rata, pays USDC at
   NAV from vault collateral (`fund()` is the treasury's solvency backstop).
4. `rebalance(newWeights, reason)`: MANAGER_ROLE (the AI agent) re-targets
   weights value-neutrally; the event powers the public rebalance timeline.

## Hackathon mapping

- **DeFi track**: on-chain basket vaults, oracle-priced synthetic RWAs, USDC
  settlement on HashKey Chain mainnet.
- **AI track**: Claude-powered news digestion, portfolio Q&A, and an
  autonomous guard-railed rebalancing agent with on-chain execution.
- **RWA**: tokenized US/JP equities under the same institutional-RWA thesis as
  HashKey Chain's ecosystem (Bosera tokenized MMF, GF Token).
- **HSP**: the payment leg can settle through HSP (HashKey Settlement
  Protocol) mandates for compliant USDC flows; see `https://github.com/project-hsp/hsp`.

## Notes

- Equity prices run on a market simulator in demo mode (deterministic seed +
  GBM ticks). Swap in a licensed feed (Polygon.io, Twelve Data) in
  `server/lib/prices.js` for production.
- Backtests are hypothetical, computed from the seeded price history.
- Nothing here is financial advice.
