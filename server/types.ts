// Shared domain types for the Moltiply server.

/** One asset slice of a basket (bps weights sum to 10000). */
export interface Allocation {
  symbol: string;
  name?: string;
  underlying?: string;
  tokenAddress?: string;
  weightBps: number;
  color?: string;
  logoText?: string;
  logoBg?: string;
}

/** On-chain deployment record written by the contracts deploy script. */
export interface Deployment {
  chainId: number;
  oracle: string;
  tokens: Record<string, string>;
  [key: string]: unknown;
}

/** Spot price + 24h change for a single symbol. */
export interface Quote {
  price: number;
  changePct24h: number;
}
