"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n/language-context"
import { Search, CheckCircle, XCircle, AlertTriangle, Shield, Hash, ArrowLeft, ExternalLink } from "lucide-react"

interface VerifyResult {
  id: string
  title: string
  status: string
  citizenName: string
  location: string
  incidentDate: string
  filedDate: string
  blockchainTxHash: string
  ipfsCid: string
  storedHash: string
  integrityVerified: boolean
  chainVerified: boolean
  policeVerifierName?: string
  verifiedAt?: string
}

export default function PublicVerifyPage() {
  const { t } = useLanguage()
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const handleVerify = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setError(null)
    setResult(null)
    setSearched(true)

    try {
      // Try FIR ID first, then tx hash
      let res = await fetch(`/api/fir/${encodeURIComponent(q)}`)

      if (!res.ok && q.startsWith("0x")) {
        res = await fetch(`/api/fir?txHash=${encodeURIComponent(q)}&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.firs?.length > 0) {
            const firId = data.firs[0].id
            res = await fetch(`/api/fir/${firId}`)
          }
        }
      }

      if (!res.ok) {
        setError(t("verify.notFound"))
        return
      }

      const data = await res.json()
      setResult(data)
    } catch {
      setError(t("verify.failed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav — matches landing page */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid h-16 grid-cols-3 items-center">
            {/* Left — logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-semibold text-foreground">VeriFIR</span>
                <span className="ml-1 text-xs text-muted-foreground">India</span>
              </div>
            </Link>

            {/* Center — empty on this page */}
            <div />

            {/* Right — actions */}
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" asChild>
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">{t("verify.title")}</h1>
          <p className="text-muted-foreground">{t("verify.desc")}</p>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <CardTitle>{t("verify.cardTitle")}</CardTitle>
            <CardDescription>{t("verify.cardDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("verify.placeholder")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleVerify} disabled={loading || !query.trim()}>
                {loading ? t("verify.verifying") : t("verify.verifyBtn")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {searched && error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-3 pt-6">
              <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-4">
            {/* Integrity summary */}
            <Card className={result.integrityVerified
              ? "border-success/50 bg-success/5"
              : "border-destructive/50 bg-destructive/5"
            }>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {result.integrityVerified ? (
                    <CheckCircle className="h-8 w-8 text-success flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-8 w-8 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold text-foreground text-lg">
                      {result.integrityVerified ? t("verify.authentic") : t("verify.dataFailure")}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2">
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {result.integrityVerified
                          ? <CheckCircle className="h-4 w-4 text-success" />
                          : <XCircle className="h-4 w-4 text-destructive" />}
                        {t("verify.dataHashMatch")}
                      </span>
                      {result.chainVerified === true && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-success" />
                          {t("verify.onChainVerification")}
                        </span>
                      )}
                      {result.chainVerified === false && (
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <XCircle className="h-4 w-4 text-destructive" />
                          {t("verify.onChainVerification")}
                        </span>
                      )}
                      {/* chainVerified === null means node unreachable — omit the indicator */}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FIR details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{result.id}</CardTitle>
                    <CardDescription className="mt-1">{result.title}</CardDescription>
                  </div>
                  <StatusBadge status={result.status as "pending" | "under-verification" | "verified" | "rejected"} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">{t("verify.filedBy")}</p>
                    <p className="text-foreground">{result.citizenName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">{t("verify.location")}</p>
                    <p className="text-foreground">{result.location}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">{t("verify.incidentDate")}</p>
                    <p className="text-foreground">{new Date(result.incidentDate).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs font-medium">{t("verify.filedDate")}</p>
                    <p className="text-foreground">{new Date(result.filedDate).toLocaleDateString("en-IN")}</p>
                  </div>
                  {result.policeVerifierName && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">{t("verify.verifiedBy")}</p>
                      <p className="text-foreground">{result.policeVerifierName}</p>
                    </div>
                  )}
                  {result.verifiedAt && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium">{t("verify.verifiedOn")}</p>
                      <p className="text-foreground">{new Date(result.verifiedAt).toLocaleDateString("en-IN")}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Blockchain record */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Hash className="h-4 w-4" />
                  {t("verify.blockchainRecord")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: t("verify.transactionHash"), value: result.blockchainTxHash, link: `https://sepolia.etherscan.io/tx/${result.blockchainTxHash}` },
                  { label: "IPFS CID", value: result.ipfsCid, link: `https://gateway.pinata.cloud/ipfs/${result.ipfsCid}` },
                  { label: t("verify.dataHash"), value: result.storedHash },
                ].map(({ label, value, link }) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs break-all rounded bg-secondary px-2 py-1.5">{value}</code>
                      {link && (
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex items-center justify-center">
              <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                {t("verify.backToHome")}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
