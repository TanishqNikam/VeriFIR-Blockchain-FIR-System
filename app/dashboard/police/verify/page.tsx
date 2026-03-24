"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, CheckCircle, XCircle, Shield, Loader2, Hash, FileText, AlertCircle } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { FIR } from "@/lib/types"
import Link from "next/link"
import { useLanguage } from "@/lib/i18n/language-context"

type VerificationResult = {
  success: boolean
  fir?: FIR & { computedHash?: string; integrityVerified?: boolean; chainVerified?: boolean }
  hashMatch?: boolean
  chainVerified?: boolean
  message: string
}

export default function PoliceVerifyPage() {
  const [searchValue, setSearchValue] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const { t } = useLanguage()

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchValue.trim()) return

    setIsVerifying(true)
    setResult(null)

    try {
      const trimmed = searchValue.trim()
      let data: (FIR & { computedHash?: string; integrityVerified?: boolean; chainVerified?: boolean }) | null = null

      if (trimmed.toUpperCase().startsWith("FIR-")) {
        const res = await fetch(`/api/fir/${encodeURIComponent(trimmed)}`)
        if (res.ok) data = await res.json()
      } else {
        const res = await fetch(`/api/fir?txHash=${encodeURIComponent(trimmed)}&limit=1`)
        if (res.ok) {
          const json = await res.json()
          if (json.firs?.length > 0) {
            const detail = await fetch(`/api/fir/${encodeURIComponent(json.firs[0].id)}`)
            if (detail.ok) data = await detail.json()
          }
        }
      }

      if (data) {
        const hashMatch = data.integrityVerified ?? (data.storedHash === data.computedHash)
        setResult({
          success: true,
          fir: data,
          hashMatch,
          chainVerified: data.chainVerified,
          message: hashMatch ? "FIR data integrity verified successfully." : "Warning: Hash mismatch detected.",
        })
      } else {
        setResult({
          success: false,
          message: "No FIR found with the provided ID or transaction hash.",
        })
      }
    } catch {
      setResult({
        success: false,
        message: "Verification failed. Please check your connection and try again.",
      })
    }

    setIsVerifying(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("police.verify.title")}</h1>
        <p className="text-muted-foreground">{t("police.verify.desc")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("police.verify.cardTitle")}</CardTitle>
          <CardDescription>{t("police.verify.cardDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">{t("police.verify.inputLabel")}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={t("police.verify.inputPlaceholder")}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" disabled={isVerifying || !searchValue.trim()}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("police.verify.verifying")}
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      {t("police.verify.verifyBtn")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {result && (
            <div className="mt-6">
              {result.success && result.fir ? (
                <div className="space-y-4">
                  <div
                    className={`flex items-center gap-3 rounded-lg p-4 ${
                      result.hashMatch ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"
                    }`}
                  >
                    {result.hashMatch ? (
                      <CheckCircle className="h-6 w-6 text-success flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                    )}
                    <div>
                      <p className={`font-medium ${result.hashMatch ? "text-success" : "text-destructive"}`}>
                        {result.hashMatch ? t("police.verify.successTitle") : t("police.verify.warningTitle")}
                      </p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-foreground">{result.fir.id}</p>
                            <p className="text-sm text-muted-foreground">{result.fir.title}</p>
                          </div>
                        </div>
                        <StatusBadge status={result.fir.status} />
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">{t("police.verify.citizenLabel")}</p>
                          <p className="text-sm font-medium text-foreground">{result.fir.citizenName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t("police.verify.filedDate")}</p>
                          <p className="text-sm font-medium text-foreground">{new Date(result.fir.filedDate).toLocaleDateString("en-IN")}</p>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border">
                        <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          {t("fir.hashComparisonLabel")}
                        </p>
                        <div className="space-y-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">{t("fir.stored")} <code className="bg-secondary px-1 rounded">{result.fir.storedHash.slice(0, 32)}...</code></p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t("fir.computed")} <code className="bg-secondary px-1 rounded">{(result.fir.computedHash || result.fir.storedHash).slice(0, 32)}...</code></p>
                          </div>
                          <div className="flex items-center gap-1 pt-1">
                            {result.hashMatch ? (
                              <><CheckCircle className="h-3.5 w-3.5 text-success" /><span className="text-success">{t("fir.integrityVerified")}</span></>
                            ) : (
                              <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-destructive">{t("fir.integrityFailed")}</span></>
                            )}
                          </div>
                          {result.chainVerified === true && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3.5 w-3.5 text-success" />
                              <span className="text-success">{t("fir.chainMatch")}</span>
                            </div>
                          )}
                          {result.chainVerified === false && (
                            <div className="flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5 text-destructive" />
                              <span className="text-destructive">{t("fir.chainMismatch")}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {result.fir.status !== "verified" && (
                        <div className="pt-3">
                          <Button asChild size="sm">
                            <Link href={`/dashboard/police/pending/${result.fir.id}`}>{t("police.verify.reviewVerify")}</Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <XCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">{t("police.verify.notFound")}</p>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
