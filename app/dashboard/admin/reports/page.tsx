"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, PieChart, TrendingUp, FileText, Clock, MapPin } from "lucide-react"
import { useFIRs } from "@/hooks/use-firs"
import { useLanguage } from "@/lib/i18n/language-context"

export default function ReportsPage() {
  const { firs, loading } = useFIRs()
  const { t } = useLanguage()

  const totalFIRs = firs.length
  const verifiedFIRs = firs.filter((f) => f.status === "verified").length
  const pendingFIRs = firs.filter((f) => f.status === "pending").length
  const underVerificationFIRs = firs.filter((f) => f.status === "under-verification").length

  const verificationRate = totalFIRs > 0 ? Math.round((verifiedFIRs / totalFIRs) * 100) : 0
  const pendingRate = totalFIRs > 0 ? Math.round((pendingFIRs / totalFIRs) * 100) : 0
  const processingRate = totalFIRs > 0 ? Math.round((underVerificationFIRs / totalFIRs) * 100) : 0

  // Average resolution time (filing → verification) for verified FIRs
  const avgResolutionTime = (() => {
    const resolved = firs.filter((f) => f.status === "verified" && f.verifiedAt && f.filedDate)
    if (resolved.length === 0) return null
    const totalMs = resolved.reduce((sum, f) => {
      return sum + (new Date(f.verifiedAt!).getTime() - new Date(f.filedDate).getTime())
    }, 0)
    const avgMs = totalMs / resolved.length
    const avgHours = avgMs / (1000 * 60 * 60)
    if (avgHours < 24) return `${Math.round(avgHours)}${t("admin.reports.hours")}`
    return `${(avgHours / 24).toFixed(1)}${t("admin.reports.days")}`
  })()

  // Jurisdiction (pincode) breakdown
  const jurisdictionData = (() => {
    const map = new Map<string, number>()
    for (const fir of firs) {
      const key = fir.pincode || "Unknown"
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([pincode, count]) => ({ pincode, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  })()

  const maxJurisdictionCount = Math.max(...jurisdictionData.map((d) => d.count), 1)

  // Monthly trends for last 6 months
  const monthlyData = (() => {
    const months: { month: string; firs: number; verified: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const label = d.toLocaleString("en-IN", { month: "short" })
      const monthFIRs = firs.filter((f) => {
        const fd = new Date(f.filedDate)
        return fd.getFullYear() === d.getFullYear() && fd.getMonth() === d.getMonth()
      })
      months.push({
        month: label,
        firs: monthFIRs.length,
        verified: monthFIRs.filter((f) => f.status === "verified").length,
      })
    }
    return months
  })()

  const maxFIRs = Math.max(...monthlyData.map((d) => d.firs), 1)

  const firsWithEvidence = firs.filter((f) => f.evidenceFiles.length > 0).length
  const totalEvidenceFiles = firs.reduce((acc, f) => acc + f.evidenceFiles.length, 0)

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">{t("admin.reports.loading")}</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("admin.reports.title")}</h1>
        <p className="text-muted-foreground">{t("admin.reports.desc")}</p>
      </div>

      {/* Status Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              {t("admin.reports.statusDist")}
            </CardTitle>
            <CardDescription>{t("admin.reports.statusDistDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="relative h-48 w-48">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="currentColor"
                    strokeWidth="20"
                    strokeDasharray={`${verificationRate * 2.51} 251`}
                    className="text-success"
                  />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="currentColor"
                    strokeWidth="20"
                    strokeDasharray={`${pendingRate * 2.51} 251`}
                    strokeDashoffset={`${-verificationRate * 2.51}`}
                    className="text-warning"
                  />
                  <circle
                    cx="50" cy="50" r="40" fill="none" stroke="currentColor"
                    strokeWidth="20"
                    strokeDasharray={`${processingRate * 2.51} 251`}
                    strokeDashoffset={`${-(verificationRate + pendingRate) * 2.51}`}
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">{totalFIRs}</span>
                  <span className="text-sm text-muted-foreground">{t("admin.reports.totalFIRs")}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="h-3 w-3 rounded-full bg-success" />
                  <span className="text-sm font-medium text-foreground">{verifiedFIRs}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("admin.reports.verified")}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="h-3 w-3 rounded-full bg-warning" />
                  <span className="text-sm font-medium text-foreground">{pendingFIRs}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("admin.reports.pending")}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-foreground">{underVerificationFIRs}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("admin.reports.processing")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t("admin.reports.verificationMetrics")}
            </CardTitle>
            <CardDescription>{t("admin.reports.kpiDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{t("admin.reports.overallRate")}</span>
                <span className="text-sm font-bold text-success">{verificationRate}%</span>
              </div>
              <div className="h-3 rounded-full bg-secondary">
                <div className="h-full rounded-full bg-success transition-all" style={{ width: `${verificationRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{t("admin.reports.pendingQueue")}</span>
                <span className="text-sm font-bold text-warning">{pendingRate}%</span>
              </div>
              <div className="h-3 rounded-full bg-secondary">
                <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${pendingRate}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{t("admin.reports.underProcessing")}</span>
                <span className="text-sm font-bold text-primary">{processingRate}%</span>
              </div>
              <div className="h-3 rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${processingRate}%` }} />
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{verifiedFIRs}</p>
                  <p className="text-xs text-muted-foreground">{t("admin.reports.firsVerified")}</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{pendingFIRs + underVerificationFIRs}</p>
                  <p className="text-xs text-muted-foreground">{t("admin.reports.inProgress")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            {t("admin.reports.monthlyTrends")}
          </CardTitle>
          <CardDescription>{t("admin.reports.monthlyDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-4 pt-8">
            {monthlyData.map((data) => (
              <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1" style={{ height: "200px" }}>
                  <div
                    className="w-full bg-primary/20 rounded-t transition-all"
                    style={{ height: `${(data.firs / maxFIRs) * 100}%`, marginTop: "auto" }}
                  >
                    {data.firs > 0 && (
                      <div
                        className="w-full bg-primary rounded-t transition-all"
                        style={{ height: `${(data.verified / data.firs) * 100}%`, marginTop: "auto" }}
                      />
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-foreground">{data.firs}</p>
                  <p className="text-xs text-muted-foreground">{data.month}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-6 pt-4 border-t border-border mt-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-primary" />
              <span className="text-xs text-muted-foreground">{t("admin.reports.verifiedFIRs")}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-primary/20" />
              <span className="text-xs text-muted-foreground">{t("admin.reports.totalFIRsLabel")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jurisdiction Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t("admin.reports.jurisdictionBreakdown")}
          </CardTitle>
          <CardDescription>{t("admin.reports.jurisdictionBreakdownDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {jurisdictionData.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">{t("admin.reports.noJurisdictionData")}</p>
          ) : (
            <div className="space-y-3">
              {jurisdictionData.map(({ pincode, count }) => (
                <div key={pincode} className="flex items-center gap-4">
                  <span className="w-20 text-sm font-mono text-foreground shrink-0">{pincode}</span>
                  <div className="flex-1 h-6 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-all"
                      style={{ width: `${(count / maxJurisdictionCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-sm font-medium text-foreground text-right shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalFIRs}</p>
                <p className="text-sm text-muted-foreground">{t("admin.reports.totalFIRsFiled")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{verificationRate}%</p>
                <p className="text-sm text-muted-foreground">{t("admin.reports.verificationRate")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{avgResolutionTime ?? "—"}</p>
                <p className="text-sm text-muted-foreground">{t("admin.reports.avgResolutionTime")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <BarChart3 className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalEvidenceFiles}</p>
                <p className="text-sm text-muted-foreground">{t("admin.reports.evidenceFiles")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
