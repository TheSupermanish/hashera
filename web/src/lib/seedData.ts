// Seed content for baskets, assets and price-history generation.
// Deterministic PRNG so every environment seeds identical charts.

export interface SeedAsset {
  symbol: string;
  name: string;
  underlying: string;
  basePrice: number;
  drift: number; // annualized expected return used for history generation
  vol: number;   // annualized volatility
  logoText: string;
  logoBg: string;
  logo?: string;
  tvSymbol?: string;
  sector?: string;
  kind: "equity" | "crypto" | "index";
}

export const SEED_ASSETS: SeedAsset[] = [
  { symbol: "INTCon", name: "Intel", underlying: "Intel Corporation (NASDAQ: INTC)", basePrice: 108.96, drift: 0.9, vol: 0.45, logoText: "IN", logoBg: "#0068b5", logo: "/images/tokens/intcon.png", tvSymbol: "NASDAQ:INTC", sector: "Semis", kind: "equity" },
  { symbol: "MUon", name: "Micron", underlying: "Micron Technology (NASDAQ: MU)", basePrice: 884.29, drift: 1.4, vol: 0.55, logoText: "MU", logoBg: "#1c5bd4", logo: "/images/tokens/muon.png", tvSymbol: "NASDAQ:MU", sector: "Semis", kind: "equity" },
  { symbol: "GEVon", name: "GE Vernova", underlying: "GE Vernova (NYSE: GEV)", basePrice: 1069.53, drift: 1.1, vol: 0.42, logoText: "GE", logoBg: "#026467", tvSymbol: "NYSE:GEV", sector: "Industrials", kind: "equity" },
  { symbol: "CATon", name: "Caterpillar", underlying: "Caterpillar Inc. (NYSE: CAT)", basePrice: 979.92, drift: 0.7, vol: 0.30, logoText: "CAT", logoBg: "#f7c400", tvSymbol: "NYSE:CAT", sector: "Industrials", kind: "equity" },
  { symbol: "MPon", name: "MP Materials", underlying: "MP Materials (NYSE: MP)", basePrice: 54.97, drift: 0.8, vol: 0.60, logoText: "MP", logoBg: "#5a67d8", tvSymbol: "NYSE:MP", sector: "Industrials", kind: "equity" },
  { symbol: "VRTon", name: "Vertiv", underlying: "Vertiv Holdings (NYSE: VRT)", basePrice: 301.85, drift: 1.0, vol: 0.50, logoText: "VR", logoBg: "#2d3748", tvSymbol: "NYSE:VRT", sector: "Industrials", kind: "equity" },
  { symbol: "ETNon", name: "Eaton", underlying: "Eaton Corporation (NYSE: ETN)", basePrice: 428.44, drift: 0.5, vol: 0.28, logoText: "ET", logoBg: "#1a6b3c", tvSymbol: "NYSE:ETN", sector: "Industrials", kind: "equity" },
  { symbol: "VSTon", name: "Vistra", underlying: "Vistra Corp (NYSE: VST)", basePrice: 214.61, drift: 0.3, vol: 0.48, logoText: "VS", logoBg: "#00a3a1", tvSymbol: "NYSE:VST", sector: "Industrials", kind: "equity" },
  { symbol: "NVDAon", name: "NVIDIA", underlying: "NVIDIA Corporation (NASDAQ: NVDA)", basePrice: 178.53, drift: 0.8, vol: 0.50, logoText: "NV", logoBg: "#76b900", logo: "/images/tokens/nvdaon.png", tvSymbol: "NASDAQ:NVDA", sector: "Semis", kind: "equity" },
  { symbol: "AVGOon", name: "Broadcom", underlying: "Broadcom Inc. (NASDAQ: AVGO)", basePrice: 285.1, drift: 0.7, vol: 0.42, logoText: "AV", logoBg: "#cc0000", logo: "/images/tokens/avgoon.png", tvSymbol: "NASDAQ:AVGO", sector: "Semis", kind: "equity" },
  { symbol: "MSFTon", name: "Microsoft", underlying: "Microsoft Corporation (NASDAQ: MSFT)", basePrice: 512.33, drift: 0.35, vol: 0.25, logoText: "MS", logoBg: "#0078d4", logo: "/images/tokens/msftx.svg", tvSymbol: "NASDAQ:MSFT", sector: "Tech", kind: "equity" },
  { symbol: "GOOGLon", name: "Alphabet", underlying: "Alphabet Inc. (NASDAQ: GOOGL)", basePrice: 196.42, drift: 0.4, vol: 0.30, logoText: "GO", logoBg: "#4285f4", logo: "/images/tokens/googlon.png", tvSymbol: "NASDAQ:GOOGL", sector: "Tech", kind: "equity" },
  { symbol: "AAPLon", name: "Apple", underlying: "Apple Inc. (NASDAQ: AAPL)", basePrice: 235.87, drift: 0.2, vol: 0.24, logoText: "AA", logoBg: "#555555", tvSymbol: "NASDAQ:AAPL", sector: "Tech", kind: "equity" },
  { symbol: "PANWon", name: "Palo Alto Networks", underlying: "Palo Alto Networks (NASDAQ: PANW)", basePrice: 205.44, drift: 0.45, vol: 0.38, logoText: "PA", logoBg: "#fa582d", tvSymbol: "NASDAQ:PANW", sector: "Tech", kind: "equity" },
  { symbol: "TEMon", name: "Tempus AI", underlying: "Tempus AI (NASDAQ: TEM)", basePrice: 68.12, drift: 0.9, vol: 0.70, logoText: "TE", logoBg: "#111827", tvSymbol: "NASDAQ:TEM", sector: "Tech", kind: "equity" },
  { symbol: "AMDon", name: "AMD", underlying: "Advanced Micro Devices (NASDAQ: AMD)", basePrice: 168.29, drift: 0.6, vol: 0.48, logoText: "AM", logoBg: "#009a66", tvSymbol: "NASDAQ:AMD", sector: "Semis", kind: "equity" },
  { symbol: "TSMon", name: "TSMC", underlying: "Taiwan Semiconductor (NYSE: TSM)", basePrice: 240.15, drift: 0.55, vol: 0.35, logoText: "TS", logoBg: "#d92d20", tvSymbol: "NYSE:TSM", sector: "Semis", kind: "equity" },
  { symbol: "PLTRon", name: "Palantir", underlying: "Palantir Technologies (NASDAQ: PLTR)", basePrice: 152.7, drift: 1.2, vol: 0.65, logoText: "PL", logoBg: "#101113", tvSymbol: "NASDAQ:PLTR", sector: "Tech", kind: "equity" },
  { symbol: "SONYon", name: "Sony", underlying: "Sony Group (NYSE: SONY)", basePrice: 108.24, drift: 0.35, vol: 0.28, logoText: "SO", logoBg: "#1f2937", tvSymbol: "NYSE:SONY", sector: "Japan", kind: "equity" },
  { symbol: "TMon", name: "Toyota", underlying: "Toyota Motor (NYSE: TM)", basePrice: 210.55, drift: 0.25, vol: 0.24, logoText: "TM", logoBg: "#eb0a1e", tvSymbol: "NYSE:TM", sector: "Japan", kind: "equity" },
  { symbol: "NTDOYon", name: "Nintendo", underlying: "Nintendo Co. (OTC: NTDOY)", basePrice: 15.28, drift: 0.5, vol: 0.32, logoText: "NI", logoBg: "#e60012", tvSymbol: "OTC:NTDOY", sector: "Japan", kind: "equity" },
  { symbol: "MUFGon", name: "MUFG", underlying: "Mitsubishi UFJ Financial (NYSE: MUFG)", basePrice: 13.82, drift: 0.3, vol: 0.26, logoText: "MU", logoBg: "#e60027", tvSymbol: "NYSE:MUFG", sector: "Japan", kind: "equity" },
  { symbol: "FRCYon", name: "Fast Retailing", underlying: "Fast Retailing / UNIQLO (OTC: FRCOY)", basePrice: 33.51, drift: 0.3, vol: 0.28, logoText: "FR", logoBg: "#ff0000", tvSymbol: "OTC:FRCOY", sector: "Japan", kind: "equity" },
  { symbol: "SFTBYon", name: "SoftBank", underlying: "SoftBank Group (OTC: SFTBY)", basePrice: 45.2, drift: 0.65, vol: 0.42, logoText: "SB", logoBg: "#8c8c8c", tvSymbol: "OTC:SFTBY", sector: "Japan", kind: "equity" },
  { symbol: "cBTC", name: "Bitcoin", underlying: "Bitcoin (BTC)", basePrice: 118250, drift: 0.5, vol: 0.55, logoText: "BT", logoBg: "#f7931a", logo: "/images/tokens/wbtc.png", tvSymbol: "BINANCE:BTCUSDT", sector: "Crypto", kind: "crypto" },
  { symbol: "cETH", name: "Ethereum", underlying: "Ethereum (ETH)", basePrice: 4212, drift: 0.45, vol: 0.65, logoText: "ET", logoBg: "#627eea", logo: "/images/tokens/eth.png", tvSymbol: "BINANCE:ETHUSDT", sector: "Crypto", kind: "crypto" },
  { symbol: "cHSK", name: "HSK", underlying: "HashKey Platform Token (HSK)", basePrice: 0.652, drift: 0.7, vol: 0.85, logoText: "HK", logoBg: "#7c3aed", tvSymbol: "", sector: "Crypto", kind: "crypto" },
  { symbol: "SPX", name: "S&P 500", underlying: "S&P 500 Index", basePrice: 6421.5, drift: 0.11, vol: 0.13, logoText: "SP", logoBg: "#1e40af", kind: "index" },
];

const DONUT_COLORS = [
  "#8b9cf5", "#4fd1a5", "#e88fa5", "#f0a58f",
  "#7fb2f0", "#38b2ac", "#b794f4", "#68d391",
  "#f6ad55", "#fc8181",
];

export interface SeedBasket {
  slug: string;
  name: string;
  symbol: string;
  badge: string;
  gradient: string;
  image: string;
  returnLabel: string;
  shortDescription: string;
  description: string;
  tags: string[];
  allocation: [string, number][];
  risk: {
    title: string;
    characteristics: { label: string; text: string }[];
    factors: { label: string; text: string }[];
    oracleNote: string;
  };
  resources: { label: string; url: string }[];
}

export const SEED_BASKETS: SeedBasket[] = [
  {
    slug: "made-in-america",
    name: "Made in America",
    symbol: "bMIA",
    badge: "3x Pts",
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #7f1d1d 50%, #0f172a 100%)",
    image: "/images/baskets/made-in-america.webp",
    returnLabel: "Annual Return",
    shortDescription:
      "Factories are coming home, chips are being made in Ohio, and tariffs just hit their highest level since 1946.",
    description:
      "Factories are coming home, chips are being made in Ohio, and tariffs just hit their highest level since 1946. This basket owns the reshoring supercycle end to end: the semiconductors being fabbed on US soil (Intel, Micron), the power infrastructure feeding the new plants (GE Vernova, Eaton, Vistra, Vertiv), the machines that build them (Caterpillar), and the only rare-earth mine in the western hemisphere (MP Materials). Every position is a synthetic RWA token on HashKey Chain, priced by NYSE/NASDAQ-linked oracles and rebalanced by the Hashera AI agent as the policy picture evolves.",
    tags: ["RWA", "US Equities", "Reshoring"],
    allocation: [
      ["INTCon", 1500], ["MUon", 1500], ["GEVon", 1500], ["CATon", 1300],
      ["MPon", 1200], ["VRTon", 1200], ["ETNon", 1000], ["VSTon", 800],
    ],
    risk: {
      title: "Made in America Strategy",
      characteristics: [
        { label: "No Liquidation Risk (Spot)", text: "synthetic spot, no margin liquidation." },
        { label: "Policy Dependency", text: "relies on continued industrial/tariff policy; reversal unwinds the thesis." },
        { label: "Cyclical Exposure", text: "semis, industrials and power are economically sensitive." },
        { label: "Execution Risk", text: "Intel turnaround and CHIPS buildouts are not guaranteed." },
      ],
      factors: [
        { label: "Concentration in semis", text: "Intel/Micron drive much of the return; memory is highly cyclical." },
        { label: "Power/AI-capex risk", text: "GEV/ETN/VRT/Vistra depend on the datacenter buildout continuing." },
        { label: "Vistra trailing weakness", text: "included on a forward nuclear / Meta-PPA thesis despite weak 1y price action." },
        { label: "Commodity volatility", text: "MP Materials is essentially single-mine." },
        { label: "Oracle Execution Risk", text: "tokenized-equity legs settle at oracle prints; entry fee 0.5%, legs sized to remain redeemable." },
        { label: "Smart Contract / Oracle Risk", text: "synthetic assets depend on protocol and oracle integrity." },
      ],
      oracleNote: "Assets priced via NYSE/NASDAQ-linked oracles, avoiding thin on-chain orderbook distortion. USDC settlement routes through HSP (HashKey Settlement Protocol) mandates for compliant, receipt-backed transfers.",
    },
    resources: [
      { label: "HashKey Chain Explorer", url: "https://hashkey.blockscout.com" },
      { label: "CHIPS Act overview", url: "https://www.nist.gov/chips" },
      { label: "Intel (INTCon) tokenized-stock pilot on HashKey Chain", url: "https://hashkey.blockscout.com/token/0x14c8a2c497eC878c2dc1b48A5EaEc6342d2B6664" },
      { label: "Hashera docs", url: "https://github.com/hashera" },
    ],
  },
  {
    slug: "pelosi-tracker",
    name: "Nancy Pelosi Tracker",
    symbol: "bPELOSI",
    badge: "3x Pts",
    gradient: "linear-gradient(135deg, #4c1d95 0%, #be185d 55%, #111827 100%)",
    image: "/images/baskets/nancy-pelosi-tracker.webp",
    returnLabel: "Annual Return",
    shortDescription:
      "Portfolio tracking top stocks and ETFs from Nancy Pelosi's public disclosures under the STOCK Act.",
    description:
      "Portfolio tracking top stocks and ETFs from Nancy Pelosi's public disclosures under the STOCK Act. Congressional trading disclosures have historically front-run major policy tailwinds; this basket mirrors the most recent filings as tokenized RWA positions on HashKey Chain. The Hashera AI agent watches new disclosure filings and rebalances the basket automatically when fresh trades are published.",
    tags: ["RWA", "US Equities", "Policy"],
    allocation: [
      ["NVDAon", 2000], ["AVGOon", 1500], ["MSFTon", 1500], ["GOOGLon", 1200],
      ["AAPLon", 1200], ["PANWon", 1000], ["VSTon", 800], ["TEMon", 800],
    ],
    risk: {
      title: "Pelosi Tracker Strategy",
      characteristics: [
        { label: "No Liquidation Risk (Spot)", text: "synthetic spot, no margin liquidation." },
        { label: "Disclosure Lag", text: "STOCK Act filings arrive up to 45 days after the trade." },
        { label: "Mega-cap Tech Tilt", text: "heavily concentrated in large-cap technology." },
      ],
      factors: [
        { label: "Filing latency", text: "positions mirror disclosures, not real-time trades." },
        { label: "Concentration", text: "NVDA/AVGO/MSFT are half the basket." },
        { label: "Options translation", text: "disclosed call options are mapped to spot-equivalent weights." },
        { label: "Smart Contract / Oracle Risk", text: "synthetic assets depend on protocol and oracle integrity." },
      ],
      oracleNote: "Assets priced via NYSE/NASDAQ-linked oracles, avoiding thin on-chain orderbook distortion. USDC settlement routes through HSP (HashKey Settlement Protocol) mandates for compliant, receipt-backed transfers.",
    },
    resources: [
      { label: "STOCK Act disclosures", url: "https://disclosures-clerk.house.gov" },
      { label: "HashKey Chain Explorer", url: "https://hashkey.blockscout.com" },
      { label: "NVIDIA (NVDAs) tokenized-stock pilot on HashKey Chain", url: "https://hashkey.blockscout.com/token/0x8024775a803f049B9505704801e32a2c8630BF2c" },
    ],
  },
  {
    slug: "ai-revolution",
    name: "AI Revolution",
    symbol: "bAIREV",
    badge: "3x Pts",
    gradient: "linear-gradient(135deg, #065f46 0%, #0e7490 50%, #111827 100%)",
    image: "/images/baskets/ai-leaders-portfolio.webp",
    returnLabel: "Annual Return",
    shortDescription:
      "The full AI compute stack as tokenized RWAs: GPUs, foundry, hyperscaler software and defense AI.",
    description:
      "The AI capex supercycle is still compounding: hyperscaler datacenter budgets keep breaking records and inference demand is outpacing supply. This basket owns the full stack as tokenized RWAs on HashKey Chain: the GPU duopoly (NVIDIA, AMD), the custom-silicon winner (Broadcom), the foundry everything runs on (TSMC), the biggest software distributor of AI (Microsoft) and the defense/enterprise AI pure play (Palantir). The Hashera AI agent monitors earnings, guidance and supply-chain news, and rebalances when the compute cycle rotates.",
    tags: ["RWA", "AI", "Semiconductors"],
    allocation: [
      ["NVDAon", 2500], ["MSFTon", 2000], ["AVGOon", 1500],
      ["AMDon", 1400], ["TSMon", 1400], ["PLTRon", 1200],
    ],
    risk: {
      title: "AI Revolution Strategy",
      characteristics: [
        { label: "No Liquidation Risk (Spot)", text: "synthetic spot, no margin liquidation." },
        { label: "Capex Cycle Dependency", text: "returns track hyperscaler AI spending intentions." },
        { label: "Valuation Risk", text: "several holdings trade at high multiples of forward earnings." },
      ],
      factors: [
        { label: "NVDA concentration", text: "a quarter of the basket is a single name." },
        { label: "Geopolitics", text: "TSMC carries Taiwan-strait tail risk; export controls can reprice the whole stack." },
        { label: "Competition", text: "custom silicon and open-weight models could compress GPU margins." },
        { label: "Smart Contract / Oracle Risk", text: "synthetic assets depend on protocol and oracle integrity." },
      ],
      oracleNote: "Assets priced via NYSE/NASDAQ-linked oracles, avoiding thin on-chain orderbook distortion. USDC settlement routes through HSP (HashKey Settlement Protocol) mandates for compliant, receipt-backed transfers.",
    },
    resources: [
      { label: "HashKey Chain Explorer", url: "https://hashkey.blockscout.com" },
      { label: "NVIDIA (NVDAs) tokenized-stock pilot on HashKey Chain", url: "https://hashkey.blockscout.com/token/0x8024775a803f049B9505704801e32a2c8630BF2c" },
      { label: "Stove Protocol — 1:1 on-chain US equities", url: "https://www.stove.finance/" },
      { label: "HashKey AI agent-economy whitepaper", url: "https://group.hashkey.com/en/newsroom" },
    ],
  },
  {
    slug: "tokyo-blue-chips",
    name: "Tokyo Blue Chips",
    symbol: "bTOKYO",
    badge: "2x Pts",
    gradient: "linear-gradient(135deg, #9d174d 0%, #111827 60%, #7c2d12 100%)",
    image: "/images/baskets/sovereign-stack.webp",
    returnLabel: "Annual Return",
    shortDescription:
      "Japan's corporate governance renaissance in one click: Sony, Toyota, Nintendo, MUFG, UNIQLO and SoftBank.",
    description:
      "The Tokyo Stock Exchange's governance reforms, a weak yen and the return of inflation have made Japanese equities a structural buy for the first time in three decades. This basket packages Japan's six most iconic global franchises as tokenized RWAs on HashKey Chain: Sony, Toyota, Nintendo, MUFG, Fast Retailing (UNIQLO) and SoftBank. Built for the Tokyo demo day: a basket you can explain to anyone in one sentence.",
    tags: ["RWA", "Japan", "Blue Chips"],
    allocation: [
      ["SONYon", 2000], ["TMon", 2000], ["NTDOYon", 1700],
      ["MUFGon", 1500], ["FRCYon", 1400], ["SFTBYon", 1400],
    ],
    risk: {
      title: "Tokyo Blue Chips Strategy",
      characteristics: [
        { label: "No Liquidation Risk (Spot)", text: "synthetic spot, no margin liquidation." },
        { label: "Currency Exposure", text: "ADR pricing embeds USD/JPY moves." },
        { label: "Diversified Sectors", text: "consumer, autos, banking, gaming and telecom in one basket." },
      ],
      factors: [
        { label: "Yen sensitivity", text: "a sharp yen rally compresses exporter earnings." },
        { label: "BoJ policy", text: "rate normalization can reprice bank and growth names in opposite directions." },
        { label: "SoftBank volatility", text: "Vision Fund marks swing the NAV." },
        { label: "Smart Contract / Oracle Risk", text: "synthetic assets depend on protocol and oracle integrity." },
      ],
      oracleNote: "Assets priced via NYSE/OTC ADR-linked oracles, avoiding thin on-chain orderbook distortion. USDC settlement routes through HSP (HashKey Settlement Protocol) mandates for compliant, receipt-backed transfers.",
    },
    resources: [
      { label: "HashKey Chain Explorer", url: "https://hashkey.blockscout.com" },
      { label: "HashKey Group RWA newsroom", url: "https://group.hashkey.com/en/newsroom" },
      { label: "Tokyo Stock Exchange governance reforms", url: "https://www.jpx.co.jp/english/" },
    ],
  },
  {
    slug: "crypto-majors",
    name: "Crypto Majors",
    symbol: "bCRYPTO",
    badge: "2x Pts",
    gradient: "linear-gradient(135deg, #b45309 0%, #4c1d95 60%, #111827 100%)",
    image: "/images/baskets/solana-maxi-portfolio.webp",
    returnLabel: "Annual Return",
    shortDescription:
      "BTC, ETH and HSK in one click. The benchmark crypto allocation, rebalanced by the Hashera AI agent.",
    description:
      "The benchmark crypto allocation: 50% Bitcoin, 35% Ethereum and 15% HSK, the native token of HashKey Chain. Synthetic exposure minted against USDC collateral and priced by oracle, so you get clean index-style tracking with no bridging, no CEX account and no seed-phrase juggling. The Hashera AI agent trims and adds around momentum and funding extremes.",
    tags: ["Crypto", "Index", "HSK"],
    allocation: [
      ["cBTC", 5000], ["cETH", 3500], ["cHSK", 1500],
    ],
    risk: {
      title: "Crypto Majors Strategy",
      characteristics: [
        { label: "No Liquidation Risk (Spot)", text: "synthetic spot, no margin liquidation." },
        { label: "High Volatility", text: "crypto drawdowns regularly exceed 50%." },
        { label: "24/7 Markets", text: "prices update around the clock, unlike the equity baskets." },
      ],
      factors: [
        { label: "Beta to BTC", text: "the basket is dominated by Bitcoin beta." },
        { label: "HSK liquidity", text: "HSK is earlier-stage and less liquid than BTC/ETH." },
        { label: "Smart Contract / Oracle Risk", text: "synthetic assets depend on protocol and oracle integrity." },
      ],
      oracleNote: "Assets priced via aggregated CEX/DEX oracle feeds. USDC settlement routes through HSP (HashKey Settlement Protocol) mandates for compliant, receipt-backed transfers.",
    },
    resources: [
      { label: "HashKey Chain Explorer", url: "https://hashkey.blockscout.com" },
      { label: "HSK token docs", url: "https://docs.hashkeychain.net/docs/Build-on-HashKey-Chain/Token-Contracts" },
    ],
  },
];

export function donutColor(i: number) {
  return DONUT_COLORS[i % DONUT_COLORS.length];
}

// --------------------------------------------------------- price history

// mulberry32: deterministic PRNG so seeding is reproducible.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Generate `days` of daily closes ending exactly at basePrice (today),
 * geometric random walk with the asset's drift/vol.
 */
export function generateHistory(asset: SeedAsset, days = 380): { ts: Date; price: number }[] {
  const rand = mulberry32(hashString(asset.symbol));
  const dt = 1 / 252;
  const points: number[] = [1];
  for (let i = 1; i < days; i++) {
    // Box-Muller from two uniforms
    const u1 = Math.max(rand(), 1e-9);
    const u2 = rand();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const r = (asset.drift - 0.5 * asset.vol * asset.vol) * dt + asset.vol * Math.sqrt(dt) * z;
    points.push(points[i - 1] * Math.exp(r));
  }
  // normalize so the final point is exactly basePrice
  const last = points[points.length - 1];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return points.map((p, i) => ({
    ts: new Date(now.getTime() - (days - 1 - i) * 86400_000),
    price: +( (p / last) * asset.basePrice ).toFixed(asset.basePrice < 5 ? 5 : 2),
  }));
}
