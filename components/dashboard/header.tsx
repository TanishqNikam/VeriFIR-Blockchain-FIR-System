"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NotificationBell } from "@/components/dashboard/notification-bell"
import { ThemeToggle } from "@/components/theme-toggle"
import { LanguageToggle } from "@/components/language-toggle"

interface DashboardHeaderProps {
  title: string
  onMenuClick?: () => void
}

export function DashboardHeader({ title, onMenuClick }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="h-5 w-5" />
      </Button>
      <h1 className="flex-1 text-xl font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </header>
  )
}
