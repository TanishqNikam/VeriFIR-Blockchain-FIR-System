"use client"

import { use, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { FIRTimeline } from "@/components/dashboard/fir-timeline"
import {
  ArrowLeft, Copy, ExternalLink, FileText, MapPin, Calendar, User,
  Shield, ShieldCheck, ShieldAlert, Hash, XCircle, Download, Loader2,
  CheckCircle, ChevronDown, ImageIcon, Video, File,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFIR } from "@/hooks/use-firs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export default function VerifiedFIRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  const { fir, loading, notFound } = useFIR(id)
  const [showTechDetails, setShowTechDetails] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: `${label} copied to clipboard.` })
  }

  const handleDownloadPdf = async () => {
    if (!fir) return
    setIsDownloadingPdf(true)
    try {
      const { downloadFIRPdf } = await import("@/lib/pdf")
      await downloadFIRPdf(fir)
    } catch {
      toast({ title: "Download Failed", description: "Could not generate PDF.", variant: "destructive" })
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon
    if (type.startsWith("video/")) return Video
    if (type === "application/pdf") return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) return (
    <div className="text-center py-20 text-muted-foreground">Loading FIR details...</div>
  )

  if (notFound || !fir) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">FIR not found.</p>
      <Button asChild className="mt-4" variant="outline">
        <Link href="/dashboard/police/verified">Back to Verified FIRs</Link>
      </Button>
    </div>
  )

  const isVerified = fir.status === "verified"
  const isRejected = fir.status === "rejected"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/police/verified">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{fir.id}</h1>
          <p className="text-muted-foreground">{fir.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={fir.status} />
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
            {isDownloadingPdf
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">

          {/* FIR Details */}
          <Card>
            <CardHeader>
              <CardTitle>FIR Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Rejection notice */}
              {isRejected && fir.rejectionReason && (
                <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Rejection Reason</p>
                    <p className="text-sm text-foreground mt-1">{fir.rejectionReason}</p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
                <p className="text-foreground leading-relaxed">{fir.description}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Location</p>
                    <p className="text-foreground">{fir.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Incident Date</p>
                    <p className="text-foreground">{new Date(fir.incidentDate).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Filed By</p>
                    <p className="text-foreground">{fir.citizenName}</p>
                    <p className="text-xs text-muted-foreground">{fir.citizenId}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date Filed</p>
                    <p className="text-foreground">{new Date(fir.filedDate).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
              </div>

              {/* Verification officer */}
              {fir.policeVerifierName && (
                <div className={`flex items-start gap-3 pt-4 border-t border-border`}>
                  <Shield className={`h-5 w-5 mt-0.5 ${isVerified ? "text-success" : "text-destructive"}`} />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {isVerified ? "Verified By" : "Reviewed By"}
                    </p>
                    <p className="text-foreground font-medium">{fir.policeVerifierName}</p>
                    {fir.verifiedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(fir.verifiedAt).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence Files */}
          <Card>
            <CardHeader>
              <CardTitle>Evidence Files</CardTitle>
              <CardDescription>
                {fir.evidenceFiles.length === 0
                  ? "No evidence files were submitted with this FIR."
                  : `${fir.evidenceFiles.length} file${fir.evidenceFiles.length > 1 ? "s" : ""} stored on IPFS`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fir.evidenceFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No evidence attached.</p>
              ) : (
                <div className="space-y-3">
                  {fir.evidenceFiles.map((file) => {
                    const FileIcon = getFileIcon(file.type)
                    return (
                      <div key={file.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                            <FileIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)} · {file.type}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(file.ipfsCid, "IPFS CID")}
                          >
                            <Copy className="h-4 w-4 mr-1" />
                            CID
                          </Button>
                          <a
                            href={`https://gateway.pinata.cloud/ipfs/${file.ipfsCid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary p-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <FIRTimeline
                status={fir.status}
                filedDate={fir.filedDate}
                underVerificationAt={(fir as unknown as { underVerificationAt?: string }).underVerificationAt}
                verifiedAt={fir.verifiedAt}
                rejectionReason={fir.rejectionReason}
                appealReason={fir.appealReason}
                isAppeal={fir.isAppeal}
              />
            </CardContent>
          </Card>

          {/* Blockchain integrity card */}
          <Card className="overflow-hidden">
            <div className={`border-b px-4 py-4 ${isVerified ? "bg-success/10 border-success/20" : "bg-destructive/10 border-destructive/20"}`}>
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${isVerified ? "bg-success/20" : "bg-destructive/20"}`}>
                  {isVerified
                    ? <ShieldCheck className="h-5 w-5 text-success" />
                    : <ShieldAlert className="h-5 w-5 text-destructive" />}
                </div>
                <div>
                  <p className={`font-semibold ${isVerified ? "text-success" : "text-destructive"}`}>
                    {isVerified ? "Blockchain Verified" : "Rejected — On Record"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {isVerified
                      ? "This FIR is permanently anchored on-chain and cannot be altered."
                      : "This FIR was reviewed and rejected. The decision is recorded on-chain."}
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="pt-4 space-y-3">
              {/* Hash integrity check */}
              <div className="flex items-center gap-2 text-sm">
                {fir.storedHash === fir.computedHash || !fir.computedHash
                  ? <><CheckCircle className="h-4 w-4 text-success flex-shrink-0" /><span className="text-success">Data integrity confirmed</span></>
                  : <><XCircle className="h-4 w-4 text-destructive flex-shrink-0" /><span className="text-destructive">Hash mismatch detected</span></>}
              </div>

              {fir.verificationTxHash && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-muted-foreground">Verification tx recorded</span>
                </div>
              )}

              {/* Technical details for officers */}
              <Collapsible open={showTechDetails} onOpenChange={setShowTechDetails}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground mt-1 h-8">
                    <span className="flex items-center gap-1.5">
                      <Hash className="h-3.5 w-3.5" />
                      Technical details
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTechDetails ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2 border-t border-border mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Registration Tx Hash</p>
                    <div className="flex items-center gap-1">
                      <code className="flex-1 rounded bg-secondary px-2 py-1 text-xs break-all">{fir.blockchainTxHash}</code>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(fir.blockchainTxHash, "Tx Hash")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  {fir.verificationTxHash && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Verification Tx Hash</p>
                      <div className="flex items-center gap-1">
                        <code className="flex-1 rounded bg-secondary px-2 py-1 text-xs break-all">{fir.verificationTxHash}</code>
                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(fir.verificationTxHash!, "Verification Tx Hash")}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">IPFS CID</p>
                    <div className="flex items-center gap-1">
                      <code className="flex-1 rounded bg-secondary px-2 py-1 text-xs break-all">{fir.ipfsCid}</code>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(fir.ipfsCid, "IPFS CID")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                      <a href={`https://gateway.pinata.cloud/ipfs/${fir.ipfsCid}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-muted-foreground hover:text-primary">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Data Hash (SHA-256)</p>
                    <code className="block rounded bg-secondary px-2 py-1 text-xs break-all">{fir.storedHash}</code>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>

          {/* Internal notes (read-only) */}
          {fir.notes && fir.notes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
                <CardDescription>Notes recorded during review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {fir.notes.map((note, i) => (
                  <div key={i} className="rounded-lg bg-secondary/50 p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">{note.authorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(note.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{note.text}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
