"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/dashboard/status-badge"
import { FIRTimeline } from "@/components/dashboard/fir-timeline"
import { useFIR } from "@/hooks/use-firs"
import { useAuth } from "@/lib/auth-context"
import { ArrowLeft, Copy, ExternalLink, Download, FileText, MapPin, Calendar, User, Hash, CheckCircle, Shield, Loader2, AlertTriangle, XCircle, MessageSquare, Send, Upload } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { FIRNote } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { ChangeEvent } from "react"
import { useLanguage } from "@/lib/i18n/language-context"

export default function FIRReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  const [showVerifyDialog, setShowVerifyDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [verificationResult, setVerificationResult] = useState<{ txHash: string; walletAddress: string; onChain?: boolean } | null>(null)

  const [notes, setNotes] = useState<FIRNote[]>([])
  const [newNote, setNewNote] = useState("")
  const [isAddingNote, setIsAddingNote] = useState(false)

  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewFiles(Array.from(e.target.files))
  }

  const handleAddEvidence = async () => {
    if (!fir || newFiles.length === 0) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      newFiles.forEach((f) => formData.append("files", f))
      formData.append("uploaderRole", "police")
      formData.append("uploadedBy", user?.name || "Police Officer")
      formData.append("uploadedById", user?.id || "police")
      const res = await fetch(`/api/fir/${fir.id}/evidence`, { method: "POST", body: formData })
      if (!res.ok) throw new Error((await res.json()).error || "Upload failed")
      const data = await res.json()
      toast({ title: "Evidence Uploaded", description: `${data.added.length} file(s) added to investigation file.` })
      setShowEvidenceDialog(false)
      setNewFiles([])
      window.location.reload()
    } catch (err) {
      toast({ title: "Upload Failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const { fir, loading, notFound: firNotFound } = useFIR(id)
  const { t } = useLanguage()

  // Auto-mark as "under-verification" when a police officer opens a pending FIR
  useEffect(() => {
    if (!fir || fir.status !== "pending") return
    fetch(`/api/fir/${fir.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "under-verification" }),
    }).catch(() => {/* silent — non-critical */})
  }, [fir?.id, fir?.status])

  // Fetch existing notes
  useEffect(() => {
    if (!fir) return
    fetch(`/api/fir/${fir.id}/notes`)
      .then((r) => r.json())
      .then((data) => { if (data.notes) setNotes(data.notes) })
      .catch(() => {/* silent */})
  }, [fir?.id])

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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: `${label} copied to clipboard.` })
  }

  const handleVerifyAndEndorse = async () => {
    if (!fir) return
    setIsVerifying(true)
    try {
      const res = await fetch(`/api/fir/${fir.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          policeVerifierId: user?.id || "police-officer",
          policeVerifierName: user?.name || "Police Officer",
          policeVerifierWallet: user?.walletAddress,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Verification failed")
      const data = await res.json()
      setVerificationResult({
        txHash: data.verificationTxHash,
        walletAddress: user?.walletAddress || "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD58",
        onChain: data.onChain,
      })
      toast({ title: "FIR Verified Successfully", description: `FIR ${fir.id} has been verified and endorsed.` })
    } catch (err) {
      toast({ title: "Verification Failed", description: err instanceof Error ? err.message : "An error occurred.", variant: "destructive" })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleReject = async () => {
    if (!fir || !rejectionReason.trim()) return
    setIsRejecting(true)
    try {
      const res = await fetch(`/api/fir/${fir.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          policeVerifierId: user?.id || "police-officer",
          policeVerifierName: user?.name || "Police Officer",
          rejectionReason: rejectionReason.trim(),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Rejection failed")
      toast({ title: "FIR Rejected", description: `FIR ${fir.id} has been rejected.` })
      router.push("/dashboard/police/pending")
    } catch (err) {
      toast({ title: "Rejection Failed", description: err instanceof Error ? err.message : "An error occurred.", variant: "destructive" })
    } finally {
      setIsRejecting(false)
      setShowRejectDialog(false)
    }
  }

  const handleCloseSuccess = () => {
    setShowVerifyDialog(false)
    setVerificationResult(null)
    router.push("/dashboard/police/pending")
  }

  const handleAddNote = async () => {
    if (!fir || !newNote.trim()) return
    setIsAddingNote(true)
    try {
      const res = await fetch(`/api/fir/${fir.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: newNote.trim(),
          authorId: user?.id || "police",
          authorName: user?.name || "Police Officer",
          role: user?.role || "police",
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add note")
      const note = await res.json()
      setNotes((prev) => [...prev, note])
      setNewNote("")
      toast({ title: "Note Added", description: "Internal note saved successfully." })
    } catch (err) {
      toast({ title: "Failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" })
    } finally {
      setIsAddingNote(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-muted-foreground">{t("fir.loadingDetails")}</div>
  if (firNotFound || !fir) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">{t("fir.notFound")}</p>
      <Button asChild className="mt-4" variant="outline">
        <Link href="/dashboard/police/pending">{t("police.pending.backToPending")}</Link>
      </Button>
    </div>
  )

  const hashesMatch = fir.storedHash === fir.computedHash || !fir.computedHash
  const isActionable = fir.status !== "verified" && fir.status !== "rejected"

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/police/pending">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("police.review.title")}</h1>
          <p className="text-muted-foreground">{fir.id} - {fir.title}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("fir.details")}</CardTitle>
                <StatusBadge status={fir.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Narrative — show full firstInformationContents if filed with new form, else description */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  {(fir as unknown as { firstInformationContents?: string }).firstInformationContents
                    ? "First Information Contents (Faryad)"
                    : t("police.review.description")}
                </h4>
                <p className="text-foreground whitespace-pre-line">
                  {(fir as unknown as { firstInformationContents?: string }).firstInformationContents || fir.description}
                </p>
              </div>

              {/* Acts & Sections */}
              {(fir as unknown as { acts?: { act: string; sections: string }[] }).acts?.length ? (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Acts &amp; Sections</h4>
                  <div className="rounded-lg border border-border overflow-hidden text-sm">
                    <table className="w-full">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-xs w-10">S.No.</th>
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

              {/* Complainant personal details */}
              {(fir as unknown as { complainantDetails?: { mobile?: string; occupation?: string; currentAddress?: string; uid?: string } }).complainantDetails?.mobile ? (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Complainant Details</h4>
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    {(fir as unknown as { complainantDetails: { mobile?: string; occupation?: string; currentAddress?: string; uid?: string } }).complainantDetails.mobile && (
                      <div><span className="text-muted-foreground">Mobile: </span>{(fir as unknown as { complainantDetails: { mobile?: string } }).complainantDetails!.mobile}</div>
                    )}
                    {(fir as unknown as { complainantDetails: { occupation?: string } }).complainantDetails?.occupation && (
                      <div><span className="text-muted-foreground">Occupation: </span>{(fir as unknown as { complainantDetails: { occupation?: string } }).complainantDetails!.occupation}</div>
                    )}
                    {(fir as unknown as { complainantDetails: { currentAddress?: string } }).complainantDetails?.currentAddress && (
                      <div className="sm:col-span-2"><span className="text-muted-foreground">Address: </span>{(fir as unknown as { complainantDetails: { currentAddress?: string } }).complainantDetails!.currentAddress}</div>
                    )}
                  </div>
                </div>
              ) : null}

              {fir.status === "rejected" && fir.rejectionReason && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-xs font-medium text-destructive mb-1">{t("police.review.rejectionReason")}</p>
                  <p className="text-sm text-foreground">{fir.rejectionReason}</p>
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
                    <p className="text-sm font-medium text-muted-foreground">{t("police.review.citizenLabel")}</p>
                    <p className="text-foreground">{fir.citizenName}</p>
                    <p className="text-xs text-muted-foreground">{t("fir.citizenId")} {fir.citizenId}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("police.review.filedDate")}</p>
                    <p className="text-foreground">{new Date(fir.filedDate).toLocaleDateString("en-IN")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Citizen Evidence Files */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("fir.evidenceFiles")}</CardTitle>
                  <CardDescription>{t("police.review.evidenceReviewDesc")}</CardDescription>
                </div>
                {isActionable && (
                  <Button size="sm" variant="outline" onClick={() => setShowEvidenceDialog(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Add Investigation Evidence
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Citizen-submitted evidence */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Submitted by citizen</p>
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
                            <p className="text-xs text-muted-foreground">
                              {t("fir.typeLabel")} {file.type} | IPFS: {file.ipfsCid.slice(0, 15)}…
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
                )}
              </div>

              {/* Police investigation evidence */}
              {(fir as unknown as { policeEvidenceFiles?: { name: string; type: string; ipfsCid: string; uploadedBy: string }[] }).policeEvidenceFiles?.length ? (
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Added during investigation</p>
                  <div className="space-y-2">
                    {(fir as unknown as { policeEvidenceFiles: { name: string; type: string; ipfsCid: string; uploadedBy: string }[] }).policeEvidenceFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="flex items-center gap-3">
                          <FileText className="h-8 w-8 text-primary/60" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.type} · Added by {file.uploadedBy}
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
              ) : null}
            </CardContent>
          </Card>

          {/* Hash Verification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                {t("fir.hashVerification")}
              </CardTitle>
              <CardDescription>{t("fir.hashVerificationDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("fir.storedHash")}</p>
                <code className="block rounded bg-secondary px-3 py-2 text-xs break-all">{fir.storedHash}</code>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("fir.computedHash")}</p>
                <code className="block rounded bg-secondary px-3 py-2 text-xs break-all">{fir.computedHash || fir.storedHash}</code>
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-lg ${hashesMatch ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"}`}>
                {hashesMatch ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-sm font-medium text-success">{t("fir.hashMatch")}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium text-destructive">{t("fir.hashMismatch")}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t("police.review.internalNotes")}
              </CardTitle>
              <CardDescription>{t("police.review.internalNotesDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-2">{t("police.review.noNotes")}</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {notes.map((note) => (
                    <div key={note.id} className="rounded-lg bg-secondary/50 border border-border p-3">
                      <p className="text-sm text-foreground">{note.text}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-muted-foreground font-medium">{note.authorName}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {new Date(note.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-2 pt-2 border-t border-border">
                <Label htmlFor="new-note">{t("police.review.addNote")}</Label>
                <Textarea
                  id="new-note"
                  placeholder={t("police.review.notePlaceholder")}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  className="w-full"
                  onClick={handleAddNote}
                  disabled={isAddingNote || !newNote.trim()}
                >
                  {isAddingNote
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("police.review.saving")}</>
                    : <><Send className="mr-2 h-4 w-4" />{t("police.review.addNote")}</>
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("police.review.verificationActions")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {fir.status === "verified" ? (
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                    <Shield className="h-6 w-6 text-success" />
                  </div>
                  <p className="mt-3 font-medium text-foreground">{t("police.review.alreadyVerified")}</p>
                  <p className="text-sm text-muted-foreground">{t("police.review.verifiedBy")} {fir.policeVerifierName}</p>
                </div>
              ) : fir.status === "rejected" ? (
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <XCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <p className="mt-3 font-medium text-foreground">{t("police.review.firRejected")}</p>
                  <p className="text-sm text-muted-foreground">{t("police.review.rejectedBy")} {fir.policeVerifierName}</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("police.review.reviewInstruction")}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => setShowVerifyDialog(true)}
                    disabled={!hashesMatch || !isActionable}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    {t("police.review.verifyEndorse")}
                  </Button>
                  <Button
                    className="w-full"
                    variant="destructive"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={!isActionable}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {t("police.review.rejectFir")}
                  </Button>
                  {!hashesMatch && (
                    <p className="text-xs text-destructive">{t("police.review.hashMismatchWarn")}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("fir.blockchainInfo")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("fir.transactionHash")}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-secondary px-2 py-1 text-xs break-all">{fir.blockchainTxHash.slice(0, 20)}...</code>
                  <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => copyToClipboard(fir.blockchainTxHash, "Transaction Hash")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <a href={`https://sepolia.etherscan.io/tx/${fir.blockchainTxHash}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center text-muted-foreground hover:text-primary rounded-md hover:bg-accent">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t("fir.ipfsCid")}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-secondary px-2 py-1 text-xs break-all">{fir.ipfsCid.slice(0, 20)}...</code>
                  <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8" onClick={() => copyToClipboard(fir.ipfsCid, "IPFS CID")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Verify Confirmation Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent>
          {!verificationResult ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("police.review.verifyDialogTitle")}</DialogTitle>
                <DialogDescription>
                  You are about to verify and endorse FIR {fir.id} on the blockchain. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg bg-secondary p-4">
                <p className="text-sm text-muted-foreground">{t("police.review.verifyWillTitle")}</p>
                <ul className="mt-2 space-y-1 text-sm text-foreground">
                  <li>{t("police.review.verifyBullet1")}</li>
                  <li>{t("police.review.verifyBullet2")}</li>
                  <li>{t("police.review.verifyBullet3")}</li>
                </ul>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowVerifyDialog(false)} disabled={isVerifying}>{t("common.cancel")}</Button>
                <Button onClick={handleVerifyAndEndorse} disabled={isVerifying}>
                  {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("police.review.processing")}</> : t("police.review.confirmVerification")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-success">
                  <CheckCircle className="h-5 w-5" />
                  {t("police.review.successTitle")}
                </DialogTitle>
                <DialogDescription>{t("police.review.successDesc")}</DialogDescription>
              </DialogHeader>
              <div className="rounded-lg bg-secondary p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t("fir.transactionHash")}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 text-sm font-mono break-all">{verificationResult.txHash}</code>
                    <a href={`https://sepolia.etherscan.io/tx/${verificationResult.txHash}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary flex-shrink-0">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("police.review.verifierWallet")}</p>
                  <code className="block text-sm font-mono mt-1">{verificationResult.walletAddress}</code>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle className={`h-3.5 w-3.5 ${verificationResult.onChain ? "text-success" : "text-muted-foreground"}`} />
                  <span className={verificationResult.onChain ? "text-success" : "text-muted-foreground"}>
                    {verificationResult.onChain ? t("police.review.onChain") : t("police.review.savedDb")}
                  </span>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCloseSuccess}>{t("common.done")}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              {t("police.review.rejectDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting FIR {fir.id}. This will be visible to the citizen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reason">{t("police.review.rejectionReasonLabel")} <span className="text-destructive">*</span></Label>
            <Textarea
              id="reason"
              placeholder={t("police.review.rejectionPlaceholder")}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason("") }} disabled={isRejecting}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isRejecting || !rejectionReason.trim()}>
              {isRejecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t("police.review.rejecting")}</> : t("police.review.confirmRejection")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Investigation Evidence Dialog */}
      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Add Investigation Evidence
            </DialogTitle>
            <DialogDescription>
              Upload files found during investigation (CCTV footage, photos, documents). These are stored separately from the citizen's original evidence and do not affect FIR integrity verification.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="police-evidence-files">Select Files</Label>
            <input
              id="police-evidence-files"
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
            <Button variant="outline" onClick={() => { setShowEvidenceDialog(false); setNewFiles([]) }} disabled={isUploading}>Cancel</Button>
            <Button onClick={handleAddEvidence} disabled={isUploading || newFiles.length === 0}>
              {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading to IPFS...</> : "Upload Files"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
