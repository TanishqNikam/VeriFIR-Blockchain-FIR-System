"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, Eye, CheckCircle, XCircle, FileText } from "lucide-react"
import { useFIRs } from "@/hooks/use-firs"
import { useLanguage } from "@/lib/i18n/language-context"

type FilterStatus = "all" | "verified" | "rejected"

export default function VerifiedFIRsPage() {
  const { firs, loading, error } = useFIRs()
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")

  const closedFIRs = firs.filter(
    (f) => f.status === "verified" || f.status === "rejected"
  )

  const filteredFIRs = closedFIRs.filter((fir) => {
    const matchesSearch =
      fir.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fir.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fir.citizenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fir.policeVerifierName ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fir.blockchainTxHash ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || fir.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const verifiedCount = closedFIRs.filter((f) => f.status === "verified").length
  const rejectedCount = closedFIRs.filter((f) => f.status === "rejected").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("police.verified.title")}</h1>
        <p className="text-muted-foreground">
          {t("police.verified.desc")}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{closedFIRs.length}</p>
                <p className="text-sm text-muted-foreground">{t("police.verified.totalClosed")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{verifiedCount}</p>
                <p className="text-sm text-muted-foreground">{t("police.verified.verified")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{rejectedCount}</p>
                <p className="text-sm text-muted-foreground">{t("police.verified.rejected")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("police.verified.closedRecords")}</CardTitle>
          <CardDescription>
            {t("police.verified.closedRecordsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("police.verified.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder={t("police.verified.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("police.verified.allClosed")}</SelectItem>
                <SelectItem value="verified">{t("police.verified.verifiedOnly")}</SelectItem>
                <SelectItem value="rejected">{t("police.verified.rejectedOnly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("police.verified.colFirId")}</TableHead>
                  <TableHead>{t("police.verified.colCitizen")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("police.verified.colTitle")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("police.verified.colIncidentDate")}</TableHead>
                  <TableHead>{t("police.verified.colStatus")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("police.verified.colHandledBy")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("police.verified.colClosedDate")}</TableHead>
                  <TableHead className="text-right">{t("police.verified.colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t("police.verified.loadingRecords")}
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-destructive">{error}</TableCell>
                  </TableRow>
                ) : filteredFIRs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <FileText className="mx-auto h-10 w-10 mb-3 opacity-40" />
                      <p>{t("police.verified.noClosedFIRs")}</p>
                      {closedFIRs.length === 0 && (
                        <p className="text-xs mt-1">{t("police.verified.noClosedFIRsHint")}</p>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFIRs.map((fir) => (
                    <TableRow key={fir.id}>
                      <TableCell className="font-mono text-sm font-medium">{fir.id}</TableCell>
                      <TableCell>{fir.citizenName}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-48 truncate">{fir.title}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {new Date(fir.incidentDate).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell><StatusBadge status={fir.status} /></TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {fir.policeVerifierName ?? "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {fir.verifiedAt
                          ? new Date(fir.verifiedAt).toLocaleDateString("en-IN")
                          : new Date(fir.filedDate).toLocaleDateString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/police/verified/${fir.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            {t("common.view")}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {t("common.showing")} {filteredFIRs.length} {t("common.of")} {closedFIRs.length} {t("police.verified.closedRecordsLabel")}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
