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

## Deployed contracts (HashKey Chain testnet · chainId 133)

Deployed 2026-07-09. Explorer: **https://testnet-explorer.hsk.xyz** — prepend
`/address/<addr>` or `/tx/<hash>`.

**Core**

| Contract | Address |
| --- | --- |
| MockUSDC (mUSDC · 6-dec · faucet) | [`0x71f5399fE047dF29F440f5eE36dd5B3A9bfe7ee0`](https://testnet-explorer.hsk.xyz/address/0x71f5399fE047dF29F440f5eE36dd5B3A9bfe7ee0) |
| PriceOracle | [`0xC1644991C75F1746927020e80fab2e5ac5541e53`](https://testnet-explorer.hsk.xyz/address/0xC1644991C75F1746927020e80fab2e5ac5541e53) |
| BasketFactory | [`0xaB02AE7775F1c9f52D9E5DF2e8Dec5f73f59dD73`](https://testnet-explorer.hsk.xyz/address/0xaB02AE7775F1c9f52D9E5DF2e8Dec5f73f59dD73) |
| StockStore | [`0xB33E2aE97c8E7924EB57E1fcE84B6f446dF99094`](https://testnet-explorer.hsk.xyz/address/0xB33E2aE97c8E7924EB57E1fcE84B6f446dF99094) |
| Deployer / admin | [`0xa2eB5597B09AB345D3A6aEE8DA02806d5567B8d1`](https://testnet-explorer.hsk.xyz/address/0xa2eB5597B09AB345D3A6aEE8DA02806d5567B8d1) |

**Basket vaults**

| Basket | Vault |
| --- | --- |
| Made in America | [`0xf45d907aac77ac863294576dd75AB98a43620FaB`](https://testnet-explorer.hsk.xyz/address/0xf45d907aac77ac863294576dd75AB98a43620FaB) |
| Nancy Pelosi Tracker | [`0x9F539fE54F8DabE016641a14Df8C7ec00C6a978e`](https://testnet-explorer.hsk.xyz/address/0x9F539fE54F8DabE016641a14Df8C7ec00C6a978e) |
| AI Revolution | [`0x2e955263d42ca77caB26543159066dC5F9De7db9`](https://testnet-explorer.hsk.xyz/address/0x2e955263d42ca77caB26543159066dC5F9De7db9) |
| Tokyo Blue Chips | [`0x71B2aEbFFD2C665b50f79aE138ca1098ceD8896e`](https://testnet-explorer.hsk.xyz/address/0x71B2aEbFFD2C665b50f79aE138ca1098ceD8896e) |
| Crypto Majors | [`0x2931a1321D64b6e098bC693a1Ff3Bdeeaaf95156`](https://testnet-explorer.hsk.xyz/address/0x2931a1321D64b6e098bC693a1Ff3Bdeeaaf95156) |
| Demo Fundx (custom, built via `/create`) | [`0x0d87EfedF7103bD1c967084fbf4cE3E07804BFA2`](https://testnet-explorer.hsk.xyz/address/0x0d87EfedF7103bD1c967084fbf4cE3E07804BFA2) |
| Warren Buffet Indexes (custom) | [`0xB6417df2Af3F60a51A65306a0F541d56Bd8eed8c`](https://testnet-explorer.hsk.xyz/address/0xB6417df2Af3F60a51A65306a0F541d56Bd8eed8c) |

**Key on-chain transactions**

| Action | Tx |
| --- | --- |
| Deploy Demo Fundx vault (`BasketFactory.createBasket`) | [`0x2ab36ecc…f73c1d5a`](https://testnet-explorer.hsk.xyz/tx/0x2ab36ecce2983abe0af7335c99787970ad519b71a0e89c9ab44bdb67f73c1d5a) |
| Deploy Warren Buffet Indexes vault | [`0x311c4521…64b1aea7d`](https://testnet-explorer.hsk.xyz/tx/0x311c452121f9575db5a8794e258a47467938100fa8aa40b038eac2564b1aea7d) |
| Batch oracle price push (27 assets, `setPrices`) | [`0x0838c674…eff3b59f`](https://testnet-explorer.hsk.xyz/tx/0x0838c674550bb5c3e4e7b817aafc49bd4a8d22101ae466bbba4aee50eff3b59f) |

<details>
<summary><b>Synthetic RWA tokens (27 RWAToken contracts)</b></summary>

| Symbol | Underlying | Address |
| --- | --- | --- |
| INTCon | Intel | `0x85C40e1ECf613A268cf0473CA7B47eC0962Fa12d` |
| MUon | Micron | `0x14004788EBDC0736ce9E537DF938Fed494b097f4` |
| GEVon | GE Vernova | `0x335D521150E8E27C22b23A0C8086Bc99329A4882` |
| CATon | Caterpillar | `0xba82CB71f0cB43bA3Ee80fE1B860e0E909A1419B` |
| MPon | MP Materials | `0xB692808EC62dC05A2DF67c4deCe7d5cB7b277680` |
| VRTon | Vertiv | `0x65addF21af1c6aD57Faf42dA0346878E5D20a532` |
| ETNon | Eaton | `0xB25e4437a394F298011eac183d6D6f9003CDD3Ff` |
| VSTon | Vistra | `0xAbB3347205Bc43C8e083B8055B05FAa481F2DbD7` |
| NVDAon | NVIDIA | `0xa8Ab1c9859EcfF076d7af5a8910c0DaABF770bCB` |
| AVGOon | Broadcom | `0xEe1ce69d29c2FfbC7fC68f959D5658415254E995` |
| MSFTon | Microsoft | `0xcC8Edad00743d0f496200B42c8D2da098361E7dA` |
| GOOGLon | Alphabet | `0x028fda9D37e3B633FCf6BDF507c41409E712e9f9` |
| AAPLon | Apple | `0xd119662f34013b1C3B1b2537C237fc5f706459F6` |
| PANWon | Palo Alto Networks | `0x1dA7E38EB9E323f0c09575FDAb2eD3c0CF0ADe95` |
| TEMon | Tempus AI | `0x22F6CAFF13a0d5EDd9856917C50fa3981152B221` |
| AMDon | AMD | `0x3043f2a19E6710f0a1219c1CA19a62Edc5Ee9750` |
| TSMon | TSMC | `0x5Fb32508AcA531F5Dd8c59F89f8c4aE4d735e1d5` |
| PLTRon | Palantir | `0xc9c1039A1cfC2F057Ebee8572b5E8DbCB8ED5580` |
| SONYon | Sony | `0xb13f0f92a9352bDe69D4beFe8e88F07DfDf5c910` |
| TMon | Toyota | `0xb79D390Dd3C5045A2119bEe04d89efa1B9C0c3BC` |
| NTDOYon | Nintendo | `0xF1fAe7Be4F597E0fEab83cf7B069fb8663A69ff9` |
| MUFGon | MUFG | `0x96A2d15B61bf4d413A7c51DdBa94Ac74515dd23C` |
| FRCYon | Fast Retailing (UNIQLO) | `0xd265fF95fb4af3A0e0bDe1e41073aaBD634B51E5` |
| SFTBYon | SoftBank | `0xc4b5208E0c8C45E953a63fc8E1C152489A652f45` |
| cBTC | Bitcoin | `0x1c7F04c0818b88d9d18bf06C46fda0180d3CcAC3` |
| cETH | Ethereum | `0xB92d995de68D0951592aC84260d6f48a6639FD57` |
| cHSK | HSK | `0xCEA4441083fac56a09A15511FB42309903cBc93f` |

</details>

The canonical machine-readable record lives in
`contracts/deployments/hashkeyTestnet.json` (auto-written by the deploy script;
custom-basket vaults are appended by the factory at runtime).

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
