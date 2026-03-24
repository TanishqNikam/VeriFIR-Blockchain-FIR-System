"use client"

import Link from "next/link"
import { FileText, Clock, CheckCircle, FilePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatsCard } from "@/components/dashboard/stats-card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { useAuth } from "@/lib/auth-context"
import { useFIRs } from "@/hooks/use-firs"
import { useLanguage } from "@/lib/i18n/language-context"

export default function CitizenDashboardPage() {
  const { user } = useAuth()
  const { firs: myFIRs, loading } = useFIRs({ citizenId: user?.id })
  const { t } = useLanguage()

  const totalFIRs = myFIRs.length
  const pendingFIRs = myFIRs.filter((f) => f.status === "pending" || f.status === "under-verification").length
  const verifiedFIRs = myFIRs.filter((f) => f.status === "verified").length
  const recentFIRs = myFIRs.slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("citizen.dashboard.title")}</h1>
          <p className="text-muted-foreground">{t("citizen.dashboard.desc")}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/citizen/file-fir">
            <FilePlus className="mr-2 h-4 w-4" />
            {t("citizen.dashboard.fileNew")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard title={t("citizen.dashboard.statsTotal")} value={loading ? "..." : totalFIRs} icon={FileText} description={t("citizen.dashboard.statsAllTime")} />
        <StatsCard title={t("citizen.dashboard.statsProcessing")} value={loading ? "..." : pendingFIRs} icon={Clock} description={t("citizen.dashboard.statsProcessingDesc")} />
        <StatsCard title={t("citizen.dashboard.statsVerified")} value={loading ? "..." : verifiedFIRs} icon={CheckCircle} description={t("citizen.dashboard.statsVerifiedDesc")} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("citizen.dashboard.recentFIRs")}</CardTitle>
          <CardDescription>{t("citizen.dashboard.recentDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">{t("common.loading")}</p>
          ) : recentFIRs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{t("citizen.dashboard.noFIRs")}</p>
              <Button asChild className="mt-4 bg-transparent" variant="outline">
                <Link href="/dashboard/citizen/file-fir">{t("citizen.dashboard.fileFirst")}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentFIRs.map((fir) => (
                <div key={fir.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{fir.id}</span>
                      <StatusBadge status={fir.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">{fir.title}</p>
                    <p className="text-xs text-muted-foreground">{t("citizen.dashboard.filed")} {new Date(fir.filedDate).toLocaleDateString("en-IN")}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/citizen/my-firs/${fir.id}`}>{t("common.view")}</Link>
                  </Button>
                </div>
              ))}
              <div className="pt-2">
                <Button variant="ghost" asChild className="w-full">
                  <Link href="/dashboard/citizen/my-firs">{t("citizen.dashboard.viewAll")}</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
