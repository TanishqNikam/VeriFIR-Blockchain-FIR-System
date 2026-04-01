"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { Search, Eye, ExternalLink } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { useFIRs } from "@/hooks/use-firs"
import { useLanguage } from "@/lib/i18n/language-context"

export default function MyFIRsPage() {
  const { user } = useAuth()
  const { firs: myFIRs, loading, error } = useFIRs({ citizenId: user?.id })
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const { t } = useLanguage()

  const filteredFIRs = myFIRs.filter((fir) => {
    const matchesSearch =
      fir.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fir.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fir.location?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || fir.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("citizen.myFirs.title")}</h1>
        <p className="text-muted-foreground">{t("citizen.myFirs.desc")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("citizen.myFirs.cardTitle")}</CardTitle>
          <CardDescription>{t("citizen.myFirs.cardDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("citizen.myFirs.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder={t("citizen.myFirs.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("citizen.myFirs.allStatuses")}</SelectItem>
                <SelectItem value="pending">{t("status.pending")}</SelectItem>
                <SelectItem value="under-verification">{t("status.underVerification")}</SelectItem>
                <SelectItem value="verified">{t("status.verified")}</SelectItem>
                <SelectItem value="rejected">{t("status.rejected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("citizen.myFirs.colFirId")}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t("citizen.myFirs.colTitle")}</TableHead>
                  <TableHead>{t("citizen.myFirs.colDate")}</TableHead>
                  <TableHead>{t("citizen.myFirs.colStatus")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t("citizen.myFirs.colTxHash")}</TableHead>
                  <TableHead className="text-right">{t("citizen.myFirs.colActions")}</TableHead>
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t("citizen.myFirs.noFIRs")}</TableCell>
                  </TableRow>
                ) : (
                  filteredFIRs.map((fir) => (
                    <TableRow key={fir.id}>
                      <TableCell className="font-medium">{fir.id}</TableCell>
                      <TableCell className="hidden sm:table-cell max-w-48 truncate">{fir.title}</TableCell>
                      <TableCell>{new Date(fir.filedDate).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell><StatusBadge status={fir.status} /></TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs truncate max-w-24">{fir.blockchainTxHash.slice(0, 10)}...</span>
                          <a
                            href={`https://etherscan.io/tx/${fir.blockchainTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary"
                            aria-label="View on Etherscan"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/dashboard/citizen/my-firs/${fir.id}`}>
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

          {!loading && (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("common.showing")} {filteredFIRs.length} {t("common.of")} {myFIRs.length} {t("common.records")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
