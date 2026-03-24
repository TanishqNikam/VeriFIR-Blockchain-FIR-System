"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, CheckCircle, XCircle, Shield, Loader2, Hash, FileText, AlertCircle, ShieldCheck, ShieldAlert, ChevronDown } from "lucide-react"
import { StatusBadge } from "@/components/dashboard/status-badge"
import type { FIR } from "@/lib/types"
import { useLanguage } from "@/lib/i18n/language-context"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

type VerificationResult = {
  success: boolean
  fir?: FIR & { computedHash?: string; integrityVerified?: boolean; chainVerified?: boolean }
  hashMatch?: boolean
  chainVerified?: boolean
  message: string
}

export default function VerifyFIRPage() {
  const [searchValue, setSearchValue] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [showTechDetails, setShowTechDetails] = useState(false)
  const { t } = useLanguage()

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchValue.trim()) return

    setIsVerifying(true)
    setResult(null)

    try {
      const trimmed = searchValue.trim()
      let data: (FIR & { computedHash?: string; integrityVerified?: boolean; chainVerified?: boolean }) | null = null

      // Try by FIR ID first, then by txHash
      if (trimmed.toUpperCase().startsWith("FIR-")) {
        const res = await fetch(`/api/fir/${encodeURIComponent(trimmed)}`)
        if (res.ok) data = await res.json()
      } else {
        const res = await fetch(`/api/fir?txHash=${encodeURIComponent(trimmed)}&limit=1`)
        if (res.ok) {
          const json = await res.json()
          if (json.firs?.length > 0) {
            // Fetch full details with hash verification
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
          message: hashMatch
            ? "FIR data integrity verified successfully."
            : "Warning: Hash mismatch detected. Data may have been altered.",
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
        <h1 className="text-2xl font-bold text-foreground">{t("citizen.verify.title")}</h1>
        <p className="text-muted-foreground">{t("citizen.verify.desc")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("citizen.verify.cardTitle")}</CardTitle>
          <CardDescription>{t("citizen.verify.cardDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">{t("citizen.verify.inputLabel")}</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder={t("citizen.verify.inputPlaceholder")}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit" disabled={isVerifying || !searchValue.trim()}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("citizen.verify.verifying")}
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      {t("citizen.verify.verifyBtn")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Verification Result */}
          {result && (
            <div className="mt-6">
              {result.success && result.fir ? (
                <div className="space-y-4">
                  {/* Status Banner */}
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
                        {result.hashMatch ? t("citizen.verify.successTitle") : t("citizen.verify.warningTitle")}
                      </p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                    </div>
                  </div>

                  {/* FIR Details */}
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

                    <div className="p-4 space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground">{t("fir.filedBy")}</p>
                          <p className="text-sm font-medium text-foreground">{result.fir.citizenName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t("fir.filedDate")}</p>
                          <p className="text-sm font-medium text-foreground">{new Date(result.fir.filedDate).toLocaleDateString("en-IN")}</p>
                        </div>
                        {result.fir.policeVerifierName && (
                          <div>
                            <p className="text-xs text-muted-foreground">{t("fir.verifiedBy")}</p>
                            <p className="text-sm font-medium text-foreground">{result.fir.policeVerifierName}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">{t("fir.location")}</p>
                          <p className="text-sm font-medium text-foreground">{result.fir.location}</p>
                        </div>
                      </div>

                      {/* Integrity summary — plain language */}
                      <div className="pt-4 border-t border-border">
                        <div className={`flex items-start gap-3 rounded-lg p-3 ${result.hashMatch ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"}`}>
                          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${result.hashMatch ? "bg-success/20" : "bg-destructive/20"}`}>
                            {result.hashMatch
                              ? <ShieldCheck className="h-5 w-5 text-success" />
                              : <ShieldAlert className="h-5 w-5 text-destructive" />}
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${result.hashMatch ? "text-success" : "text-destructive"}`}>
                              {result.hashMatch ? "FIR is authentic and unmodified" : "Warning: FIR data may have been altered"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {result.hashMatch
                                ? "The content of this FIR exactly matches what was recorded on the blockchain at the time of submission."
                                : "The current data does not match the original blockchain record. Contact the police station for clarification."}
                            </p>
                            {result.chainVerified === true && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <CheckCircle className="h-3.5 w-3.5 text-success" />
                                <span className="text-xs text-success">Confirmed on blockchain</span>
                              </div>
                            )}
                            {result.chainVerified === false && (
                              <div className="flex items-center gap-1.5 mt-2">
                                <XCircle className="h-3.5 w-3.5 text-destructive" />
                                <span className="text-xs text-destructive">Not found on blockchain</span>
                              </div>
                            )}
                            {/* chainVerified === null means node unreachable — show nothing */}
                          </div>
                        </div>

                        {/* Technical proof — hidden by default */}
                        <Collapsible open={showTechDetails} onOpenChange={setShowTechDetails}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground mt-3 h-8">
                              View cryptographic proof
                              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTechDetails ? "rotate-180" : ""}`} />
                            </Button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-2 pt-2">
                            <p className="text-xs text-muted-foreground">For auditors, lawyers, and courts to independently verify integrity.</p>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("fir.storedHash")}</p>
                              <code className="block rounded bg-secondary px-2 py-1 text-xs break-all mt-1">{result.fir.storedHash}</code>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t("fir.computedHash")}</p>
                              <code className="block rounded bg-secondary px-2 py-1 text-xs break-all mt-1">{result.fir.computedHash || t("common.notComputed")}</code>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              {result.hashMatch
                                ? <><CheckCircle className="h-3.5 w-3.5 text-success" /><span className="text-xs text-success">{t("fir.hashMatchLong")}</span></>
                                : <><XCircle className="h-3.5 w-3.5 text-destructive" /><span className="text-xs text-destructive">{t("fir.hashMismatchLong")}</span></>}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                  <XCircle className="h-6 w-6 text-destructive flex-shrink-0" />
                  <div>
                    <p className="font-medium text-destructive">{t("citizen.verify.notFound")}</p>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("citizen.verify.howTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
                <span className="text-lg font-bold text-primary">1</span>
              </div>
              <p className="text-sm font-medium text-foreground">{t("citizen.verify.step1Title")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("citizen.verify.step1Desc")}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
                <span className="text-lg font-bold text-primary">2</span>
              </div>
              <p className="text-sm font-medium text-foreground">{t("citizen.verify.step2Title")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("citizen.verify.step2Desc")}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-secondary/50">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mb-3">
                <span className="text-lg font-bold text-primary">3</span>
              </div>
              <p className="text-sm font-medium text-foreground">{t("citizen.verify.step3Title")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("citizen.verify.step3Desc")}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
