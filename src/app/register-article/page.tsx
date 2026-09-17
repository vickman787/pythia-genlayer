'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ShieldCheck, Copy, Check, AlertCircle } from 'lucide-react'
import { readApiJson, fetchWithAuthRetry } from '@/lib/http/client'

export default function RegisterArticlePage() {
  const [url, setUrl] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [token, setToken] = useState<string>('')

  const { address, isConnected } = useAccount()
  const walletAddress = isConnected && address ? address.toLowerCase() : null

  useEffect(() => {
    if (!walletAddress) {
      setToken('')
      return
    }

    let isMounted = true
    fetch('/api/creators/verification-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletAddress }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.token) {
          setToken(data.token)
        }
      })
      .catch((err) => console.warn('Failed to fetch verification token:', err))

    return () => {
      isMounted = false
    }
  }, [walletAddress])

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current))
    }, 2000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!walletAddress) {
      setError('Connect your wallet before registering a source.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetchWithAuthRetry('/api/sources/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, price: parseFloat(price) }),
      }, walletAddress)

      const data = await readApiJson<any>(res)

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register article')
      }

      setSuccess(true)
      setUrl('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center pt-12 md:pt-20 pb-16 content-container">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-serif font-bold mb-3 text-[var(--color-ink)]">Register Article</h1>
          <p className="text-lg text-[var(--color-soft-ink)]">
            Submit your work to the network. Set a citation-licence price in USDC.
          </p>
        </div>

        {/* Privacy-Preserving Ownership Verification Box */}
        <div className="card-panel p-6 sm:p-7 mb-8 border border-[var(--color-border-subtle)] bg-[var(--color-panel-deep)]/40">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)] shrink-0">
              <ShieldCheck className="w-5 h-5 text-[var(--color-accent)]" />
            </div>
            <div>
              <h2 className="text-base font-medium text-[var(--color-ink)] flex items-center gap-2">
                Ownership Verification
                <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent)] font-mono">
                  Zero-Address Privacy
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-[var(--color-soft-ink)] mt-1">
                This is your <strong className="text-[var(--color-ink)] font-semibold">permanent, reusable creator verification code</strong>. You can use this single code across <strong className="text-[var(--color-ink)] font-semibold">all your articles and platforms</strong> (X / Twitter, Substack, Medium, Ghost, WordPress, personal blog) to claim ownership and receive USDC payouts without ever exposing your wallet address.
              </p>
            </div>
          </div>

          {!walletAddress ? (
            <div className="p-4 border border-[var(--color-amber)]/40 bg-[var(--color-amber)]/5 text-[var(--color-amber)] text-xs sm:text-sm font-mono rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Connect your EVM wallet from the top bar to get your verification code.</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Verification Code Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono text-[var(--color-olive)]">
                    Your Verification Code (Reusable for all articles):
                  </label>
                  <span className="text-[11px] font-mono text-[var(--color-soft-ink)]">
                    Paste anywhere in your article, X post, or page HTML
                  </span>
                </div>
                <div className="relative group rounded bg-[var(--color-panel-deep)] border border-[var(--color-border-subtle)] p-3 font-mono text-xs text-[var(--color-ink)] break-all pr-24">
                  <code className="text-[var(--color-accent)] font-semibold">{token || 'Loading verification token...'}</code>
                  {token && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(token, 'token')}
                      className="absolute right-2 top-2 px-2.5 py-1 text-xs rounded bg-[var(--color-panel)] border border-[var(--color-border-subtle)] text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] flex items-center gap-1 transition-colors"
                    >
                      {copiedKey === 'token' ? (
                        <>
                          <Check className="w-3 h-3 text-[var(--color-success)]" />
                          <span className="text-[var(--color-success)]">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="card-panel p-8 sm:p-10">
          {error && (
            <div className="mb-6 p-4 border border-[var(--color-rust)] text-[var(--color-rust)] bg-[var(--color-rust)]/5 font-mono text-sm rounded">
              ERROR: {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 border border-[var(--color-success)] text-[var(--color-ink)] bg-[var(--color-success)]/10 font-mono text-sm rounded">
              SUCCESS: Article registered, verified, and extracted successfully.
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="url" className="label-text">
                Public Article URL
              </label>
              <input
                id="url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://x.com/handle/status/... or https://your-domain.com/article"
                className="input-field"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="price" className="label-text">
                Citation Licence Price (USDC)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-[var(--color-soft-ink)]">$</span>
                <input
                  id="price"
                  type="number"
                  required
                  min="0"
                  max="100"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.05"
                  className="input-field font-mono"
                  style={{ paddingLeft: '2.5rem' }}
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-xs text-[var(--color-olive)]">
                Amount paid to your wallet each time the GenLayer contract cites this source. Settled in USDC on Arc Testnet.
              </p>
            </div>

            <div className="pt-6 border-t border-[var(--color-border-subtle)]">
              <button
                type="submit"
                disabled={loading || !walletAddress}
                title={!walletAddress ? 'Connect your wallet first' : undefined}
                className="btn btn-primary w-full"
              >
                {loading ? 'Extracting & Verifying...' : !walletAddress ? 'Connect wallet to register' : 'Register Source'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
