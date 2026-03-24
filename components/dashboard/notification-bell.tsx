"use client"

import { Bell, CheckCheck, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { useNotifications } from "@/hooks/use-notifications"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n/language-context"

const typeIcon: Record<string, string> = {
  status_change: "🔄",
  appeal_submitted: "↩️",
  evidence_added: "📎",
  note_added: "📝",
  fir_filed: "📋",
}

export function NotificationBell() {
  const { user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(user?.id, user?.role)
  const { t } = useLanguage()

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">{t("notifications.title")}</p>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={markAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("notifications.none")}
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-secondary/50 transition-colors",
                  !n.read && "bg-primary/5"
                )}
                onClick={() => !n.read && markAsRead(n.id)}
              >
                <span className="text-base flex-shrink-0 mt-0.5">{typeIcon[n.type] ?? "🔔"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-medium leading-tight", !n.read ? "text-foreground" : "text-muted-foreground")}>
                      {n.title}
                    </p>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground font-mono">
                      {new Date(n.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                    <Link
                      href={`/dashboard/citizen/my-firs/${n.firId}`}
                      className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t("notifications.view")} <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
