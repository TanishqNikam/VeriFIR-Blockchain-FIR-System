"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Lock, Database } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

export function LandingHero() {
  const { t } = useLanguage()

  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>{t("landing.badge")}</span>
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t("landing.heroTitle")}{" "}
            <span className="text-primary">{t("landing.heroTitleHighlight")}</span>{" "}
            {t("landing.heroTitleEnd")}
          </h1>

          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            {t("landing.heroDesc")}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/login?action=file">
                {t("landing.fileFirNow")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="w-full sm:w-auto bg-transparent">
              <Link href="/login">
                {t("landing.loginToDashboard")}
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:mt-20">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground">{t("landing.tamperProof")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.tamperProofDesc")}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Database className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground">{t("landing.ipfsStorage")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.ipfsStorageDesc")}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mt-4 font-semibold text-foreground">{t("landing.verifiable")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("landing.verifiableDesc")}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
