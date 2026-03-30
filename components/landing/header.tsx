"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield, Menu, X } from "lucide-react"
import { useState } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"
import { useLanguage } from "@/lib/i18n/language-context"
import { useAuth } from "@/lib/auth-context"

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useLanguage()
  const { user } = useAuth()

  const dashboardHref = user
    ? user.role === "admin"
      ? "/dashboard/admin"
      : user.role === "police"
      ? "/dashboard/police"
      : "/dashboard/citizen"
    : "/login"

  return (
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

          {/* Center — nav links */}
          <nav className="hidden md:flex items-center justify-center gap-6">
            <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.features")}
            </Link>
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.howItWorks")}
            </Link>
            <Link href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.about")}
            </Link>
          </nav>

          {/* Right — actions */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" asChild className="hidden md:inline-flex">
              <Link href={dashboardHref}>{user ? "Dashboard" : t("nav.login")}</Link>
            </Button>
            <Button asChild className="hidden md:inline-flex">
              <Link href="/verify">{t("nav.verifyFir")}</Link>
            </Button>
            <span className="hidden md:inline-flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </span>
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-3">
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-1">
                {t("nav.features")}
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-1">
                {t("nav.howItWorks")}
              </Link>
              <Link href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground px-2 py-1">
                {t("nav.about")}
              </Link>
              <div className="flex flex-col gap-2 pt-3 border-t border-border">
                <div className="flex items-center gap-2 px-2">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
                <Button variant="ghost" asChild className="justify-start">
                  <Link href={dashboardHref}>{user ? "Dashboard" : t("nav.login")}</Link>
                </Button>
                <Button asChild>
                  <Link href="/verify">{t("nav.verifyFir")}</Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
