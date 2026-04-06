"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Search, Eye } from "lucide-react"
import { useFIRs } from "@/hooks/use-firs"
import { useLanguage } from "@/lib/i18n/language-context"

export default function PendingFIRsPage() {
  const { firs, loading, error } = useFIRs()
  const [searchQuery, setSearchQuery] = useState("")
  const { t } = useLanguage()

  const pendingFIRs = firs.filter((f) => f.status === "pending" || f.status === "under-verification")

  const filteredFIRs = pendingFIRs.filter(
    (fir) =>
      fir.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fir.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fir.citizenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fir.blockchainTxHash ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("police.pending.title")}</h1>
        <p className="text-muted-foreground">{t("police.pending.desc")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("police.pending.queueTitle")}</CardTitle>
          <CardDescription>{t("police.pending.queueDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("police.pending.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("police.pending.colFirId")}</TableHead>
                  <TableHead>{t("police.pending.colCitizen")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("police.pending.colTitle")}</TableHead>
                  <TableHead>{t("police.pending.colDateFiled")}</TableHead>
                  <TableHead>{t("police.pending.colStatus")}</TableHead>
                  <TableHead className="text-right">{t("police.pending.colActions")}</TableHead>
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("police.pending.noFIRs")}</TableCell>
                  </TableRow>
                ) : (
                  filteredFIRs.map((fir) => (
                    <TableRow key={fir.id}>
                      <TableCell className="font-medium">{fir.id}</TableCell>
                      <TableCell>{fir.citizenName}</TableCell>
                      <TableCell className="hidden sm:table-cell max-w-48 truncate">{fir.title}</TableCell>
                      <TableCell>{new Date(fir.filedDate).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell><StatusBadge status={fir.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button variant="default" size="sm" asChild>
                          <Link href={`/dashboard/police/pending/${fir.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            {t("common.review")}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
