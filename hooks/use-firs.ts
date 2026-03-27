"use client"

/**
 * hooks/use-firs.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React hooks for fetching FIR data from the API.
 *
 * useFIRs(options)  — paginated list of FIRs (role-scoped by the server)
 * useFIR(id)        — single FIR with integrity hash and chain verification
 *
 * SERVER-SIDE FILTERING:
 *   The server automatically scopes results based on the session cookie:
 *   - Citizens   → only their own FIRs
 *   - Police     → only FIRs in their pincode jurisdiction
 *   - Admins     → all FIRs
 *   No client-side filtering by role is needed or trusted.
 */
import { useState, useEffect, useCallback } from "react"
import type { FIR } from "@/lib/types"

// ── useFIRs ───────────────────────────────────────────────────────────────────

interface UseFIRsOptions {
  /** Filter by citizenId — ignored server-side for police/admin (session-scoped) */
  citizenId?: string
  /** Optional status filter (e.g. "pending", "verified") */
  status?: string
}

interface UseFIRsResult {
  firs: FIR[]
  total: number
  loading: boolean
  error: string | null
  /** Manually re-fetch the list (e.g. after an SSE notification) */
  refetch: () => void
}

export function useFIRs(options: UseFIRsOptions = {}): UseFIRsResult {
  const [firs, setFirs] = useState<FIR[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0) // increment to trigger a refetch

  const { citizenId, status } = options

  useEffect(() => {
    const params = new URLSearchParams()
    if (citizenId) params.set("citizenId", citizenId)
    if (status) params.set("status", status)
    params.set("limit", "100")

    setLoading(true)
    setError(null)

    fetch(`/api/fir?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setFirs(data.firs ?? [])
        setTotal(data.total ?? 0)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [citizenId, status, tick])

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  return { firs, total, loading, error, refetch }
}

// ── useFIR ────────────────────────────────────────────────────────────────────

interface UseFIRResult {
  fir: FIR | null
  loading: boolean
  error: string | null
  notFound: boolean
}

/**
 * Fetch a single FIR by its ID.
 * The response includes computedHash, integrityVerified, chainData, and
 * onChainStatusHistory for the blockchain trust panel.
 */
export function useFIR(id: string): UseFIRResult {
  const [fir, setFir] = useState<FIR | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    setNotFound(false)

    fetch(`/api/fir/${id}`)
      .then((res) => {
        if (res.status === 404) { setNotFound(true); return null }
        return res.json()
      })
      .then((data) => { if (data) setFir(data) })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return { fir, loading, error, notFound }
}
