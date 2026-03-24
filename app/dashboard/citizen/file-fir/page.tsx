"use client"

import { type ChangeEvent, type FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { Upload, X, FileIcon, Loader2, CheckCircle, Copy, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useLanguage } from "@/lib/i18n/language-context"

// ── Types ──────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  /** Keep the actual File object so we can send it via FormData */
  file: File
}

interface SubmissionResult {
  firId: string
  ipfsCid: string
  txHash: string
  storedHash: string
  blockNumber: number
  evidenceCount: number
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function FileFIRPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [incidentDate, setIncidentDate] = useState("")
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)

  // ── File handling ────────────────────────────────────────────────────────────

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return

    const incoming: UploadedFile[] = Array.from(selected).map((file) => ({
      id: Math.random().toString(36).substring(2),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
    }))

    setFiles((prev) => [...prev, ...incoming])
    e.target.value = "" // reset so the same file can be re-added if needed
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ── Form submit ──────────────────────────────────────────────────────────────

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!title || !description || !location || !incidentDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Build FormData — files are sent as real File objects
      const formData = new FormData()
      formData.append("title", title)
      formData.append("description", description)
      formData.append("location", location)
      formData.append("incidentDate", incidentDate)
      formData.append("citizenId", user?.id || "citizen-001")
      formData.append("citizenName", user?.name || "Demo Citizen")

      for (const uploaded of files) {
        formData.append("files", uploaded.file)
      }

      // Do NOT set Content-Type — browser sets it with the correct boundary
      const response = await fetch("/api/fir", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Server error")
      }

      setResult(data as SubmissionResult)

      toast({
        title: "FIR Submitted Successfully",
        description: `FIR ${data.firId} has been recorded on the blockchain.`,
      })
    } catch (error) {
      console.error("FIR submission error:", error)
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Unable to submit FIR. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: "Copied", description: `${label} copied to clipboard.` })
  }

  const handleCloseResult = () => {
    setResult(null)
    router.push("/dashboard/citizen/my-firs")
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("citizen.fileFir.title")}</h1>
        <p className="text-muted-foreground">
          {t("citizen.fileFir.desc")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("citizen.fileFir.cardTitle")}</CardTitle>
          <CardDescription>
            {t("citizen.fileFir.cardDesc")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">{t("citizen.fileFir.titleLabel")} *</Label>
              <Input
                id="title"
                placeholder={t("citizen.fileFir.titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("citizen.fileFir.descLabel")} *</Label>
              <Textarea
                id="description"
                placeholder={t("citizen.fileFir.descPlaceholder")}
                className="min-h-32"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">{t("citizen.fileFir.locationLabel")} *</Label>
                <Input
                  id="location"
                  placeholder={t("citizen.fileFir.locationPlaceholder")}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">{t("citizen.fileFir.dateLabel")} *</Label>
                <Input
                  id="date"
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>{t("citizen.fileFir.evidenceLabel")}</Label>

              <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-border p-6">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground text-center">
                  {t("citizen.fileFir.dragDrop")}
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/quicktime"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  {t("citizen.fileFir.selectFiles")}
                </Button>
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("citizen.fileFir.submitting")}
                  </>
                ) : (
                  t("citizen.fileFir.submit")
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                {t("citizen.fileFir.cancel")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Success Dialog */}
      <Dialog open={!!result} onOpenChange={handleCloseResult}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {t("citizen.fileFir.successTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("citizen.fileFir.successDesc")}
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-4">
              {/* FIR ID */}
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground mb-1">{t("citizen.fileFir.firId")}</p>
                <p className="font-mono font-semibold text-foreground">{result.firId}</p>
              </div>

              {/* Tx Hash */}
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground mb-1">{t("citizen.fileFir.txHash")}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs break-all">{result.txHash}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => copyToClipboard(result.txHash, "Tx Hash")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Block #{result.blockNumber}</p>
              </div>

              {/* IPFS CID */}
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground mb-1">{t("citizen.fileFir.ipfsCid")}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs break-all">{result.ipfsCid}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={() => copyToClipboard(result.ipfsCid, "IPFS CID")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${result.ipfsCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* SHA-256 Hash */}
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground mb-1">{t("citizen.fileFir.dataHash")}</p>
                <code className="text-xs break-all">{result.storedHash}</code>
              </div>

              {result.evidenceCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {result.evidenceCount} evidence file{result.evidenceCount > 1 ? "s" : ""} uploaded to IPFS.
                </p>
              )}

              <Button onClick={handleCloseResult} className="w-full">
                {t("citizen.fileFir.viewMyFirs")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
