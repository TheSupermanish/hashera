"use client";

import { useEffect, useMemo, useState } from "react";
import { parseUnits, formatUnits } from "viem";
import {
  useAccount,
  useConnect,
  useReadContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { DEPLOYMENT, ERC20_ABI, VAULT_ABI } from "@/lib/contracts";
import { activeChain, explorerTx } from "@/lib/chain";
import { fmtPct, fmtUsd } from "@/lib/format";

type Mode = "invest" | "withdraw";

export function InvestPanel({
  slug,
  vaultAddress,
  minInvest,
  entryFeeBps,
  annualReturnPct,
}: {
  slug: string;
  vaultAddress?: string;
  minInvest: number;
  entryFeeBps: number;
  annualReturnPct: number;
}) {
  const vault = (vaultAddress || "") as `0x${string}`;
  const stable = DEPLOYMENT.stable as `0x${string}`;
  const deployed = !!vaultAddress && vaultAddress.length === 42;

  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChain } = useSwitchChain();
  const [mode, setMode] = useState<Mode>("invest");
  const [amount, setAmount] = useState<string>(String(minInvest));
  const [pendingAction, setPendingAction] = useState<"" | "approve" | "invest" | "redeem" | "faucet">("");
  // Persisted confirmation of the last completed tx. Kept separate from wagmi's
  // live receipt state because the effect below calls reset() (clearing txHash),
  // which would otherwise wipe the "confirmed" banner the instant it appears.
  const [receipt, setReceipt] = useState<{ hash: `0x${string}`; action: "approve" | "invest" | "redeem" | "faucet" } | null>(null);

  const parsedAmount = useMemo(() => {
    try {
      return parseUnits((amount || "0") as `${number}`, 6);
    } catch {
      return 0n;
    }
  }, [amount]);

  const enabled = deployed && !!address;

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: stable, abi: ERC20_ABI, functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled },
  });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: stable, abi: ERC20_ABI, functionName: "allowance",
    args: [address ?? "0x0000000000000000000000000000000000000000", vault],
    query: { enabled },
  });
  const { data: shares, refetch: refetchShares } = useReadContract({
    address: vault, abi: VAULT_ABI, functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled },
  });
  const { data: preview } = useReadContract({
    address: vault, abi: VAULT_ABI, functionName: "previewInvest",
    args: [parsedAmount],
    query: { enabled: deployed && parsedAmount > 0n },
  });
  const { data: sharePrice } = useReadContract({
    address: vault, abi: VAULT_ABI, functionName: "sharePrice",
    query: { enabled: deployed },
  });

  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!confirmed || !txHash) return;
    refetchBalance();
    refetchAllowance();
    refetchShares();
    if (pendingAction === "invest" || pendingAction === "redeem") {
      // Record the values that actually apply to each action: invest uses the
      // input amount and previewed shares out; redeem uses the full position
      // value and the shares burned (the whole balance).
      const isInvest = pendingAction === "invest";
      fetch("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          wallet: address,
          basketSlug: slug,
          type: isInvest ? "invest" : "redeem",
          usdcAmount: isInvest ? Number(amount) : Number(positionValue.toFixed(2)),
          shares: isInvest
            ? preview
              ? Number(formatUnits(preview[0], 18))
              : undefined
            : sharesNum,
          txHash,
        }),
      }).catch(() => {});
    }
    if (pendingAction) setReceipt({ hash: txHash, action: pendingAction });
    setPendingAction("");
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  const balanceNum = balance !== undefined ? Number(formatUnits(balance, 6)) : 0;
  const sharesNum = shares !== undefined ? Number(formatUnits(shares, 18)) : 0;
  const sharePriceNum = sharePrice !== undefined ? Number(formatUnits(sharePrice, 6)) : 1;
  const positionValue = sharesNum * sharePriceNum;
  const fee = preview ? Number(formatUnits(preview[1], 6)) : (Number(amount || 0) * entryFeeBps) / 10000;
  const estValue = preview
    ? Number(formatUnits(preview[0], 18)) * sharePriceNum
    : Number(amount || 0) - fee;
  const estDeltaPct = Number(amount) > 0 ? ((estValue - Number(amount)) / Number(amount)) * 100 : 0;

  const needsApproval = allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount;
  const busy = isPending || confirming;
  const belowMin = Number(amount || 0) < minInvest;
  const insufficient = isConnected && Number(amount || 0) > balanceNum;

  const act = (action: "approve" | "invest" | "redeem" | "faucet") => {
    setReceipt(null);
    setPendingAction(action);
    if (action === "approve") {
      writeContract({ address: stable, abi: ERC20_ABI, functionName: "approve", args: [vault, parsedAmount * 4n] });
    } else if (action === "invest") {
      writeContract({ address: vault, abi: VAULT_ABI, functionName: "invest", args: [parsedAmount] });
    } else if (action === "redeem") {
      writeContract({ address: vault, abi: VAULT_ABI, functionName: "redeem", args: [shares ?? 0n] });
    } else if (action === "faucet") {
      writeContract({ address: stable, abi: ERC20_ABI, functionName: "faucet", args: [] });
    }
  };

  const primaryBtn =
    "mt-4 w-full rounded-lg py-3 text-sm font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="rounded-xl border border-cesto-border bg-card/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-manrope text-lg font-semibold text-white">Invest</h2>
        {sharesNum > 0 && (
          <div className="flex items-center gap-1 rounded-md border border-cesto-border bg-[#0c1a18] p-0.5 text-xs">
            {(["invest", "withdraw"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded px-2.5 py-1 capitalize transition-colors ${
                  mode === m ? "bg-[#1a2924] text-white" : "text-muted-foreground hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === "invest" ? (
        <>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="14" rx="2" />
                <path d="M16 12h2" />
              </svg>
              {balanceNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
            </span>
            <span className="flex items-center gap-3 text-muted-foreground">
              <button onClick={() => setAmount((balanceNum / 2).toFixed(2))} className="transition-colors hover:text-white">
                Half
              </button>
              <button onClick={() => setAmount(balanceNum.toFixed(2))} className="transition-colors hover:text-white">
                Max
              </button>
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 rounded-lg border border-cesto-border bg-background/60 px-3 py-2.5 focus-within:border-cesto-green/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/tokens/usdc.png" alt="USDC" className="size-6 shrink-0 rounded-full object-cover" />
            <span className="text-sm font-medium text-white">USDC</span>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              className="ml-auto w-24 bg-transparent text-right font-manrope text-lg font-semibold text-white outline-none placeholder:text-cesto-desc"
              placeholder="0"
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className={belowMin ? "text-amber-400" : ""}>Minimum: {minInvest} USDC</span>
            <span>
              ≈ {fmtUsd(estValue)}{" "}
              <span className={estDeltaPct < 0 ? "text-destructive" : "text-cesto-emerald"}>
                ({fmtPct(estDeltaPct)})
              </span>
            </span>
          </div>

          <div className="mt-4 rounded-lg border border-cesto-border bg-background/40 p-3">
            <div className="flex items-center justify-between border-b border-cesto-border pb-2.5 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                Annual Return
                <span className="text-[9px] uppercase tracking-wide opacity-70">backtested</span>
              </span>
              <span className={`font-manrope font-bold ${annualReturnPct >= 0 ? "text-cesto-emerald" : "text-destructive"}`}>
                {fmtPct(annualReturnPct)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2.5 text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                Fee
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </span>
              <span className="text-white underline decoration-dotted underline-offset-2">{fmtUsd(fee)}</span>
            </div>
          </div>

          {!deployed ? (
            <button className={`${primaryBtn} bg-secondary text-muted-foreground`} disabled>
              Contracts not deployed
            </button>
          ) : !isConnected ? (
            <button
              className={`${primaryBtn} bg-[#333e3b] text-white hover:bg-[#3d4a46]`}
              onClick={() => connect({ connector: connectors[0], chainId: activeChain.id })}
            >
              Connect
            </button>
          ) : chainId !== activeChain.id ? (
            <button className={`${primaryBtn} bg-[#333e3b] text-white hover:bg-[#3d4a46]`} onClick={() => switchChain({ chainId: activeChain.id })}>
              Switch Network
            </button>
          ) : insufficient ? (
            DEPLOYMENT.stableIsMock ? (
              <button className={`${primaryBtn} bg-[#333e3b] text-white hover:bg-[#3d4a46]`} disabled={busy} onClick={() => act("faucet")}>
                {busy && pendingAction === "faucet" ? "Claiming..." : "Get test USDC (faucet)"}
              </button>
            ) : (
              <button className={`${primaryBtn} bg-secondary text-muted-foreground`} disabled>
                Insufficient USDC
              </button>
            )
          ) : needsApproval ? (
            <button className={`${primaryBtn} bg-cesto-green text-[#091313] hover:bg-cesto-green/85`} disabled={busy || belowMin} onClick={() => act("approve")}>
              {busy && pendingAction === "approve" ? "Approving..." : "Approve USDC"}
            </button>
          ) : (
            <button
              className={`${primaryBtn} bg-cesto-green text-[#091313] hover:bg-cesto-green/85`}
              disabled={busy || belowMin || parsedAmount === 0n}
              onClick={() => act("invest")}
            >
              {busy && pendingAction === "invest" ? "Investing..." : "Invest"}
            </button>
          )}
        </>
      ) : (
        <div className="mt-4">
          <div className="rounded-lg border border-cesto-border bg-background/40 p-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Your shares</span>
              <span className="text-white">{sharesNum.toFixed(4)}</span>
            </div>
            <div className="mt-2 flex justify-between text-muted-foreground">
              <span>Position value</span>
              <span className="font-manrope font-semibold text-white">{fmtUsd(positionValue)}</span>
            </div>
          </div>
          <button
            className={`${primaryBtn} bg-cesto-green text-[#091313] hover:bg-cesto-green/85`}
            disabled={busy || sharesNum === 0}
            onClick={() => act("redeem")}
          >
            {busy && pendingAction === "redeem" ? "Withdrawing..." : "Withdraw All"}
          </button>
        </div>
      )}

      {writeError && (
        <p className="mt-3 break-words text-xs text-destructive">
          {(writeError as any).shortMessage ?? writeError.message}
        </p>
      )}
      {receipt && (
        <p className="mt-3 text-xs text-cesto-emerald">
          {receipt.action === "faucet"
            ? "1,000 test USDC minted ✓"
            : receipt.action === "approve"
            ? "USDC approved ✓"
            : receipt.action === "invest"
            ? "Invested ✓"
            : "Withdrawn ✓"}{" "}
          <a href={explorerTx(receipt.hash)} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-white">
            view on explorer ↗
          </a>
        </p>
      )}
    </div>
  );
}
