"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { FileText, CheckCircle, TrendingUp, Clock, ArrowRight, Blocks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/dashboard/stats-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useFIRs } from "@/hooks/use-firs"
import { useLanguage } from "@/lib/i18n/language-context"

interface BlockchainEvent {
  event: "FIRCreated" | "FIRVerified" | "StatusUpdated"
  firId: string
  txHash: string
  blockNumber: number
  timestamp?: number
  walletAddress: string
  extra?: Record<string, string>
}

export default function AdminDashboardPage() {
  const { firs, loading } = useFIRs()
  const { t } = useLanguage()

  const [onChainCount, setOnChainCount] = useState<number | null>(null)
  const [recentLogs, setRecentLogs] = useState<BlockchainEvent[]>([])

  useEffect(() => {
    fetch("/api/blockchain-stats?limit=5")
      .then((r) => r.json())
      .then((data) => {
        setOnChainCount(data.firCount ?? null)
        setRecentLogs(data.recentEvents ?? [])
      })
      .catch(() => {})
  }, [])

  const totalFIRs = firs.length
  const verifiedFIRs = firs.filter((f) => f.status === "verified").length
  const pendingFIRs = firs.filter((f) => f.status === "pending" || f.status === "under-verification").length
  const verificationRate = totalFIRs > 0 ? Math.round((verifiedFIRs / totalFIRs) * 100) : 0

  const recentFIRs = firs.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("admin.dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("admin.dashboard.desc")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title={t("admin.dashboard.statsTotal")} value={loading ? "..." : totalFIRs} icon={FileText} description={t("admin.dashboard.statsTotalDesc")} />
        <StatsCard title={t("admin.dashboard.statsVerified")} value={loading ? "..." : verifiedFIRs} icon={CheckCircle} description={t("admin.dashboard.statsVerifiedDesc")} />
        <StatsCard title={t("admin.dashboard.statsPending")} value={loading ? "..." : pendingFIRs} icon={Clock} description={t("admin.dashboard.statsPendingDesc")} />
        <StatsCard title={t("admin.dashboard.statsRate")} value={loading ? "..." : `${verificationRate}%`} icon={TrendingUp} description={t("admin.dashboard.statsRateDesc")} />
      </div>

      {/* On-chain registry count */}
      {onChainCount !== null && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <Blocks className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold text-foreground">{onChainCount}</span>
            <span className="text-muted-foreground ml-1">
              FIR{onChainCount !== 1 ? "s" : ""} {t("admin.dashboard.onChainAnchored")}
            </span>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("admin.dashboard.recentFIRs")}</CardTitle>
              <CardDescription>{t("admin.dashboard.recentFIRsDesc")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/admin/all-firs">
                {t("admin.dashboard.viewAll")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-4 text-muted-foreground">{t("common.loading")}</p>
            ) : (
              <div className="space-y-3">
                {recentFIRs.map((fir) => (
                  <div key={fir.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm">{fir.id}</span>
                        <StatusBadge status={fir.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">{fir.citizenName}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(fir.filedDate).toLocaleDateString("en-IN")}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("admin.dashboard.blockchainActivity")}</CardTitle>
              <CardDescription>{t("admin.dashboard.blockchainActivityDesc")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/admin/logs">
                {t("admin.dashboard.viewAll")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("admin.dashboard.noOnChainEvents")}
              </p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log, i) => (
                  <div key={`${log.txHash}-${i}`} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                    <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${log.event === "FIRCreated" ? "bg-primary" : log.event === "FIRVerified" ? "bg-success" : "bg-amber-500"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {log.event === "StatusUpdated" && log.extra?.status
                            ? `Status → ${log.extra.status}`
                            : log.event}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {log.timestamp
                            ? new Date(log.timestamp * 1000).toLocaleTimeString("en-IN")
                            : `Block #${log.blockNumber}`}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{log.firId}</p>
                      <p className="text-xs text-muted-foreground truncate font-mono">{log.txHash.slice(0, 24)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
