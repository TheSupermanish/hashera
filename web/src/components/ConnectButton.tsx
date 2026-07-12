"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { activeChain } from "@/lib/chain";
import { shortAddr } from "@/lib/format";
import { useState } from "react";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const [hover, setHover] = useState(false);

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0], chainId: activeChain.id })}
        disabled={isPending}
        className="flex h-9 items-center rounded-lg bg-[#333e3b] px-4 text-sm font-medium text-white transition-colors hover:bg-[#3d4a46] disabled:opacity-50"
      >
        {isPending ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (chainId !== activeChain.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: activeChain.id })}
        className="flex h-9 items-center rounded-lg bg-amber-500/90 px-4 text-sm font-medium text-[#091313] hover:bg-amber-400"
      >
        Switch Network
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex h-9 items-center rounded-lg border border-[#1a2924] bg-[#0c1a18] px-4 text-sm font-medium text-white transition-colors hover:border-destructive/50 hover:text-destructive"
    >
      {hover ? "Disconnect" : shortAddr(address)}
    </button>
  );
}
