'use client'

import React, { useState } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider, http } from 'wagmi'
import { sepolia, baseSepolia, arbitrumSepolia } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { arcTestnet } from '@/lib/chains/arcTestnet'
import { NetworkEnforcer } from '@/components/NetworkEnforcer'

const config = getDefaultConfig({
  appName: 'Pythia',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '3a8170812b534d0ff9d794f19a901d64',
  chains: [arcTestnet, baseSepolia, sepolia, arbitrumSepolia],
  transports: {
    [arcTestnet.id]: http('https://rpc.testnet.arc.network'),
    [baseSepolia.id]: http(),
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
  ssr: true,
})

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={arcTestnet}
          theme={darkTheme({
            accentColor: '#00FF66',
            accentColorForeground: '#070707',
            borderRadius: 'small',
          })}
        >
          <NetworkEnforcer />
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
