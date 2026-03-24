"use client"

import Link from "next/link"
import { FileText, CheckCircle, TrendingUp, Clock, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/dashboard/stats-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useFIRs } from "@/hooks/use-firs"
import { mockBlockchainLogs } from "@/lib/mock-data"
import { useLanguage } from "@/lib/i18n/language-context"

export default function AdminDashboardPage() {
  const { firs, loading } = useFIRs()
  const { t } = useLanguage()

  const totalFIRs = firs.length
  const verifiedFIRs = firs.filter((f) => f.status === "verified").length
  const pendingFIRs = firs.filter((f) => f.status === "pending" || f.status === "under-verification").length
  const verificationRate = totalFIRs > 0 ? Math.round((verifiedFIRs / totalFIRs) * 100) : 0

  const recentFIRs = firs.slice(0, 5)
  const recentLogs = mockBlockchainLogs.slice(0, 5)

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
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className={`mt-0.5 h-2 w-2 rounded-full flex-shrink-0 ${log.event === "FIRCreated" ? "bg-primary" : log.event === "FIRVerified" ? "bg-success" : "bg-warning"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{log.event}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString("en-IN")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{log.firId}</p>
                    <p className="text-xs text-muted-foreground truncate font-mono">{log.txHash.slice(0, 24)}...</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
