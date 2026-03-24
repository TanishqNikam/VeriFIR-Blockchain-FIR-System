"use client"

import { cn } from "@/lib/utils"
import type { FIRStatus } from "@/lib/types"
import { useLanguage } from "@/lib/i18n/language-context"

interface StatusBadgeProps {
  status: FIRStatus
  className?: string
}

const statusClass: Record<FIRStatus, string> = {
  pending: "bg-warning/10 text-warning-foreground border-warning/20",
  "under-verification": "bg-primary/10 text-primary border-primary/20",
  verified: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
}

const statusKey: Record<FIRStatus, string> = {
  pending: "status.pending",
  "under-verification": "status.underVerification",
  verified: "status.verified",
  rejected: "status.rejected",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { t } = useLanguage()

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        statusClass[status],
        className
      )}
    >
      {t(statusKey[status])}
    </span>
  )
}
