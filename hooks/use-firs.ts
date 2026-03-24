"use client"

import { useState, useEffect, useCallback } from "react"
import type { FIR } from "@/lib/types"

// ── useFIRs — fetch a list of FIRs with optional filters ─────────────────────

interface UseFIRsOptions {
  citizenId?: string
  status?: string
}

interface UseFIRsResult {
  firs: FIR[]
  total: number
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useFIRs(options: UseFIRsOptions = {}): UseFIRsResult {
  const [firs, setFirs] = useState<FIR[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

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

// ── useFIR — fetch a single FIR by ID ────────────────────────────────────────

interface UseFIRResult {
  fir: FIR | null
  loading: boolean
  error: string | null
  notFound: boolean
}

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
