"use client"

import { use, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { FIRTimeline } from "@/components/dashboard/fir-timeline"
import { ArrowLeft, Copy, ExternalLink, FileText, MapPin, Calendar, User, Shield, Hash, XCircle, Upload, Loader2, RotateCcw, Download, ShieldCheck, Lock, ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { useFIR } from "@/hooks/use-firs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n/language-context"

export default function FIRDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { toast } = useToast()
  const { fir, loading, notFound } = useFIR(id)
  const { t } = useLanguage()

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

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

  const [showAppealDialog, setShowAppealDialog] = useState(false)
  const [appealReason, setAppealReason] = useState("")
  const [isAppealing, setIsAppealing] = useState(false)

  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [showTechDetails, setShowTechDetails] = useState(false)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: `${label} copied to clipboard.` })
  }

  const IPFS_GATEWAYS = [
    "https://gateway.pinata.cloud/ipfs",
    "https://cloudflare-ipfs.com/ipfs",
    "https://ipfs.io/ipfs",
    "https://dweb.link/ipfs",
  ]

  const downloadEvidenceFile = async (cid: string, fileName: string) => {
    for (const gateway of IPFS_GATEWAYS) {
      try {
        const res = await fetch(`${gateway}/${cid}`)
        if (!res.ok) continue
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
        return
      } catch {
        // Try next gateway
      }
    }
    toast({ title: "Download Failed", description: "Could not reach any IPFS gateway.", variant: "destructive" })
  }

  const handleAppeal = async () => {
    if (!fir || !appealReason.trim()) return
    setIsAppealing(true)
    try {
      const res = await fetch(`/api/fir/${fir.id}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: appealReason.trim() }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Appeal failed")
      toast({ title: "Appeal Submitted", description: "Your FIR has been re-submitted for review." })
      setShowAppealDialog(false)
      setAppealReason("")
      window.location.reload()
    } catch (err) {
      toast({ title: "Appeal Failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" })
    } finally {
      setIsAppealing(false)
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewFiles(Array.from(e.target.files))
  }

  const handleAddEvidence = async () => {
    if (!fir || newFiles.length === 0) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      newFiles.forEach((f) => formData.append("files", f))
      const res = await fetch(`/api/fir/${fir.id}/evidence`, { method: "POST", body: formData })
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed")
      const data = await res.json()
      toast({ title: "Evidence Uploaded", description: `${data.added.length} file(s) added successfully.` })
      setShowEvidenceDialog(false)
      setNewFiles([])
      window.location.reload()
    } catch (err) {
      toast({ title: "Upload Failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-muted-foreground">{t("fir.loadingDetails")}</div>
  if (notFound || !fir) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">{t("fir.notFound")}</p>
      <Button asChild className="mt-4" variant="outline">
        <Link href="/dashboard/citizen/my-firs">{t("fir.backToMyFirs")}</Link>
      </Button>
    </div>
  )

  const canAddEvidence = fir.status === "pending" || fir.status === "under-verification"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/citizen/my-firs"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{fir.id}</h1>
          <p className="text-muted-foreground">{fir.title}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
          {isDownloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          {t("fir.downloadPdf")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">

          {/* FIR Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("fir.details")}</CardTitle>
                <StatusBadge status={fir.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fir.isAppeal && (
                <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-sm text-primary">
                  <RotateCcw className="h-4 w-4 flex-shrink-0" />
                  {t("fir.appealBadge")}
                </div>
              )}

              {/* Show extended narrative if available, else fall back to description */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  {(fir as unknown as { firstInformationContents?: string }).firstInformationContents
                    ? "First Information Contents"
                    : t("fir.description")}
                </h4>
                <p className="text-foreground whitespace-pre-line">
                  {(fir as unknown as { firstInformationContents?: string }).firstInformationContents || fir.description}
                </p>
              </div>

              {/* Acts & Sections */}
              {(fir as unknown as { acts?: { act: string; sections: string }[] }).acts?.length ? (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Acts &amp; Sections Applied</h4>
                  <div className="rounded-lg border border-border overflow-hidden text-sm">
                    <table className="w-full">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-xs">S.No.</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Act</th>
                          <th className="px-3 py-2 text-left font-medium text-xs">Sections</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(fir as unknown as { acts: { act: string; sections: string }[] }).acts.map((a, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 text-muted-foreground text-xs">{i + 1}</td>
                            <td className="px-3 py-2 text-xs">{a.act}</td>
                            <td className="px-3 py-2 text-xs font-mono">{a.sections}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {/* Accused details */}
              {(fir as unknown as { accusedDetails?: { name: string; alias?: string; relativeName?: string; address?: string }[] }).accusedDetails?.length ? (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Accused / Suspected Persons</h4>
                  <div className="space-y-2">
                    {(fir as unknown as { accusedDetails: { name: string; alias?: string; relativeName?: string; address?: string }[] }).accusedDetails.map((a, i) => (
                      <div key={i} className="rounded-lg border border-border px-3 py-2 text-sm">
                        <p className="font-medium">{a.name}{a.alias ? ` (${a.alias})` : ""}</p>
                        {a.relativeName && <p className="text-xs text-muted-foreground">Relative: {a.relativeName}</p>}
                        {a.address && <p className="text-xs text-muted-foreground">{a.address}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {fir.status === "rejected" && fir.rejectionReason && (
                <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-destructive">{t("fir.rejectionReason")}</p>
                    <p className="text-sm text-foreground mt-1">{fir.rejectionReason}</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("fir.location")}</p>
                    <p className="text-foreground">{fir.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("fir.incidentDate")}</p>
                    <p className="text-foreground">{new Date(fir.incidentDate).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("fir.filedBy")}</p>
                    <p className="text-foreground">{fir.citizenName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("fir.filedDate")}</p>
                    <p className="text-foreground">{new Date(fir.filedDate).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
              </div>
              {fir.policeVerifierName && fir.status === "verified" && (
                <div className="flex items-start gap-3 pt-2 border-t border-border">
                  <Shield className="h-5 w-5 text-success mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("fir.verifiedBy")}</p>
                    <p className="text-foreground">{fir.policeVerifierName}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evidence Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("fir.evidenceFiles")}</CardTitle>
                  <CardDescription>{t("fir.evidenceFilesDesc")}</CardDescription>
                </div>
                {canAddEvidence && (
                  <Button size="sm" variant="outline" onClick={() => setShowEvidenceDialog(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    {t("fir.addEvidence")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Citizen evidence */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Your submitted evidence</p>
                {fir.evidenceFiles.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">{t("fir.noEvidence")}</p>
                ) : (
                  <div className="space-y-2">
                    {fir.evidenceFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">IPFS: {file.ipfsCid.slice(0, 20)}…</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Download" onClick={() => downloadEvidenceFile(file.ipfsCid, file.name)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy CID" onClick={() => copyToClipboard(file.ipfsCid, "IPFS CID")}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <a href={`https://gateway.pinata.cloud/ipfs/${file.ipfsCid}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary rounded-md hover:bg-accent">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Police investigation evidence */}
              {fir.policeEvidenceFiles && fir.policeEvidenceFiles.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Added by investigating officer</p>
                  <div className="space-y-2">
                    {fir.policeEvidenceFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary/60" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Added by {file.uploadedBy} · IPFS: {file.ipfsCid.slice(0, 20)}…
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Download" onClick={() => downloadEvidenceFile(file.ipfsCid, file.name)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy CID" onClick={() => copyToClipboard(file.ipfsCid, "IPFS CID")}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <a href={`https://gateway.pinata.cloud/ipfs/${file.ipfsCid}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-primary rounded-md hover:bg-accent">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
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
              <CardTitle>{t("fir.statusTimeline")}</CardTitle>
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
                onChainStatusHistory={fir.onChainStatusHistory}
              />

              {fir.status === "rejected" && (
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => setShowAppealDialog(true)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t("fir.appealRejection")}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Blockchain Trust Badge */}
          <Card className="overflow-hidden">
            <div className="bg-success/10 border-b border-success/20 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-success/20">
                  <ShieldCheck className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-success">Permanently Recorded</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    This FIR has been registered on the blockchain and cannot be altered or deleted.
                  </p>
                </div>
              </div>
            </div>

            <CardContent className="pt-4 space-y-3">
              {/* Filed timestamp */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Filed on</span>
                <span className="font-medium text-foreground">
                  {new Date(fir.filedDate).toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}
                </span>
              </div>

              {/* Verification status */}
              {fir.status === "verified" && fir.policeVerifierName ? (
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-success flex-shrink-0" />
                  <span className="text-muted-foreground">Verified by</span>
                  <span className="font-medium text-foreground">{fir.policeVerifierName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">Tamper-proof record secured</span>
                </div>
              )}

              {/* Technical details collapsible */}
              <Collapsible open={showTechDetails} onOpenChange={setShowTechDetails}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-xs text-muted-foreground hover:text-foreground mt-1 h-8"
                  >
                    View technical proof
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTechDetails ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2 border-t border-border mt-2">
                  <p className="text-xs text-muted-foreground">
                    These values allow auditors, lawyers, and courts to independently verify this FIR has not been modified.
                  </p>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("fir.transactionHash")}</p>
                    <div className="flex items-center gap-1">
                      <code className="flex-1 rounded bg-secondary px-2 py-1 text-xs break-all">{fir.blockchainTxHash}</code>
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(fir.blockchainTxHash, "Transaction Hash")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t("fir.ipfsCid")}</p>
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
                    <p className="text-xs text-muted-foreground mb-1">{t("fir.dataHash")}</p>
                    <code className="block rounded bg-secondary px-2 py-1 text-xs break-all">{fir.storedHash}</code>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Appeal Dialog */}
      <Dialog open={showAppealDialog} onOpenChange={setShowAppealDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              {t("fir.appealRejection")}
            </DialogTitle>
            <DialogDescription>
              {t("fir.appealDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="appeal-reason">{t("fir.appealReasonLabel")} <span className="text-destructive">*</span></Label>
            <Textarea
              id="appeal-reason"
              placeholder={t("fir.appealPlaceholder")}
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAppealDialog(false); setAppealReason("") }} disabled={isAppealing}>{t("common.cancel")}</Button>
            <Button onClick={handleAppeal} disabled={isAppealing || !appealReason.trim()}>
              {isAppealing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("fir.submitting")}</> : t("fir.submitAppeal")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Evidence Dialog */}
      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              {t("fir.addEvidenceDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("fir.addEvidenceDialogDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="evidence-files">{t("fir.selectFiles")}</Label>
            <input
              id="evidence-files"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/quicktime"
              onChange={handleFileChange}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
            />
            {newFiles.length > 0 && (
              <div className="rounded-lg bg-secondary/50 p-3 space-y-1">
                {newFiles.map((f, i) => (
                  <p key={i} className="text-xs text-muted-foreground">{f.name} ({(f.size / 1024).toFixed(1)} KB)</p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEvidenceDialog(false); setNewFiles([]) }} disabled={isUploading}>{t("common.cancel")}</Button>
            <Button onClick={handleAddEvidence} disabled={isUploading || newFiles.length === 0}>
              {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("fir.uploadingIpfs")}</> : t("fir.uploadFiles")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
