"use client"

import { CheckCircle, Clock, XCircle, AlertCircle, Link2 } from "lucide-react"
import type { FIRStatus } from "@/lib/types"
import { useLanguage } from "@/lib/i18n/language-context"

interface OnChainStatusEntry {
  status: string
  updatedBy: string
  timestamp: number // unix seconds
}

interface TimelineStep {
  label: string
  description: string
  timestamp?: string
  blockchainTimestamp?: string // authoritative on-chain timestamp
  blockchainWallet?: string    // wallet address that signed the tx
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
  onChainStatusHistory?: OnChainStatusEntry[] | null
}

export function FIRTimeline({
  status,
  filedDate,
  underVerificationAt,
  verifiedAt,
  rejectionReason,
  appealReason,
  isAppeal,
  onChainStatusHistory,
}: FIRTimelineProps) {
  const { t } = useLanguage()
  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : undefined
  const fmtUnix = (ts?: number) =>
    ts ? new Date(ts * 1000).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : undefined

  // Build a lookup: status → on-chain entry (last match wins for re-entries)
  const chainByStatus = new Map<string, OnChainStatusEntry>()
  if (onChainStatusHistory) {
    for (const entry of onChainStatusHistory) {
      chainByStatus.set(entry.status, entry)
    }
  }

  const steps: TimelineStep[] = [
    {
      label: isAppeal ? t("timeline.firResubmitted") : t("timeline.firFiled"),
      description: isAppeal
        ? `${t("timeline.appealPrefix")} ${appealReason}`
        : t("timeline.firSubmittedDesc"),
      timestamp: fmt(filedDate),
      blockchainTimestamp: fmtUnix(chainByStatus.get("pending")?.timestamp),
      blockchainWallet: chainByStatus.get("pending")?.updatedBy,
      state: "complete",
    },
    {
      label: t("timeline.underReview"),
      description: t("timeline.underReviewDesc"),
      timestamp: fmt(underVerificationAt),
      blockchainTimestamp: fmtUnix(chainByStatus.get("under-verification")?.timestamp),
      blockchainWallet: chainByStatus.get("under-verification")?.updatedBy,
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
          blockchainTimestamp: fmtUnix(
            // "rejected:xxx" entries from reason fingerprint
            [...chainByStatus.entries()]
              .find(([k]) => k.startsWith("rejected"))?.[1]?.timestamp
          ),
          blockchainWallet: [...chainByStatus.entries()]
            .find(([k]) => k.startsWith("rejected"))?.[1]?.updatedBy,
          state: "rejected",
        }
      : {
          label: t("timeline.verified"),
          description: t("timeline.verifiedDesc"),
          timestamp: fmt(verifiedAt),
          blockchainTimestamp: fmtUnix(chainByStatus.get("verified")?.timestamp),
          blockchainWallet: chainByStatus.get("verified")?.updatedBy,
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
            {/* On-chain timestamp — authoritative blockchain record */}
            {step.blockchainTimestamp && (
              <div className="flex items-center gap-1 mt-1.5">
                <Link2 className="h-3 w-3 text-primary flex-shrink-0" />
                <p className="text-xs text-primary font-mono">{step.blockchainTimestamp}</p>
                {step.blockchainWallet && (
                  <p className="text-xs text-muted-foreground font-mono truncate ml-1">
                    {step.blockchainWallet.slice(0, 10)}…
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
