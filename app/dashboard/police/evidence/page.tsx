"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, ImageIcon, Video, FileText, File, Copy, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFIRs } from "@/hooks/use-firs"
import { useLanguage } from "@/lib/i18n/language-context"

type FileFilter = "all" | "image" | "video" | "pdf"

export default function EvidenceViewerPage() {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [fileFilter, setFileFilter] = useState<FileFilter>("all")
  const { firs, loading } = useFIRs()
  const { t } = useLanguage()

  const firsWithEvidence = firs.filter(
    (fir) =>
      fir.evidenceFiles.length > 0 || (fir.policeEvidenceFiles && fir.policeEvidenceFiles.length > 0)
  )

  const filteredFIRs = firsWithEvidence.filter(
    (fir) =>
      fir.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fir.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const matchesFilter = (type: string) => {
    if (fileFilter === "all") return true
    if (fileFilter === "image") return type.startsWith("image/")
    if (fileFilter === "video") return type.startsWith("video/")
    if (fileFilter === "pdf") return type === "application/pdf"
    return true
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon
    if (type.startsWith("video/")) return Video
    if (type === "application/pdf") return FileText
    return File
  }

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
    toast({
      title: "Copied",
      description: `${label} copied to clipboard.`,
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const filterButtons: { label: string; value: FileFilter }[] = [
    { label: t("police.evidence.filterAll"), value: "all" },
    { label: t("police.evidence.filterImages"), value: "image" },
    { label: t("police.evidence.filterVideos"), value: "video" },
    { label: t("police.evidence.filterDocs"), value: "pdf" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("police.evidence.title")}</h1>
        <p className="text-muted-foreground">{t("police.evidence.desc")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("police.evidence.cardTitle")}</CardTitle>
          <CardDescription>{t("police.evidence.cardDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("police.evidence.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {filterButtons.map((btn) => (
                <Button
                  key={btn.value}
                  variant={fileFilter === btn.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFileFilter(btn.value)}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t("police.evidence.loading")}</div>
          ) : filteredFIRs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{t("police.evidence.noFiles")}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredFIRs.map((fir) => {
                const citizenFiles = fir.evidenceFiles.filter((f) => matchesFilter(f.type))
                const policeFiles = (fir.policeEvidenceFiles ?? []).filter((f) => matchesFilter(f.type))
                if (citizenFiles.length === 0 && policeFiles.length === 0) return null

                return (
                  <div key={fir.id} className="rounded-lg border border-border">
                    <div className="p-4 bg-secondary/30 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">{fir.id}</p>
                          <p className="text-sm text-muted-foreground">{fir.title}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {citizenFiles.length + policeFiles.length} {t("police.evidence.files")}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 space-y-4">
                      {citizenFiles.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{t("police.evidence.citizenEvidence")}</Badge>
                          </div>
                          {citizenFiles.map((file) => {
                            const FileIcon = getFileIcon(file.type)
                            return (
                              <div key={file.id} className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                                    <FileIcon className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{formatFileSize(file.size)}</span>
                                      <span>|</span>
                                      <span>{file.type}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(file.ipfsCid, "IPFS CID")}>
                                    <Copy className="h-4 w-4 mr-1" />
                                    {t("police.evidence.cid")}
                                  </Button>
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={`https://ipfs.io/ipfs/${file.ipfsCid}`} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      {t("police.evidence.view")}
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {policeFiles.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="default">{t("police.evidence.policeEvidence")}</Badge>
                          </div>
                          {policeFiles.map((file, idx) => {
                            const FileIcon = getFileIcon(file.type)
                            return (
                              <div key={idx} className="flex items-center justify-between rounded-lg bg-primary/5 p-3">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                                    <FileIcon className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>{formatFileSize(file.size)}</span>
                                      <span>|</span>
                                      <span>{t("police.evidence.uploadedBy")}: {file.uploadedBy}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(file.ipfsCid, "IPFS CID")}>
                                    <Copy className="h-4 w-4 mr-1" />
                                    {t("police.evidence.cid")}
                                  </Button>
                                  <Button variant="ghost" size="sm" asChild>
                                    <a href={`https://ipfs.io/ipfs/${file.ipfsCid}`} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4 mr-1" />
                                      {t("police.evidence.view")}
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
