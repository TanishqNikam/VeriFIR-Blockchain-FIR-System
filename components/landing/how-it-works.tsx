"use client"

import { FileEdit, Upload, Link as LinkIcon, CheckCircle } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

export function LandingHow() {
  const { t } = useLanguage()

  const steps = [
    {
      step: 1,
      icon: FileEdit,
      title: t("landing.step1Title"),
      description: t("landing.step1Desc"),
    },
    {
      step: 2,
      icon: Upload,
      title: t("landing.step2Title"),
      description: t("landing.step2Desc"),
    },
    {
      step: 3,
      icon: LinkIcon,
      title: t("landing.step3Title"),
      description: t("landing.step3Desc"),
    },
    {
      step: 4,
      icon: CheckCircle,
      title: t("landing.step4Title"),
      description: t("landing.step4Desc"),
    },
  ]

  return (
    <section id="how-it-works" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("landing.howItWorksTitle")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("landing.howItWorksDesc")}
          </p>
        </div>

        <div className="mt-16 relative">
          {/* Connection line for desktop */}
          <div className="hidden lg:block absolute top-24 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-0.5 bg-border" />

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <div key={item.step} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  {item.step}
                </div>
                <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-xl bg-secondary">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
