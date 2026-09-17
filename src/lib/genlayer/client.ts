// Thin wrapper around GenLayer's JS SDK v2. Centralized here so the rest of the
// app never imports `genlayer-js` directly.
//
// Studio Next (Chain ID 61997, Consensus v0.6) is the default network configured
// via src/lib/genlayer/network.ts per hackathon instructions.

import { createClient } from 'genlayer-js'
import * as chains from 'genlayer-js/chains'
import { GENLAYER_CHAIN } from './network'

let cachedClient: ReturnType<typeof createClient> | null = null

export function getGenLayerClient() {
  if (cachedClient) return cachedClient

  const networkName = process.env.GENLAYER_NETWORK
  let chain: any = GENLAYER_CHAIN

  if (networkName && networkName !== 'studioDevnet' && networkName !== 'studio-dev' && networkName !== 'studionext') {
    const namedChain = (chains as Record<string, unknown>)[networkName]
    if (namedChain) {
      chain = namedChain
    }
  }

  cachedClient = createClient({ chain })
  return cachedClient
}
