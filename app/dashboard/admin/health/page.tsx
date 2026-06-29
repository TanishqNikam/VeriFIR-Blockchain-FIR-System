"use client"

import { useState, useEffect, useCallback } from "react"
import { Activity, Database, Blocks, Globe, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// ── Types ──────────────────────────────────────────────────────────────────────

type ServiceResult =
  | { status: "ok"; latencyMs: number }
  | { status: "down"; error: string }

interface HealthData {
  status: "ok" | "degraded"
  services: {
    database: ServiceResult
    blockchain: ServiceResult
    ipfs: ServiceResult
  }
  timestamp: string
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: "ok" | "down" | "checking" }) {
  if (status === "checking") return <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
  if (status === "ok") return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
  return <XCircle className="h-5 w-5 text-red-500" />
}

function LatencyBar({ ms }: { ms: number }) {
  // colour the bar based on response time
  const color = ms < 100 ? "bg-emerald-500" : ms < 500 ? "bg-amber-400" : "bg-red-500"
  const width = Math.min(100, (ms / 1000) * 100) // scale 0-1000ms to 0-100%
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100">
      <div className={`h-1.5 rounded-full transition-all duration-500 ${color}`} style={{ width: `${width}%` }} />
    </div>
  )
}

interface ServiceCardProps {
  label: string
  description: string
  icon: React.ReactNode
  result: ServiceResult | null
  checking: boolean
}

function ServiceCard({ label, description, icon, result, checking }: ServiceCardProps) {
  const status = checking ? "checking" : result?.status ?? "checking"

  return (
    <Card className={`border-2 transition-colors duration-300 ${
      status === "ok" ? "border-emerald-200 bg-emerald-50/30" :
      status === "down" ? "border-red-200 bg-red-50/30" :
      "border-slate-200"
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            {icon}
            <CardTitle className="text-base font-semibold">{label}</CardTitle>
          </div>
          <StatusIcon status={status === "checking" ? "checking" : (result?.status ?? "checking")} />
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>

      <CardContent>
        {checking || !result ? (
          <p className="text-sm text-slate-400">Checking…</p>
        ) : result.status === "ok" ? (
          <>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{result.latencyMs} ms</span>
              <span className="text-xs text-slate-400">response time</span>
            </div>
            <LatencyBar ms={result.latencyMs} />
          </>
        ) : (
          <p className="text-sm text-red-600 break-all leading-relaxed">
            {result.error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

const AUTO_REFRESH_SECONDS = 30

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [checking, setChecking] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState(AUTO_REFRESH_SECONDS)

  const runCheck = useCallback(async () => {
    setChecking(true)
    try {
      const res = await fetch("/api/health")
      const json: HealthData = await res.json()
      setData(json)
      setLastChecked(new Date())
      setCountdown(AUTO_REFRESH_SECONDS)
    } catch {
      // Network error reaching the health endpoint itself
      setData(null)
    } finally {
      setChecking(false)
    }
  }, [])

  // Initial check on mount
  useEffect(() => { runCheck() }, [runCheck])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(runCheck, AUTO_REFRESH_SECONDS * 1000)
    return () => clearInterval(interval)
  }, [runCheck])

  // Countdown timer — ticks every second between checks
  useEffect(() => {
    if (checking) return
    const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(tick)
  }, [checking])

  const overallOk = data?.status === "ok"
  const overallDegraded = data?.status === "degraded"

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            System Health
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status of all critical services. Auto-refreshes every {AUTO_REFRESH_SECONDS} seconds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!checking && (
            <span className="text-xs text-slate-400">
              Next check in {countdown}s
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={runCheck}
            disabled={checking}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Checking…" : "Refresh Now"}
          </Button>
        </div>
      </div>

      {/* ── Overall status banner ── */}
      <Card className={`border-2 ${
        checking ? "border-slate-200 bg-slate-50" :
        overallOk ? "border-emerald-300 bg-emerald-50" :
        overallDegraded ? "border-amber-300 bg-amber-50" :
        "border-red-300 bg-red-50"
      }`}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {checking ? (
              <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
            ) : overallOk ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            )}

            <div>
              <p className="font-semibold text-slate-800">
                {checking ? "Running health checks…" :
                 overallOk ? "All systems operational" :
                 "System degraded — one or more services are down"}
              </p>
              {lastChecked && !checking && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Last checked: {lastChecked.toLocaleTimeString()}
                  {data?.timestamp && (
                    <> &nbsp;·&nbsp; Server time: {new Date(data.timestamp).toLocaleTimeString()}</>
                  )}
                </p>
              )}
            </div>

            {!checking && data && (
              <Badge
                className="ml-auto"
                variant={overallOk ? "default" : "destructive"}
              >
                {data.status.toUpperCase()}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Per-service cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ServiceCard
          label="Database"
          description="MongoDB — primary data store for all FIR records, users, and audit logs"
          icon={<Database className="h-4 w-4" />}
          result={data?.services.database ?? null}
          checking={checking}
        />
        <ServiceCard
          label="Blockchain"
          description="Ethereum RPC node — used to anchor FIR fingerprints and record verifications"
          icon={<Blocks className="h-4 w-4" />}
          result={data?.services.blockchain ?? null}
          checking={checking}
        />
        <ServiceCard
          label="IPFS / Pinata"
          description="Distributed file storage — evidence files and FIR metadata pinned here"
          icon={<Globe className="h-4 w-4" />}
          result={data?.services.ipfs ?? null}
          checking={checking}
        />
      </div>

      {/* ── Failsafe note ── */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="py-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-600">Failsafe behaviour: </span>
            VeriFIR continues to operate even when individual services are down.
            If the blockchain node is unreachable, FIR filings are saved normally and
            blockchain registration is queued as "pending" for later retry.
            If IPFS is temporarily unavailable, uploads are retried automatically up to 3 times.
            If email notifications fail, all core operations (filing, verification, rejection) still complete normally.
            A <span className="font-semibold">"degraded"</span> status here means reduced functionality — not a crash.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
