"use client";

import { useMemo } from "react";
import { createTransactionKit, type TransactionKit } from "@genlayer/transaction-kit";
import { GENLAYER_CHAIN } from "./network";

interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
}

export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  return (window as any).ethereum || null;
}

export function useTransactionKit(address?: string | null): TransactionKit | null {
  return useMemo(() => {
    const provider = getEthereumProvider();

    if (!provider || !address?.startsWith("0x")) {
      return null;
    }

    return createTransactionKit({
      chain: GENLAYER_CHAIN,
      provider,
      account: address as `0x${string}`,
    });
  }, [address]);
}
