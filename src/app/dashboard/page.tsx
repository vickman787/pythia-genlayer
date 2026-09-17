'use client'

import Link from 'next/link'
import {
  LockKeyhole,
  Wallet,
  ExternalLink,
  ArrowUpRight,
  RefreshCw,
  Pencil,
  Trash2,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { readApiJson } from '@/lib/http/client'
import { useAccount } from 'wagmi'

type DashboardData = {
  walletAddress: string | null
  sources: Array<{
    id: string
    title: string | null
    url: string
    price_usdc: number | string
    status: string
    created_at: string
  }>
  earnings: Array<{
    authorization_id: string
    source_id: string
    amount_usdc: number | string
    creatorAmount: number
    created_at: string
  }>
  stats: {
    sourceCount: number
    settledCitations: number
    grossEarnings: number
    creatorEarnings: number
  }
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}

function formatUsdc(value: number) {
  return value.toFixed(4)
}

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const walletAddress = isConnected && address ? address.toLowerCase() : null
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fee editing state
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [editFeeValue, setEditFeeValue] = useState<string>('')
  const [updatingFee, setUpdatingFee] = useState(false)
  const [feeUpdateError, setFeeUpdateError] = useState<string | null>(null)

  // Source deletion state
  const [deletingSource, setDeletingSource] = useState<DashboardData['sources'][0] | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Operation toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current))
    }, 3500)
  }

  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/creator/dashboard', { cache: 'no-store' })
      const result = await readApiJson<any>(response)
      if (!response.ok) throw new Error(result.error || 'Failed to load dashboard')
      setData(result)
    } catch (loadError: any) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (walletAddress) {
      void loadDashboard()
    } else {
      setData(null)
    }
  }, [walletAddress])

  const handleStartEditFee = (source: DashboardData['sources'][0]) => {
    setEditingSourceId(source.id)
    setEditFeeValue(Number(source.price_usdc).toString())
    setFeeUpdateError(null)
  }

  const handleCancelEditFee = () => {
    setEditingSourceId(null)
    setEditFeeValue('')
    setFeeUpdateError(null)
  }

  const handleSaveEditFee = async (sourceId: string) => {
    const parsedPrice = parseFloat(editFeeValue)
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setFeeUpdateError('Price must be a valid number >= 0')
      return
    }
    if (parsedPrice > 100) {
      setFeeUpdateError('Maximum price is 100 USDC')
      return
    }

    setUpdatingFee(true)
    setFeeUpdateError(null)

    try {
      const res = await fetch(`/api/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: parsedPrice }),
      })
      const result = await readApiJson<any>(res)

      if (!res.ok) {
        throw new Error(result.error || 'Failed to update citation fee')
      }

      // Update local state smoothly
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          sources: prev.sources.map((s) =>
            s.id === sourceId ? { ...s, price_usdc: parsedPrice } : s
          ),
        }
      })

      setEditingSourceId(null)
      showToast(`Citation fee updated to $${parsedPrice.toFixed(2)} USDC`)
    } catch (err: any) {
      setFeeUpdateError(err.message)
    } finally {
      setUpdatingFee(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingSource) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/sources/${deletingSource.id}`, {
        method: 'DELETE',
      })
      const result = await readApiJson<any>(res)

      if (!res.ok) {
        throw new Error(result.error || 'Failed to delete source')
      }

      const deletedTitle = deletingSource.title || deletingSource.url

      // Update local state smoothly
      setData((prev) => {
        if (!prev) return prev
        const remainingSources = prev.sources.filter((s) => s.id !== deletingSource.id)
        return {
          ...prev,
          sources: remainingSources,
          stats: {
            ...prev.stats,
            sourceCount: remainingSources.length,
          },
        }
      })

      setDeletingSource(null)
      showToast(`"${deletedTitle.slice(0, 30)}" deleted successfully`)
    } catch (err: any) {
      setDeleteError(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!walletAddress) {
    return (
      <main className="flex-1 content-container py-16 md:py-24">
        <div className="max-w-xl mx-auto card-panel p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--color-amber)]" />
          <LockKeyhole size={30} className="mx-auto mb-6 text-[var(--color-amber)]" />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-amber)] mb-4">dashboard_locked</p>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Connect to access creator mode</h1>
          <p className="text-[var(--color-soft-ink)] leading-relaxed mb-8">
            Your registered sources and earnings are tied to your connected wallet. Connect it from the top navigation, then return here to open your creator dashboard.
          </p>
          <div className="flex items-center justify-center gap-3 font-mono text-xs text-[var(--color-faint)]">
            <Wallet size={15} />
            <span>WALLET AUTH REQUIRED</span>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 content-container py-10 md:py-16">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-signal-green)] mb-4">
              <span className="glow-dot" /> creator_console / live
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Your sources, earning.</h1>
            <p className="mt-3 text-[var(--color-soft-ink)] font-mono text-sm">
              {shortAddress(walletAddress)} · creator share 80% · settled on GenLayer network
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => void loadDashboard()} disabled={loading} className="btn btn-secondary gap-2">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> refresh
            </button>
            <Link href="/register-article" className="btn btn-primary gap-2">
              register source <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>

        {error && <div className="mb-6 p-4 border border-[var(--color-rust)] text-[var(--color-rust)] font-mono text-sm">ERROR: {error}</div>}
        {loading && !data && <div className="card-panel p-8 font-mono text-sm text-[var(--color-soft-ink)]">Loading creator ledger...</div>}

        {data && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--color-border-subtle)] border border-[var(--color-border-subtle)] mb-10">
              <div className="bg-[var(--color-panel)] p-6">
                <p className="label-text">creator earnings</p>
                <p className="text-3xl font-mono text-[var(--color-success)]">${formatUsdc(data.stats.creatorEarnings)}</p>
                <p className="mt-2 text-xs font-mono text-[var(--color-faint)]">USDC · after platform share</p>
              </div>
              <div className="bg-[var(--color-panel)] p-6">
                <p className="label-text">settled citations</p>
                <p className="text-3xl font-mono">{data.stats.settledCitations}</p>
                <p className="mt-2 text-xs font-mono text-[var(--color-faint)]">paid source uses</p>
              </div>
              <div className="bg-[var(--color-panel)] p-6">
                <p className="label-text">registered sources</p>
                <p className="text-3xl font-mono">{data.stats.sourceCount}</p>
                <p className="mt-2 text-xs font-mono text-[var(--color-faint)]">available to research</p>
              </div>
            </section>

            <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
              <div className="card-panel overflow-hidden">
                <div className="panel-h justify-between"><span>registered_sources</span><span className="tag ghost">{data.sources.length} total</span></div>
                {data.sources.length === 0 ? (
                  <div className="p-8 text-sm text-[var(--color-soft-ink)]">No sources registered yet. Add your first source to start building a citation income stream.</div>
                ) : (
                  <div className="divide-y divide-[var(--color-border-subtle)]">
                    {data.sources.map((source) => (
                      <div key={source.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="min-w-0 flex-1 pr-2">
                          <h2 className="font-semibold truncate">{source.title || 'Untitled source'}</h2>
                          <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs font-mono text-[var(--color-olive)] hover:text-[var(--color-signal-green)] truncate max-w-md">
                            {source.url} <ExternalLink size={11} className="flex-shrink-0" />
                          </a>
                          <p className="mt-2 text-[0.65rem] font-mono uppercase tracking-wider text-[var(--color-faint)]">registered {formatDate(source.created_at)}</p>
                        </div>

                        {/* Fee & Action Controls */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {editingSourceId === source.id ? (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs text-[var(--color-faint)]">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={editFeeValue}
                                  onChange={(e) => setEditFeeValue(e.target.value)}
                                  className="w-20 px-2 py-1 text-xs font-mono bg-[var(--color-panel-deep)] border border-[var(--color-signal-green)] rounded text-[var(--color-ink)] focus:outline-none"
                                  placeholder="0.00"
                                  disabled={updatingFee}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') void handleSaveEditFee(source.id)
                                    if (e.key === 'Escape') handleCancelEditFee()
                                  }}
                                />
                                <span className="font-mono text-[0.65rem] text-[var(--color-faint)]">USDC</span>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveEditFee(source.id)}
                                  disabled={updatingFee}
                                  className="px-2.5 py-1 text-xs font-mono font-semibold rounded bg-[var(--color-signal-green)] text-white hover:brightness-110 flex items-center gap-1 transition-all disabled:opacity-40"
                                  title="Save Citation Fee"
                                >
                                  {updatingFee ? <RefreshCw size={11} className="animate-spin" /> : <Check size={12} />}
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEditFee}
                                  disabled={updatingFee}
                                  className="p-1 rounded text-[var(--color-faint)] hover:text-[var(--color-ink)] transition-colors"
                                  title="Cancel"
                                >
                                  <X size={13} />
                                </button>
                              </div>
                              {feeUpdateError && (
                                <p className="text-[0.65rem] font-mono text-[var(--color-rust)]">{feeUpdateError}</p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <span className="tag ghost">{source.status}</span>
                              <span className="font-mono font-medium text-[var(--color-success)] text-sm">
                                ${Number(source.price_usdc).toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleStartEditFee(source)}
                                className="p-1.5 rounded hover:bg-[var(--color-panel-deep)] text-[var(--color-olive)] hover:text-[var(--color-ink)] border border-[var(--color-border-subtle)] transition-colors"
                                title="Edit Citation Fee"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSource(source)}
                                className="p-1.5 rounded hover:bg-[var(--color-rust)]/15 text-[var(--color-olive)] hover:text-[var(--color-rust)] border border-[var(--color-border-subtle)] hover:border-[var(--color-rust)]/40 transition-colors"
                                title="Delete Source"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card-panel overflow-hidden">
                <div className="panel-h justify-between"><span>earnings_ledger</span><span className="tag ghost">80% creator</span></div>
                {data.earnings.length === 0 ? (
                  <div className="p-8 text-sm text-[var(--color-soft-ink)]">No settled citations yet. Your earnings will appear here when research uses a paid source.</div>
                ) : (
                  <div className="divide-y divide-[var(--color-border-subtle)]">
                    {data.earnings.map((earning) => (
                      <div key={earning.authorization_id} className="p-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-mono text-sm">{shortAddress(earning.authorization_id)}</p>
                          <p className="mt-1 text-xs text-[var(--color-faint)]">{formatDate(earning.created_at)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-[var(--color-success)]">+${formatUsdc(earning.creatorAmount)}</p>
                          <p className="text-[0.65rem] font-mono text-[var(--color-faint)]">USDC settled</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      {/* Delete Source Confirmation Modal */}
      {deletingSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="card-panel max-w-md w-full p-6 border border-[var(--color-rust)]/50 relative shadow-2xl bg-[var(--color-panel)]">
            <div className="flex items-center gap-3 mb-4 text-[var(--color-rust)]">
              <div className="p-2 rounded bg-[var(--color-rust)]/15">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h2 className="font-mono text-sm uppercase tracking-wider font-bold text-[var(--color-rust)]">
                  Delete Registered Source
                </h2>
                <p className="text-xs text-[var(--color-faint)] font-mono">Remove from research network</p>
              </div>
            </div>

            <p className="text-sm text-[var(--color-soft-ink)] mb-3 leading-relaxed">
              Are you sure you want to delete <strong className="text-[var(--color-ink)] font-semibold">{deletingSource.title || deletingSource.url}</strong>?
            </p>

            <div className="p-3 bg-[var(--color-panel-deep)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-olive)] font-mono space-y-1.5 mb-6 rounded">
              <p className="text-[var(--color-soft-ink)] font-medium">Impact of deletion:</p>
              <p>• Unindexed from vector search & AI research matching</p>
              <p>• Cannot earn new citation fees</p>
              <p>• Past settled earnings remain preserved in your ledger</p>
            </div>

            {deleteError && (
              <div className="mb-4 p-2.5 border border-[var(--color-rust)]/50 bg-[var(--color-rust)]/10 text-[var(--color-rust)] text-xs font-mono rounded">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  setDeletingSource(null)
                  setDeleteError(null)
                }}
                disabled={isDeleting}
                className="btn btn-secondary py-1.5 px-4"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={isDeleting}
                className="btn py-1.5 px-4 bg-[var(--color-rust)] text-white hover:brightness-110 border border-[var(--color-rust)] flex items-center gap-1.5"
              >
                {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Source'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Toast Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[var(--color-panel)] border border-[var(--color-success)]/60 text-[var(--color-ink)] font-mono text-xs rounded shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check size={14} className="text-[var(--color-success)] flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </main>
  )
}
