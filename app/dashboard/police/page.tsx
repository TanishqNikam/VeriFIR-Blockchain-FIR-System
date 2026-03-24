"use client"

import Link from "next/link"
import { Clock, CheckCircle, FileText, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/dashboard/stats-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useFIRs } from "@/hooks/use-firs"
import { useLanguage } from "@/lib/i18n/language-context"

export default function PoliceDashboardPage() {
  const { firs, loading } = useFIRs()
  const { t } = useLanguage()

  const pendingFIRs = firs.filter((f) => f.status === "pending" || f.status === "under-verification")
  const verifiedFIRs = firs.filter((f) => f.status === "verified")
  const recentPending = pendingFIRs.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("police.dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("police.dashboard.desc")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard title={t("police.dashboard.statsPending")} value={loading ? "..." : pendingFIRs.length} icon={Clock} description={t("police.dashboard.statsPendingDesc")} />
        <StatsCard title={t("police.dashboard.statsVerified")} value={loading ? "..." : verifiedFIRs.length} icon={CheckCircle} description={t("police.dashboard.statsVerifiedDesc")} />
        <StatsCard title={t("police.dashboard.statsTotal")} value={loading ? "..." : firs.length} icon={FileText} description={t("police.dashboard.statsTotalDesc")} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("police.dashboard.cardTitle")}</CardTitle>
            <CardDescription>{t("police.dashboard.cardDesc")}</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard/police/pending">
              {t("police.dashboard.viewAll")} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p>
          ) : recentPending.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{t("police.dashboard.noPending")}</p>
              <p className="text-sm">{t("police.dashboard.allProcessed")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPending.map((fir) => (
                <div key={fir.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{fir.id}</span>
                      <StatusBadge status={fir.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{fir.title}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{t("common.citizen")}: {fir.citizenName}</span>
                      <span>{t("police.dashboard.filed")} {new Date(fir.filedDate).toLocaleDateString("en-IN")}</span>
                    </div>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/dashboard/police/pending/${fir.id}`}>{t("common.review")}</Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
