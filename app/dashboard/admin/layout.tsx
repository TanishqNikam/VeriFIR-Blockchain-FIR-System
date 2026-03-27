"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardSidebar, type NavItem } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { LayoutDashboard, FileText, Link as LinkIcon, BarChart3, Users } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { useAuth } from "@/lib/auth-context"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useLanguage()
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace("/login")
    } else if (user?.role !== "admin") {
      router.replace(`/dashboard/${user?.role}`)
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
  if (!isAuthenticated || user?.role !== "admin") return null

  const navItems: NavItem[] = [
    { label: t("sidebar.adminNav.dashboard"), href: "/dashboard/admin", icon: LayoutDashboard },
    { label: t("sidebar.adminNav.allFirs"), href: "/dashboard/admin/all-firs", icon: FileText },
    { label: "User Management", href: "/dashboard/admin/users", icon: Users },
    { label: t("sidebar.adminNav.blockchainLogs"), href: "/dashboard/admin/logs", icon: LinkIcon },
    { label: t("sidebar.adminNav.reports"), href: "/dashboard/admin/reports", icon: BarChart3 },
  ]

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        navItems={navItems}
        roleLabel={t("auth.adminAuditor")}
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
