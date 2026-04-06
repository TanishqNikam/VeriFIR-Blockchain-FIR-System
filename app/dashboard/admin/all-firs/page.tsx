"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Search, ExternalLink, Download, MapPin, CalendarRange, X, RefreshCw, AlertCircle, UserCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FIRStatus } from "@/lib/types"
import { useFIRs } from "@/hooks/use-firs"
import { useLanguage } from "@/lib/i18n/language-context"

export default function AllFIRsPage() {
  const { firs, loading, error, total } = useFIRs()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<FIRStatus | "all">("all")
  const [retryingFirId, setRetryingFirId] = useState<string | null>(null)
  const [backfilling, setBackfilling] = useState(false)

  const handleBackfillOfficers = async () => {
    setBackfilling(true)
    try {
      const res = await fetch("/api/admin/backfill-officers", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Backfill failed")
      if (data.updated > 0) {
        toast({ title: "Officers Assigned", description: data.message })
        window.location.reload()
      } else {
        toast({ title: "No Updates Made", description: data.message, variant: "destructive" })
      }
    } catch (err) {
      toast({ title: "Backfill Failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" })
    } finally {
      setBackfilling(false)
    }
  }

  const handleRetryBlockchain = async (firId: string) => {
    setRetryingFirId(firId)
    try {
      const res = await fetch("/api/admin/retry-blockchain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firId }),
      })
      const data = await res.json()
      if (data.succeeded > 0) {
        toast({ title: "Blockchain Registration Successful", description: `FIR ${firId} has been registered on the blockchain.` })
        window.location.reload()
      } else {
        toast({ title: "Blockchain Registration Failed", description: data.results?.[0]?.error || "Blockchain node may be unavailable.", variant: "destructive" })
      }
    } catch {
      toast({ title: "Error", description: "Could not reach the server.", variant: "destructive" })
    } finally {
      setRetryingFirId(null)
    }
  }
  const [locationFilter, setLocationFilter] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const { t } = useLanguage()

  const filteredFIRs = firs.filter((fir) => {
    const matchesSearch =
      fir.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fir.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fir.citizenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fir.policeVerifierName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)

    const matchesStatus = statusFilter === "all" || fir.status === statusFilter

    const matchesLocation = !locationFilter || fir.location.toLowerCase().includes(locationFilter.toLowerCase())

    const filedMs = new Date(fir.filedDate).getTime()
    const matchesFrom = !fromDate || filedMs >= new Date(fromDate).getTime()
    const matchesTo = !toDate || filedMs <= new Date(toDate + "T23:59:59").getTime()

    return matchesSearch && matchesStatus && matchesLocation && matchesFrom && matchesTo
  })

  const hasAdvancedFilters = locationFilter || fromDate || toDate
  const clearAdvancedFilters = () => { setLocationFilter(""); setFromDate(""); setToDate("") }

  const handleExportCSV = () => {
    const headers = ["FIR ID", "Title", "Citizen", "Citizen ID", "Police Verifier", "Status", "Tx Hash", "Filed Date"]
    const rows = filteredFIRs.map((fir) => [
      fir.id,
      fir.title,
      fir.citizenName,
      fir.citizenId,
      fir.policeVerifierName || "",
      fir.status,
      fir.blockchainTxHash,
      new Date(fir.filedDate).toLocaleDateString("en-IN"),
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `firs-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.allFirs.title")}</h1>
          <p className="text-muted-foreground">{t("admin.allFirs.desc")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBackfillOfficers} disabled={backfilling}>
            {backfilling ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <UserCheck className="mr-2 h-4 w-4" />}
            Assign Officers
          </Button>
          <Button variant="outline" onClick={handleExportCSV} disabled={loading || filteredFIRs.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            {t("admin.allFirs.exportCsv")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.allFirs.cardTitle")}</CardTitle>
          <CardDescription>{t("admin.allFirs.cardDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("admin.allFirs.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as FIRStatus | "all")}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t("admin.allFirs.filterStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("admin.allFirs.allStatus")}</SelectItem>
                  <SelectItem value="pending">{t("status.pending")}</SelectItem>
                  <SelectItem value="under-verification">{t("status.underVerification")}</SelectItem>
                  <SelectItem value="verified">{t("status.verified")}</SelectItem>
                  <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("admin.allFirs.filterLocation")}
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <CalendarRange className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="flex-1"
                  title="From date"
                />
                <span className="text-muted-foreground text-sm">{t("admin.allFirs.to")}</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="flex-1"
                  title="To date"
                />
                {hasAdvancedFilters && (
                  <Button variant="ghost" size="icon" onClick={clearAdvancedFilters} title="Clear filters">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.allFirs.colFirId")}</TableHead>
                  <TableHead>{t("admin.allFirs.colCitizen")}</TableHead>
                  <TableHead className="hidden sm:table-cell">Assigned Officer</TableHead>
                  <TableHead>{t("admin.allFirs.colStatus")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("admin.allFirs.colTxHash")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("admin.allFirs.colFiledDate")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("common.loading")}</TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-destructive">{error}</TableCell>
                  </TableRow>
                ) : filteredFIRs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("admin.allFirs.noFIRs")}</TableCell>
                  </TableRow>
                ) : (
                  filteredFIRs.map((fir) => (
                    <TableRow key={fir.id}>
                      <TableCell className="font-medium">{fir.id}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{fir.citizenName}</p>
                          <p className="text-xs text-muted-foreground">{fir.citizenId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {fir.policeVerifierName || <span className="text-muted-foreground text-xs">Unassigned</span>}
                      </TableCell>
                      <TableCell><StatusBadge status={fir.status} /></TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {fir.blockchainTxHash === "pending" ? (
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-xs text-amber-600">Pending</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              title="Retry blockchain registration"
                              onClick={() => handleRetryBlockchain(fir.id)}
                              disabled={retryingFirId === fir.id}
                            >
                              <RefreshCw className={`h-3 w-3 ${retryingFirId === fir.id ? "animate-spin" : ""}`} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs truncate max-w-32">{fir.blockchainTxHash.slice(0, 16)}...</span>
                            <a
                              href={`https://sepolia.etherscan.io/tx/${fir.blockchainTxHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-primary"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {new Date(fir.filedDate).toLocaleDateString("en-IN")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            {t("common.showing")} {filteredFIRs.length} {t("common.of")} {total} {t("common.records")}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
