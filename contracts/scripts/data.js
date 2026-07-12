// Master asset + basket definitions shared by deploy and seed scripts.
// Prices are USD with 8 decimals (oracle convention).

const ASSETS = [
  // Made in America
  { symbol: "INTCon", name: "Intel onchain", underlying: "Intel Corporation (NASDAQ: INTC)", price: "108.96", kind: "equity" },
  { symbol: "MUon", name: "Micron onchain", underlying: "Micron Technology (NASDAQ: MU)", price: "884.29", kind: "equity" },
  { symbol: "GEVon", name: "GE Vernova onchain", underlying: "GE Vernova (NYSE: GEV)", price: "1069.53", kind: "equity" },
  { symbol: "CATon", name: "Caterpillar onchain", underlying: "Caterpillar Inc. (NYSE: CAT)", price: "979.92", kind: "equity" },
  { symbol: "MPon", name: "MP Materials onchain", underlying: "MP Materials (NYSE: MP)", price: "54.97", kind: "equity" },
  { symbol: "VRTon", name: "Vertiv onchain", underlying: "Vertiv Holdings (NYSE: VRT)", price: "301.85", kind: "equity" },
  { symbol: "ETNon", name: "Eaton onchain", underlying: "Eaton Corporation (NYSE: ETN)", price: "428.44", kind: "equity" },
  { symbol: "VSTon", name: "Vistra onchain", underlying: "Vistra Corp (NYSE: VST)", price: "214.61", kind: "equity" },
  // Pelosi tracker / AI revolution
  { symbol: "NVDAon", name: "NVIDIA onchain", underlying: "NVIDIA Corporation (NASDAQ: NVDA)", price: "178.53", kind: "equity" },
  { symbol: "AVGOon", name: "Broadcom onchain", underlying: "Broadcom Inc. (NASDAQ: AVGO)", price: "285.10", kind: "equity" },
  { symbol: "MSFTon", name: "Microsoft onchain", underlying: "Microsoft Corporation (NASDAQ: MSFT)", price: "512.33", kind: "equity" },
  { symbol: "GOOGLon", name: "Alphabet onchain", underlying: "Alphabet Inc. (NASDAQ: GOOGL)", price: "196.42", kind: "equity" },
  { symbol: "AAPLon", name: "Apple onchain", underlying: "Apple Inc. (NASDAQ: AAPL)", price: "235.87", kind: "equity" },
  { symbol: "PANWon", name: "Palo Alto onchain", underlying: "Palo Alto Networks (NASDAQ: PANW)", price: "205.44", kind: "equity" },
  { symbol: "TEMon", name: "Tempus AI onchain", underlying: "Tempus AI (NASDAQ: TEM)", price: "68.12", kind: "equity" },
  { symbol: "AMDon", name: "AMD onchain", underlying: "Advanced Micro Devices (NASDAQ: AMD)", price: "168.29", kind: "equity" },
  { symbol: "TSMon", name: "TSMC onchain", underlying: "Taiwan Semiconductor (NYSE: TSM)", price: "240.15", kind: "equity" },
  { symbol: "PLTRon", name: "Palantir onchain", underlying: "Palantir Technologies (NASDAQ: PLTR)", price: "152.70", kind: "equity" },
  // Tokyo blue chips (demo day is in Japan)
  { symbol: "SONYon", name: "Sony onchain", underlying: "Sony Group (NYSE: SONY)", price: "108.24", kind: "equity" },
  { symbol: "TMon", name: "Toyota onchain", underlying: "Toyota Motor (NYSE: TM)", price: "210.55", kind: "equity" },
  { symbol: "NTDOYon", name: "Nintendo onchain", underlying: "Nintendo Co. (OTC: NTDOY)", price: "15.28", kind: "equity" },
  { symbol: "MUFGon", name: "MUFG onchain", underlying: "Mitsubishi UFJ Financial (NYSE: MUFG)", price: "13.82", kind: "equity" },
  { symbol: "FRCYon", name: "Fast Retailing onchain", underlying: "Fast Retailing / UNIQLO (OTC: FRCOY)", price: "33.51", kind: "equity" },
  { symbol: "SFTBYon", name: "SoftBank onchain", underlying: "SoftBank Group (OTC: SFTBY)", price: "45.20", kind: "equity" },
  // Crypto majors (synthetic)
  { symbol: "cBTC", name: "Bitcoin synthetic", underlying: "Bitcoin (BTC)", price: "118250.00", kind: "crypto" },
  { symbol: "cETH", name: "Ether synthetic", underlying: "Ethereum (ETH)", price: "4212.00", kind: "crypto" },
  { symbol: "cHSK", name: "HSK synthetic", underlying: "HashKey Platform Token (HSK)", price: "0.652", kind: "crypto" },
];

const BASKETS = [
  {
    slug: "made-in-america",
    name: "Made in America",
    symbol: "bMIA",
    entryFeeBps: 50,
    minInvest: "25", // USDC
    allocation: [
      ["INTCon", 1500],
      ["MUon", 1500],
      ["GEVon", 1500],
      ["CATon", 1300],
      ["MPon", 1200],
      ["VRTon", 1200],
      ["ETNon", 1000],
      ["VSTon", 800],
    ],
  },
  {
    slug: "pelosi-tracker",
    name: "Nancy Pelosi Tracker",
    symbol: "bPELOSI",
    entryFeeBps: 50,
    minInvest: "25",
    allocation: [
      ["NVDAon", 2000],
      ["AVGOon", 1500],
      ["MSFTon", 1500],
      ["GOOGLon", 1200],
      ["AAPLon", 1200],
      ["PANWon", 1000],
      ["VSTon", 800],
      ["TEMon", 800],
    ],
  },
  {
    slug: "ai-revolution",
    name: "AI Revolution",
    symbol: "bAIREV",
    entryFeeBps: 50,
    minInvest: "25",
    allocation: [
      ["NVDAon", 2500],
      ["MSFTon", 2000],
      ["AVGOon", 1500],
      ["AMDon", 1400],
      ["TSMon", 1400],
      ["PLTRon", 1200],
    ],
  },
  {
    slug: "tokyo-blue-chips",
    name: "Tokyo Blue Chips",
    symbol: "bTOKYO",
    entryFeeBps: 50,
    minInvest: "25",
    allocation: [
      ["SONYon", 2000],
      ["TMon", 2000],
      ["NTDOYon", 1700],
      ["MUFGon", 1500],
      ["FRCYon", 1400],
      ["SFTBYon", 1400],
    ],
  },
  {
    slug: "crypto-majors",
    name: "Crypto Majors",
    symbol: "bCRYPTO",
    entryFeeBps: 50,
    minInvest: "25",
    allocation: [
      ["cBTC", 5000],
      ["cETH", 3500],
      ["cHSK", 1500],
    ],
  },
];

module.exports = { ASSETS, BASKETS };
