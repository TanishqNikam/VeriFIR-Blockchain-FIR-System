"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar, type NavItem } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { LayoutDashboard, Clock, CheckCircle, Search, FileImage } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { useAuth } from "@/lib/auth-context"

export default function PoliceLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useLanguage()
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/login")
    } else if (user?.role !== "police") {
      router.replace(`/dashboard/${user?.role}`)
    }
  }, [isLoading, isAuthenticated, user, router])

  // Show a neutral loading screen while AuthProvider hydrates from cookie/sessionStorage.
  // Returning null here was causing a blank black page when the server cookie was valid
  // but sessionStorage was empty (e.g. after closing and reopening the tab).
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
  if (!isAuthenticated || user?.role !== "police") return null

  const navItems: NavItem[] = [
    { label: t("sidebar.policeNav.dashboard"), href: "/dashboard/police", icon: LayoutDashboard },
    { label: t("sidebar.policeNav.pendingFirs"), href: "/dashboard/police/pending", icon: Clock },
    { label: t("sidebar.policeNav.verifiedFirs"), href: "/dashboard/police/verified", icon: CheckCircle },
    { label: t("sidebar.policeNav.verifyFir"), href: "/dashboard/police/verify", icon: Search },
    { label: t("sidebar.policeNav.evidenceViewer"), href: "/dashboard/police/evidence", icon: FileImage },
  ]

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        navItems={navItems}
        roleLabel={t("auth.policeOfficer")}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="lg:pl-64">
        <div className="flex flex-col min-h-screen">
          <DashboardHeader title="" onMenuClick={() => setMobileOpen(true)} />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
