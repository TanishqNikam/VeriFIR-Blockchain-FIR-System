"use client"

import { FileText, ShieldCheck, Database, Eye, Users, Clock } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

export function LandingFeatures() {
  const { t } = useLanguage()

  const features = [
    { icon: FileText, titleKey: "landing.feature1Title", descKey: "landing.feature1Desc" },
    { icon: ShieldCheck, titleKey: "landing.feature2Title", descKey: "landing.feature2Desc" },
    { icon: Database, titleKey: "landing.feature3Title", descKey: "landing.feature3Desc" },
    { icon: Eye, titleKey: "landing.feature4Title", descKey: "landing.feature4Desc" },
    { icon: Users, titleKey: "landing.feature5Title", descKey: "landing.feature5Desc" },
    { icon: Clock, titleKey: "landing.feature6Title", descKey: "landing.feature6Desc" },
  ]

  return (
    <section id="features" className="py-20 sm:py-28 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("landing.featuresTitle")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("landing.featuresDesc")}
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, titleKey, descKey }) => (
            <div key={titleKey} className="relative rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-lg">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{t(titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
