'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { arcTestnet } from '@/lib/chains/arcTestnet'

export async function requestAddAndSwitchArc(): Promise<boolean> {
  const hexChainId = `0x${arcTestnet.id.toString(16)}`

  if (typeof window !== 'undefined' && (window as any).ethereum) {
    const ethereum = (window as any).ethereum
    try {
      // 1. Try direct switch first
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      })
      return true
    } catch (switchErr: any) {
      // 4902 indicates chain has not been added yet to wallet
      const isMissingChain =
        switchErr?.code === 4902 ||
        switchErr?.data?.originalError?.code === 4902 ||
        switchErr?.message?.includes('4902') ||
        switchErr?.message?.toLowerCase().includes('unrecognized') ||
        switchErr?.message?.toLowerCase().includes('not added')

      if (isMissingChain || switchErr) {
        try {
          // 2. Request adding Arc Testnet
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: hexChainId,
                chainName: arcTestnet.name,
                nativeCurrency: arcTestnet.nativeCurrency,
                rpcUrls: arcTestnet.rpcUrls.default.http,
                blockExplorerUrls: [arcTestnet.blockExplorers.default.url],
              },
            ],
          })
          // 3. Switch to it once added
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: hexChainId }],
          })
          return true
        } catch (addErr) {
          console.error('[Arc Network] User rejected or failed to add Arc Testnet:', addErr)
          return false
        }
      }
    }
  }
  return false
}

export function NetworkEnforcer() {
  const { isConnected, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const [switching, setSwitching] = useState(false)
  const autoPromptedRef = useRef(false)

  const isWrongNetwork = isConnected && chainId !== arcTestnet.id

  const handleSwitch = async () => {
    setSwitching(true)
    try {
      if (switchChainAsync) {
        try {
          await switchChainAsync({ chainId: arcTestnet.id })
          setSwitching(false)
          return
        } catch (wagmiErr) {
          console.warn('[Arc Network] Wagmi switchChain failed, falling back to direct RPC:', wagmiErr)
        }
      }
      await requestAddAndSwitchArc()
    } finally {
      setSwitching(false)
    }
  }

  // Automatically trigger switch & add on wallet connect when not on Arc Testnet
  useEffect(() => {
    if (!isConnected) {
      autoPromptedRef.current = false
      return
    }

    if (isWrongNetwork && !autoPromptedRef.current) {
      autoPromptedRef.current = true
      // Small timeout to allow wallet connect handshake to complete before opening switch prompt
      const timer = setTimeout(() => {
        handleSwitch()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isConnected, isWrongNetwork])

  if (!isWrongNetwork) {
    return null
  }

  return (
    <div className="w-full bg-[#FF3366] text-white px-4 py-2 text-xs font-mono flex items-center justify-between sticky top-0 z-50 shadow-md">
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-white animate-ping" />
        <span>
          <strong>Pythia runs on Arc Testnet (Chain ID 5042002).</strong> You are currently on another network.
        </span>
      </div>
      <button
        onClick={handleSwitch}
        disabled={switching}
        className="bg-white text-black font-bold px-3 py-1 rounded-[2px] text-xs hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
      >
        {switching ? 'prompting_wallet...' : 'switch_to_arc_testnet'}
      </button>
    </div>
  )
}
