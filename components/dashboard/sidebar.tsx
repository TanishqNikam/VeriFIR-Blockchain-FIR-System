"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Shield, LogOut, X, KeyRound, Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import type { LucideIcon } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

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
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const { toast } = useToast()

  const [showChangePw, setShowChangePw] = useState(false)
  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" })
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChangePassword = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      toast({ title: t("auth.validationError"), description: t("sidebar.allFieldsRequired"), variant: "destructive" })
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ title: t("auth.validationError"), description: t("sidebar.passwordsNotMatch"), variant: "destructive" })
      return
    }
    if (pwForm.newPassword.length < 8) {
      toast({ title: t("auth.validationError"), description: t("sidebar.passwordMinLength"), variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: t("sidebar.passwordChanged"), description: t("sidebar.passwordUpdated") })
      setShowChangePw(false)
      setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" })
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed to change password.", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    // Await so the HTTP-only session cookie is cleared on the server BEFORE navigating.
    // Using window.location.href (full-page navigation) ensures the browser sends a
    // fresh request with no cached cookie — prevents middleware from bouncing the user
    // back to the dashboard and causing a blank page.
    await logout()
    window.location.href = "/"
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

        {/* Logout + Change Password */}
        <div className="p-4 border-t border-sidebar-border space-y-1">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setShowChangePw(true)}>
            <KeyRound className="mr-3 h-5 w-5" />
            {t("sidebar.changePassword")}
          </Button>
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={handleLogout}>
            <LogOut className="mr-3 h-5 w-5" />
            {t("sidebar.logout")}
          </Button>
        </div>
      </aside>

      {/* Change Password Dialog */}
      <Dialog open={showChangePw} onOpenChange={(open) => {
        setShowChangePw(open)
        if (!open) setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" })
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("sidebar.changePassword")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{t("sidebar.currentPassword")}</Label>
              <div className="relative">
                <Input
                  type={showOld ? "text" : "password"}
                  value={pwForm.oldPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, oldPassword: e.target.value }))}
                  placeholder={t("sidebar.enterCurrentPassword")}
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showOld ? t("sidebar.hidePassword") : t("sidebar.showPassword")} onClick={() => setShowOld((v) => !v)}>
                  {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("sidebar.newPassword")}</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder={t("sidebar.atLeast8Chars")}
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showNew ? t("sidebar.hidePassword") : t("sidebar.showPassword")} onClick={() => setShowNew((v) => !v)}>
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("sidebar.confirmNewPassword")}</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder={t("sidebar.reEnterNewPassword")}
                  className="pr-10"
                />
                <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" aria-label={showConfirm ? t("sidebar.hidePassword") : t("sidebar.showPassword")} onClick={() => setShowConfirm((v) => !v)}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                <p className="text-xs text-destructive">{t("sidebar.passwordsNotMatch")}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePw(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleChangePassword} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("sidebar.updatePassword")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
