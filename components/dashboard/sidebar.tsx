"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Shield, LogOut, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface DashboardSidebarProps {
  navItems: NavItem[]
  roleLabel: string
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export function DashboardSidebar({ navItems, roleLabel, mobileOpen, onMobileClose }: DashboardSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const { t } = useLanguage()

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={onMobileClose} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Shield className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold">VeriFIR</span>
          </Link>
          <button className="lg:hidden p-1 hover:bg-sidebar-accent rounded" onClick={onMobileClose} aria-label="Close sidebar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="text-xs text-sidebar-foreground/60 uppercase tracking-wider">{t("sidebar.loggedInAs")}</div>
          <div className="mt-1 font-medium text-sm">{user?.name || "User"}</div>
          <div className="text-xs text-sidebar-foreground/60">{roleLabel}</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onMobileClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleLogout}>
            <LogOut className="mr-3 h-5 w-5" />
            {t("sidebar.logout")}
          </Button>
        </div>
      </aside>
    </>
  )
}
