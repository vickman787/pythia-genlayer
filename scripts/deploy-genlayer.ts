// Deploys contracts/research_contract.py to GenLayer Studio Next (Chain ID 61997)
// through the backend relayer.
//
//   npm run deploy:genlayer
//
// Prints the new contract address. Set it as GENLAYER_CONTRACT_ADDRESS in
// .env / .env.local.

import fs from 'fs'
import path from 'path'
import { getRelayerClient } from '../src/lib/genlayer/relayer'
import { GENLAYER_CHAIN } from '../src/lib/genlayer/network'

const CONTRACT_PATH = path.join('contracts', 'research_contract.py')

function loadEnvFiles() {
  for (const file of ['.env', '.env.local']) {
    if (!fs.existsSync(file)) continue
    for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const separator = line.indexOf('=')
      if (separator < 1) continue
      const key = line.slice(0, separator).trim()
      if (process.env[key]) continue
      const value = line.slice(separator + 1).trim()
      process.env[key] = value.replace(/^"(.*)"$/s, '$1').replace(/^'(.*)'$/s, '$1')
    }
  }
}

export const isSuccessfulReceipt = (receipt: any): boolean => {
  const numericStatus = Number(receipt?.status)
  return (
    numericStatus === 5 ||
    numericStatus === 7 ||
    receipt?.statusName === 'ACCEPTED' ||
    receipt?.statusName === 'FINALIZED' ||
    receipt?.status === 'ACCEPTED' ||
    receipt?.status === 'FINALIZED'
  )
}

async function main() {
  loadEnvFiles()

  if (!process.env.GENLAYER_RELAYER_PRIVATE_KEY) {
    throw new Error('GENLAYER_RELAYER_PRIVATE_KEY is not set')
  }

  const fileBytes = new Uint8Array(fs.readFileSync(CONTRACT_PATH))
  const { client, account } = getRelayerClient()

  console.log(`target network    ${GENLAYER_CHAIN.name} (Chain ID ${GENLAYER_CHAIN.id})`)
  console.log(`rpc url           ${GENLAYER_CHAIN.rpcUrls.default.http[0]}`)
  console.log(`relayer account   ${account.address}`)
  console.log(`contract source   ${CONTRACT_PATH} (${fileBytes.length} bytes)`)
  console.log('deploying via relayer...')

  let fees: any = undefined
  if (typeof (client as any).estimateTransactionFees === 'function') {
    try {
      console.log('estimating transaction fees for Consensus v0.6...')
      fees = await (client as any).estimateTransactionFees({})
      console.log(`estimated feeValue: ${fees.feeValue}`)
    } catch (err) {
      console.warn('Fee estimation failed:', err)
    }
  }

  const hash = await client.deployContract({
    account,
    code: fileBytes,
    args: [],
    ...(fees ? { fees } : {}),
  })
  console.log(`transaction       ${hash}`)
  console.log('waiting for transaction receipt (Consensus v0.6)...')

  let receipt: any
  try {
    receipt = await (client as any).waitForTransactionReceipt({
      hash,
      waitUntil: 'decided',
      retries: 150,
      interval: 3000,
    })
  } catch (err) {
    console.warn('Wait with decided failed, falling back to status polling:', err)
    receipt = await (client as any).waitForTransactionReceipt({
      hash,
      status: 'ACCEPTED',
    })
  }

  if (!isSuccessfulReceipt(receipt)) {
    throw new Error(`Deployment did not reach successful consensus. Receipt: ${JSON.stringify(receipt)}`)
  }

  const executionResult = receipt?.txExecutionResultName ?? receipt?.txExecutionResult ?? receipt?.executionResult
  if (executionResult && executionResult !== 'FINISHED_WITH_RETURN' && executionResult !== 'FINISHED') {
    throw new Error(`Deployment did not finish successfully: ${executionResult}`)
  }

  const address =
    receipt?.data?.contract_address ||
    receipt?.consensus_data?.contract_address ||
    receipt?.consensusData?.contract_address ||
    receipt?.contract_address ||
    receipt?.contractAddress ||
    receipt?.txDataDecoded?.contractAddress

  if (!address) {
    console.error(JSON.stringify(receipt, null, 2))
    throw new Error('Deployment was accepted but no contract address was found in the receipt')
  }

  console.log('')
  console.log('========================================================')
  console.log('✅ DEPLOYED SUCCESSFULLY TO STUDIO NEXT')
  console.log(`GENLAYER_CONTRACT_ADDRESS=${address}`)
  console.log('========================================================')
  console.log('')
  console.log('Update .env and .env.local with this address.')
}

main().catch((error: unknown) => {
  console.error('')
  console.error(`FAILED: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
