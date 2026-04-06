"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Search, ExternalLink, Copy, RefreshCw, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/lib/i18n/language-context"

type EventType = "FIRCreated" | "FIRVerified" | "StatusUpdated" | "all"
type DataSource = "blockchain" | "database" | "unavailable"

interface BlockchainEvent {
  id: string
  event: "FIRCreated" | "FIRVerified" | "StatusUpdated"
  firId: string
  txHash: string
  walletAddress: string
  timestamp?: number
  blockNumber: number
  extra?: Record<string, string>
}

export default function BlockchainLogsPage() {
  const { toast } = useToast()
  const { t } = useLanguage()

  const [events, setEvents] = useState<BlockchainEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [source, setSource] = useState<DataSource>("blockchain")
  const [searchQuery, setSearchQuery] = useState("")
  const [eventFilter, setEventFilter] = useState<EventType>("all")

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/blockchain-events?limit=200")
      const data = await res.json()
      const mapped = (data.events ?? []).map(
        (e: BlockchainEvent, i: number) => ({ ...e, id: `${e.txHash}-${i}` })
      )
      setEvents(mapped)
      setSource(data.source)
    } catch {
      setSource("unavailable")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const filteredEvents = events.filter((log) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (log.firId ?? "").toLowerCase().includes(q) ||
      (log.txHash ?? "").toLowerCase().includes(q) ||
      (log.walletAddress ?? "").toLowerCase().includes(q)
    const matchesEvent = eventFilter === "all" || log.event === eventFilter
    return matchesSearch && matchesEvent
  })

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement("textarea")
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    toast({ title: "Copied", description: `${label} copied to clipboard.` })
  }

  const getEventColor = (event: string) => {
    switch (event) {
      case "FIRCreated":    return "bg-primary"
      case "FIRVerified":   return "bg-success"
      case "StatusUpdated": return "bg-amber-500"
      default:              return "bg-muted"
    }
  }

  const getEventBadgeStyle = (event: string) => {
    switch (event) {
      case "FIRCreated":    return "bg-primary/10 text-primary border-primary/20"
      case "FIRVerified":   return "bg-success/10 text-success border-success/20"
      case "StatusUpdated": return "bg-amber-500/10 text-amber-600 border-amber-500/20"
      default:              return "bg-muted text-muted-foreground"
    }
  }

  const formatEventLabel = (event: string, extra?: Record<string, string>) => {
    if (event === "StatusUpdated" && extra?.status) return `Status → ${extra.status}`
    return event
  }

  const formatTimestamp = (ts?: number) => {
    if (!ts) return "—"
    return new Date(ts * 1000).toLocaleString("en-IN")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.logs.title")}</h1>
          <p className="text-muted-foreground">{t("admin.logs.desc")}</p>
        </div>
        <Button variant="outline" onClick={fetchEvents} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("admin.logs.refresh")}
        </Button>
      </div>

      {source === "database" && !loading && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          Blockchain node is unreachable — showing records from the database. Connect your blockchain node and refresh for live on-chain data.
        </div>
      )}
      {source === "unavailable" && !loading && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {t("admin.logs.blockchainUnavailable")}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.logs.eventTimeline")}</CardTitle>
          <CardDescription>
            {source === "blockchain"
              ? t("admin.logs.liveEventsDesc")
              : source === "database"
              ? "Showing FIR registration records from the database (blockchain node offline)"
              : t("admin.logs.eventTimelineDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("admin.logs.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={eventFilter} onValueChange={(value) => setEventFilter(value as EventType)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t("admin.logs.filterEvent")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.logs.allEvents")}</SelectItem>
                <SelectItem value="FIRCreated">{t("admin.logs.firCreated")}</SelectItem>
                <SelectItem value="FIRVerified">{t("admin.logs.firVerified")}</SelectItem>
                <SelectItem value="StatusUpdated">{t("admin.logs.statusUpdated")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t("admin.logs.loading")}</div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{t("admin.logs.noEvents")}</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              <div className="space-y-6">
                {filteredEvents.map((log) => (
                  <div key={log.id} className="relative pl-10">
                    <div className={`absolute left-2.5 top-2 h-3 w-3 rounded-full ${getEventColor(log.event)} ring-4 ring-background`} />
                    <div className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getEventBadgeStyle(log.event)}`}>
                            {formatEventLabel(log.event, log.extra)}
                          </span>
                          <span className="text-sm font-medium text-foreground">{log.firId}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block">{formatTimestamp(log.timestamp)}</span>
                          <span className="text-xs text-muted-foreground">Block #{log.blockNumber}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-20">{t("admin.logs.txHash")}</span>
                          <code className="flex-1 bg-secondary px-2 py-1 rounded font-mono truncate">{log.txHash}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(log.txHash, "Transaction Hash")}>
                            <Copy className="h-3 w-3" />
                          </Button>
                          <a
                            href={`https://sepolia.etherscan.io/tx/${log.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground w-20">{t("admin.logs.walletLabel")}</span>
                          <code className="flex-1 bg-secondary px-2 py-1 rounded font-mono truncate">{log.walletAddress}</code>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(log.walletAddress, "Wallet Address")}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {log.extra?.cid && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground w-20">{t("admin.logs.ipfsCidLabel")}</span>
                            <code className="flex-1 bg-secondary px-2 py-1 rounded font-mono truncate">{log.extra.cid}</code>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 text-sm text-muted-foreground">
            {t("common.showing")} {filteredEvents.length} {t("common.of")} {events.length} {t("common.events")}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
