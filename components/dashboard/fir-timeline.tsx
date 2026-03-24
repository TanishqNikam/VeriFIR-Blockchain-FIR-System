"use client"

import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react"
import type { FIRStatus } from "@/lib/types"
import { useLanguage } from "@/lib/i18n/language-context"

interface TimelineStep {
  label: string
  description: string
  timestamp?: string
  state: "complete" | "active" | "pending" | "rejected"
}

interface FIRTimelineProps {
  status: FIRStatus
  filedDate: string
  underVerificationAt?: string
  verifiedAt?: string
  rejectionReason?: string
  appealReason?: string
  isAppeal?: boolean
}

export function FIRTimeline({
  status,
  filedDate,
  underVerificationAt,
  verifiedAt,
  rejectionReason,
  appealReason,
  isAppeal,
}: FIRTimelineProps) {
  const { t } = useLanguage()
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : undefined

  const steps: TimelineStep[] = [
    {
      label: isAppeal ? t("timeline.firResubmitted") : t("timeline.firFiled"),
      description: isAppeal
        ? `${t("timeline.appealPrefix")} ${appealReason}`
        : t("timeline.firSubmittedDesc"),
      timestamp: fmt(filedDate),
      state: "complete",
    },
    {
      label: t("timeline.underReview"),
      description: t("timeline.underReviewDesc"),
      timestamp: fmt(underVerificationAt),
      state:
        status === "pending"
          ? "pending"
          : status === "under-verification"
          ? "active"
          : "complete",
    },
    status === "rejected"
      ? {
          label: t("timeline.rejected"),
          description: rejectionReason || t("timeline.rejectedDefault"),
          timestamp: fmt(verifiedAt),
          state: "rejected",
        }
      : {
          label: t("timeline.verified"),
          description: t("timeline.verifiedDesc"),
          timestamp: fmt(verifiedAt),
          state: status === "verified" ? "complete" : "pending",
        },
  ]

  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-4">
          {/* Icon + connector */}
          <div className="flex flex-col items-center">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
              step.state === "complete" ? "bg-success/15 text-success" :
              step.state === "active"   ? "bg-primary/15 text-primary" :
              step.state === "rejected" ? "bg-destructive/15 text-destructive" :
              "bg-secondary text-muted-foreground"
            }`}>
              {step.state === "complete" ? <CheckCircle className="h-4 w-4" /> :
               step.state === "active"   ? <Clock className="h-4 w-4" /> :
               step.state === "rejected" ? <XCircle className="h-4 w-4" /> :
               <AlertCircle className="h-4 w-4 opacity-40" />}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-0.5 flex-1 my-1 min-h-[20px] ${
                step.state === "complete" ? "bg-success/30" : "bg-border"
              }`} />
            )}
          </div>

          {/* Content */}
          <div className="pb-5 min-w-0">
            <p className={`text-sm font-medium ${
              step.state === "pending" ? "text-muted-foreground" : "text-foreground"
            }`}>{step.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.description}</p>
            {step.timestamp && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">{step.timestamp}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
