import deployment from "./deployment.json";

export const DEPLOYMENT = deployment as {
  network: string;
  chainId: number;
  stable: string;
  stableIsMock: boolean;
  oracle: string;
  factory: string;
  stockStore?: string;
  tokens: Record<string, string>;
  baskets: Record<string, string>;
};

export const STOCK_STORE = (DEPLOYMENT.stockStore ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const storeDeployed = STOCK_STORE !== "0x0000000000000000000000000000000000000000";

export const isDeployed =
  DEPLOYMENT.factory !== "0x0000000000000000000000000000000000000000";

export const ERC20_ABI = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "v", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "faucet", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

export const VAULT_ABI = [
  { type: "function", name: "invest", stateMutability: "nonpayable", inputs: [{ name: "amount", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "redeem", stateMutability: "nonpayable", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "previewInvest", stateMutability: "view", inputs: [{ name: "amount", type: "uint256" }], outputs: [{ name: "sharesOut", type: "uint256" }, { name: "fee", type: "uint256" }] },
  { type: "function", name: "previewRedeem", stateMutability: "view", inputs: [{ name: "shares", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "sharePrice", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalValue", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "minInvest", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "entryFeeBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const ORACLE_ABI = [
  { type: "function", name: "getPrice", stateMutability: "view", inputs: [{ name: "asset", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getPriceData", stateMutability: "view", inputs: [{ name: "asset", type: "address" }], outputs: [{ name: "price", type: "uint256" }, { name: "updatedAt", type: "uint256" }] },
] as const;

export const STOCK_STORE_ABI = [
  { type: "function", name: "buy", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "stableIn", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "sell", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }, { name: "units", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "previewBuy", stateMutability: "view", inputs: [{ name: "token", type: "address" }, { name: "stableIn", type: "uint256" }], outputs: [{ name: "units", type: "uint256" }, { name: "fee", type: "uint256" }] },
  { type: "function", name: "previewSell", stateMutability: "view", inputs: [{ name: "token", type: "address" }, { name: "units", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "feeBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
