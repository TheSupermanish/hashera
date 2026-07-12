import { defineChain } from "viem";
import deployment from "./deployment.json";

export const hashkeyMainnet = defineChain({
  id: 177,
  name: "HashKey Chain",
  nativeCurrency: { name: "HashKey Platform Token", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: ["https://mainnet.hsk.xyz"] } },
  blockExplorers: {
    default: { name: "HashKey Explorer", url: "https://hashkey.blockscout.com" },
  },
});

export const hashkeyTestnet = defineChain({
  id: 133,
  name: "HashKey Chain Testnet",
  nativeCurrency: { name: "HashKey Platform Token", symbol: "HSK", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hsk.xyz"] } },
  blockExplorers: {
    default: { name: "HashKey Testnet Explorer", url: "https://testnet-explorer.hsk.xyz" },
  },
  testnet: true,
});

export const activeChain = deployment.chainId === 177 ? hashkeyMainnet : hashkeyTestnet;

export const explorerUrl = activeChain.blockExplorers.default.url;

export function explorerAddress(addr: string) {
  return `${explorerUrl}/address/${addr}`;
}

export function explorerTx(hash: string) {
  return `${explorerUrl}/tx/${hash}`;
}
