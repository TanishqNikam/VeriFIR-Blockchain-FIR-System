"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Shield, Mail, Loader2, CheckCircle } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n/language-context"

function VerifyEmailForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { t } = useLanguage()

  const emailFromQuery = searchParams.get("email") || ""
  const [otp, setOtp] = useState("")
  const [email, setEmail] = useState(emailFromQuery)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [verified, setVerified] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  const handleVerify = async () => {
    if (!otp.trim() || otp.length !== 6) {
      toast({ title: t("auth.invalidOtp"), description: t("auth.enter6DigitOtp"), variant: "destructive" })
      return
    }
    setIsVerifying(true)
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setVerified(true)
      setTimeout(() => router.push("/login"), 3000)
    } catch (err) {
      toast({
        title: t("auth.verificationFailed"),
        description: err instanceof Error ? err.message : t("auth.verificationFailed"),
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async () => {
    setIsResending(true)
    try {
      const res = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: t("auth.otpSent"), description: t("auth.newOtpSent") })
      setCountdown(60)
    } catch (err) {
      toast({
        title: t("auth.verificationFailed"),
        description: err instanceof Error ? err.message : t("auth.couldNotResend"),
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            {verified ? <CheckCircle className="h-7 w-7 text-success" /> : <Mail className="h-7 w-7 text-primary" />}
          </div>
        </div>
        <CardTitle className="text-2xl">
          {verified ? t("auth.emailVerified") : t("auth.verifyYourEmail")}
        </CardTitle>
        <CardDescription>
          {verified
            ? t("auth.redirectingLogin")
            : t("auth.otpSentDesc")}
        </CardDescription>
      </CardHeader>
      {!verified && (
        <CardContent className="space-y-5">
          {!emailFromQuery && (
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="otp">One-Time Password</Label>
            <Input
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              inputMode="numeric"
              className="text-center text-xl tracking-widest font-mono"
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
            <p className="text-xs text-muted-foreground">Check your inbox and spam folder</p>
          </div>

          <Button className="w-full" onClick={handleVerify} disabled={isVerifying || otp.length !== 6}>
            {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : "Verify Email"}
          </Button>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Didn&apos;t receive the OTP?</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResend}
              disabled={isResending || countdown > 0}
            >
              {isResending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</>
                : countdown > 0
                ? `Resend in ${countdown}s`
                : "Resend OTP"}
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Already verified?{" "}
            <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      )}
    </Card>
  )
}

export default function VerifyEmailPage() {
  const { toast } = useToast()
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid h-16 grid-cols-3 items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Shield className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-semibold text-foreground">VeriFIR</span>
                <span className="ml-1 text-xs text-muted-foreground">India</span>
              </div>
            </Link>
            <div />
            <div className="flex items-center justify-end gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense fallback={<div className="text-muted-foreground">Loading…</div>}>
          <VerifyEmailForm />
        </Suspense>
      </main>
    </div>
  )
}
