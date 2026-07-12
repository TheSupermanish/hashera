"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseUnits, formatUnits } from "viem";
import {
  useAccount,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  DEPLOYMENT,
  ERC20_ABI,
  STOCK_STORE,
  STOCK_STORE_ABI,
  storeDeployed,
} from "@/lib/contracts";
import { activeChain, explorerTx } from "@/lib/chain";
import { fmtUsd, ticker } from "@/lib/format";

type Mode = "buy" | "sell";

export function TradePanel({
  symbol,
  tokenAddress,
  price,
  onTraded,
}: {
  symbol: string; // internal symbol (e.g. VSTon)
  tokenAddress?: string;
  price: number;
  onTraded?: () => void;
}) {
  const disp = ticker(symbol);
  const token = (tokenAddress || "") as `0x${string}`;
  const stable = DEPLOYMENT.stable as `0x${string}`;
  const tradable = storeDeployed && !!tokenAddress && tokenAddress.length === 42;

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const [mode, setMode] = useState<Mode>("buy");
  const [amount, setAmount] = useState("100"); // USDC for buy
  const [units, setUnits] = useState("0"); // token units for sell
  const [pending, setPending] = useState<"" | "approve" | "buy" | "sell" | "faucet">("");
  // Persisted confirmation of the last completed tx. Kept separate from wagmi's
  // live receipt state because the effect below calls reset() (clearing txHash),
  // which would otherwise wipe the "confirmed" banner the instant it appears.
  const [receipt, setReceipt] = useState<{ hash: `0x${string}`; action: "approve" | "buy" | "sell" | "faucet" } | null>(null);
  // Snapshot of trade inputs at submit time, so editing the field mid-confirm
  // doesn't corrupt the recorded amount/units/price.
  const submitted = useRef<{ usdcAmount: number; units: number; price: number } | null>(null);

  const enabled = tradable && !!address;

  const { data: usdcBal, refetch: refUsdc } = useReadContract({
    address: stable, abi: ERC20_ABI, functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"], query: { enabled },
  });
  const { data: allowance, refetch: refAllow } = useReadContract({
    address: stable, abi: ERC20_ABI, functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", STOCK_STORE], query: { enabled },
  });
  const { data: tokBal, refetch: refTok } = useReadContract({
    address: token, abi: ERC20_ABI, functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"], query: { enabled },
  });

  const parsedUsdc = useMemo(() => {
    try { return parseUnits((amount || "0") as `${number}`, 6); } catch { return 0n; }
  }, [amount]);
  const parsedUnits = useMemo(() => {
    try { return parseUnits((units || "0") as `${number}`, 18); } catch { return 0n; }
  }, [units]);

  const { data: previewBuy } = useReadContract({
    address: STOCK_STORE, abi: STOCK_STORE_ABI, functionName: "previewBuy",
    args: [token, parsedUsdc], query: { enabled: tradable && parsedUsdc > 0n },
  });
  const { data: previewSell } = useReadContract({
    address: STOCK_STORE, abi: STOCK_STORE_ABI, functionName: "previewSell",
    args: [token, parsedUnits], query: { enabled: tradable && parsedUnits > 0n },
  });

  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!confirmed || !txHash) return;
    refUsdc(); refAllow(); refTok();
    if ((pending === "buy" || pending === "sell") && address && submitted.current) {
      const s = submitted.current;
      fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          basketSlug: symbol,
          market: "stock",
          type: pending,
          usdcAmount: s.usdcAmount,
          shares: s.units,
          price: s.price,
          txHash,
        }),
      })
        .then(() => onTraded?.())
        .catch(() => {});
      submitted.current = null;
    }
    if (pending) setReceipt({ hash: txHash, action: pending });
    setPending(""); reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  const usdcNum = usdcBal !== undefined ? Number(formatUnits(usdcBal, 6)) : 0;
  const tokNum = tokBal !== undefined ? Number(formatUnits(tokBal, 18)) : 0;
  const holdingValue = tokNum * price;
  const needsApproval = allowance !== undefined && parsedUsdc > 0n && allowance < parsedUsdc;
  const busy = isPending || confirming;

  const buyUnits = previewBuy ? Number(formatUnits(previewBuy[0], 18)) : parsedUsdc > 0n ? Number(amount) / price : 0;
  const buyFee = previewBuy ? Number(formatUnits(previewBuy[1], 6)) : 0;
  const sellOut = previewSell ? Number(formatUnits(previewSell, 6)) : 0;

  const act = (a: "approve" | "buy" | "sell" | "faucet") => {
    setReceipt(null);
    setPending(a);
    if (a === "approve") writeContract({ address: stable, abi: ERC20_ABI, functionName: "approve", args: [STOCK_STORE, parsedUsdc * 4n] });
    else if (a === "buy") {
      submitted.current = { usdcAmount: Number(amount), units: buyUnits, price };
      writeContract({ address: STOCK_STORE, abi: STOCK_STORE_ABI, functionName: "buy", args: [token, parsedUsdc] });
    } else if (a === "sell") {
      submitted.current = { usdcAmount: sellOut, units: Number(units), price };
      writeContract({ address: STOCK_STORE, abi: STOCK_STORE_ABI, functionName: "sell", args: [token, parsedUnits] });
    } else if (a === "faucet") writeContract({ address: stable, abi: ERC20_ABI, functionName: "faucet", args: [] });
  };

  const primary = "mt-4 w-full rounded-lg py-3 text-sm font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const insufficient = isConnected && mode === "buy" && Number(amount || 0) > usdcNum;

  return (
    <div className="rounded-xl border border-cesto-border bg-card/40 p-5">
      <div className="flex items-center gap-1 rounded-lg border border-cesto-border bg-[#0c1a18] p-0.5">
        {(["buy", "sell"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md py-2 text-sm font-semibold capitalize transition-colors ${
              mode === m
                ? m === "buy" ? "bg-cesto-green text-[#091313]" : "bg-destructive text-white"
                : "text-muted-foreground hover:text-white"
            }`}
          >
            {m} {disp}
          </button>
        ))}
      </div>

      {mode === "buy" ? (
        <>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Pay</span>
            <span>{usdcNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-cesto-border bg-background/60 px-3 py-2.5 focus-within:border-cesto-green/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/tokens/usdc.png" alt="USDC" className="size-6 rounded-full" />
            <span className="text-sm font-medium text-white">USDC</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal"
              className="ml-auto w-24 bg-transparent text-right font-manrope text-lg font-semibold text-white outline-none" />
          </div>
          <div className="mt-3 rounded-lg border border-cesto-border bg-background/40 p-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>You receive</span><span className="text-white">≈ {buyUnits.toFixed(4)} {disp}</span></div>
            <div className="mt-1.5 flex justify-between text-muted-foreground"><span>Price</span><span className="text-white">{fmtUsd(price)}</span></div>
            <div className="mt-1.5 flex justify-between text-muted-foreground"><span>Fee (0.3%)</span><span className="text-white">{fmtUsd(buyFee)}</span></div>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Sell</span>
            <button onClick={() => setUnits(String(tokNum))} className="hover:text-white">Max {tokNum.toFixed(4)} {disp}</button>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-cesto-border bg-background/60 px-3 py-2.5 focus-within:border-cesto-green/40">
            <span className="text-sm font-medium text-white">{disp}</span>
            <input value={units} onChange={(e) => setUnits(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal"
              className="ml-auto w-28 bg-transparent text-right font-manrope text-lg font-semibold text-white outline-none" />
          </div>
          <div className="mt-3 rounded-lg border border-cesto-border bg-background/40 p-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>You receive</span><span className="text-white">≈ {fmtUsd(sellOut)}</span></div>
            <div className="mt-1.5 flex justify-between text-muted-foreground"><span>Holding</span><span className="text-white">{tokNum.toFixed(4)} {disp} ({fmtUsd(holdingValue)})</span></div>
          </div>
        </>
      )}

      {!tradable ? (
        <button className={`${primary} bg-secondary text-muted-foreground`} disabled>Not deployed</button>
      ) : !isConnected ? (
        <button className={`${primary} bg-[#333e3b] text-white hover:bg-[#3d4a46]`} onClick={() => connect({ connector: connectors[0], chainId: activeChain.id })}>Connect</button>
      ) : chainId !== activeChain.id ? (
        <button className={`${primary} bg-[#333e3b] text-white hover:bg-[#3d4a46]`} onClick={() => switchChain({ chainId: activeChain.id })}>Switch Network</button>
      ) : mode === "buy" ? (
        insufficient ? (
          DEPLOYMENT.stableIsMock ? (
            <button className={`${primary} bg-[#333e3b] text-white hover:bg-[#3d4a46]`} disabled={busy} onClick={() => act("faucet")}>
              {busy && pending === "faucet" ? "Claiming..." : "Get test USDC (faucet)"}
            </button>
          ) : <button className={`${primary} bg-secondary text-muted-foreground`} disabled>Insufficient USDC</button>
        ) : needsApproval ? (
          <button className={`${primary} bg-cesto-green text-[#091313] hover:bg-cesto-green/85`} disabled={busy} onClick={() => act("approve")}>
            {busy && pending === "approve" ? "Approving..." : "Approve USDC"}
          </button>
        ) : (
          <button className={`${primary} bg-cesto-green text-[#091313] hover:bg-cesto-green/85`} disabled={busy || parsedUsdc === 0n} onClick={() => act("buy")}>
            {busy && pending === "buy" ? "Buying..." : `Buy ${disp}`}
          </button>
        )
      ) : (
        <button className={`${primary} bg-destructive text-white hover:opacity-90`} disabled={busy || parsedUnits === 0n || parsedUnits > (tokBal ?? 0n)} onClick={() => act("sell")}>
          {busy && pending === "sell" ? "Selling..." : `Sell ${disp}`}
        </button>
      )}

      {error && <p className="mt-3 break-words text-xs text-destructive">{(error as any).shortMessage ?? error.message}</p>}
      {receipt && (
        <p className="mt-3 text-xs text-cesto-emerald">
          {receipt.action === "faucet"
            ? "1,000 test USDC minted ✓"
            : receipt.action === "approve"
            ? "USDC approved ✓"
            : receipt.action === "buy"
            ? `Bought ${disp} ✓`
            : `Sold ${disp} ✓`}{" "}
          <a href={explorerTx(receipt.hash)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
            view on explorer ↗
          </a>
        </p>
      )}
    </div>
  );
}
