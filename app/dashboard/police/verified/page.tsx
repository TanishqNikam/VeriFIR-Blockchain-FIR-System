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

type FilterStatus = "all" | "verified" | "rejected"

export default function VerifiedFIRsPage() {
  const { firs, loading, error } = useFIRs()
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
        <h1 className="text-2xl font-bold text-foreground">Verified FIRs</h1>
        <p className="text-muted-foreground">
          Complete record of all FIRs that have been reviewed and closed.
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
                <p className="text-sm text-muted-foreground">Total Closed</p>
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
                <p className="text-sm text-muted-foreground">Verified</p>
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
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Closed FIR Records</CardTitle>
          <CardDescription>
            FIRs that have been verified and endorsed on the blockchain, or rejected with a reason.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by FIR ID, citizen, title, or officer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Closed</SelectItem>
                <SelectItem value="verified">Verified only</SelectItem>
                <SelectItem value="rejected">Rejected only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>FIR ID</TableHead>
                  <TableHead>Citizen</TableHead>
                  <TableHead className="hidden md:table-cell">Title</TableHead>
                  <TableHead className="hidden sm:table-cell">Incident Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Handled By</TableHead>
                  <TableHead className="hidden lg:table-cell">Closed Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading records...
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
                      <p>No closed FIRs found.</p>
                      {closedFIRs.length === 0 && (
                        <p className="text-xs mt-1">FIRs will appear here once they have been verified or rejected.</p>
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
                            View
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
            Showing {filteredFIRs.length} of {closedFIRs.length} closed records
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
