"use client"

/**
 * app/dashboard/citizen/file-fir/page.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Multi-step FIR filing form structured to mirror the real NCRB I.I.F.-I
 * (Integrated Investigation Form) used by Indian police stations.
 *
 * Steps:
 *   1. Incident Details   — dates, times, place, district, police station
 *   2. Offence            — type of information, applicable Acts & Sections
 *   3. Complainant        — personal info (pre-filled from session where possible)
 *   4. Accused            — details of known / suspected accused
 *   5. Narrative          — First Information Contents, delay reason, property
 *   6. Evidence           — file uploads to IPFS
 *
 * Only steps 1 + 5 (+ pincode) are strictly required by the API. All other
 * fields follow the real NCRB form but are optional to accommodate partial info.
 */

import { type ChangeEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import {
  Upload, X, FileIcon, Loader2, CheckCircle, Copy, ExternalLink,
  ChevronRight, ChevronLeft, Plus, Trash2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// ── Types ──────────────────────────────────────────────────────────────────────

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
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

interface ActRow {
  act: string
  sections: string
}

interface AccusedRow {
  name: string
  alias: string
  relativeName: string
  address: string
}

interface PropertyRow {
  category: string
  type: string
  description: string
  value: string
}

// ── Step config ────────────────────────────────────────────────────────────────

// ── Helper components ──────────────────────────────────────────────────────────

function SectionTitle({ num, title }: { num: string | number; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
        {num}
      </span>
      <h3 className="font-semibold text-base text-foreground">{title}</h3>
    </div>
  )
}

function FieldRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid gap-4 ${className}`}>{children}</div>
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FileFIRPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { t } = useLanguage()

  const STEPS = [
    { id: 1, label: t("citizen.fileFir.stepIncidentDetails") },
    { id: 2, label: t("citizen.fileFir.stepOffence") },
    { id: 3, label: t("citizen.fileFir.stepComplainant") },
    { id: 4, label: t("citizen.fileFir.stepAccused") },
    { id: 5, label: t("citizen.fileFir.stepNarrative") },
    { id: 6, label: t("citizen.fileFir.stepEvidence") },
  ]

  const [step, setStep] = useState(1)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<SubmissionResult | null>(null)

  // ── Step 1: Incident Details ─────────────────────────────────────────────────
  const [district, setDistrict] = useState("")
  const [policeStation, setPoliceStation] = useState("")
  const [pincode, setPincode] = useState("")
  const [incidentDate, setIncidentDate] = useState("")
  const [incidentDateTo, setIncidentDateTo] = useState("")
  const [incidentTimeFrom, setIncidentTimeFrom] = useState("")
  const [incidentTimeTo, setIncidentTimeTo] = useState("")
  const [placeAddress, setPlaceAddress] = useState("")
  const [distanceFromPS, setDistanceFromPS] = useState("")
  // location is the short "area name" used in list views + hash; placeAddress is the full address
  const [location, setLocation] = useState("")

  // ── Step 2: Offence ──────────────────────────────────────────────────────────
  const [acts, setActs] = useState<ActRow[]>([{ act: "", sections: "" }])
  // title = brief description of the offence (shown in lists)
  const [title, setTitle] = useState("")

  const addActRow = () => setActs((prev) => [...prev, { act: "", sections: "" }])
  const removeActRow = (i: number) => setActs((prev) => prev.filter((_, idx) => idx !== i))
  const updateActRow = (i: number, field: keyof ActRow, val: string) =>
    setActs((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  // ── Step 3: Complainant ──────────────────────────────────────────────────────
  const [fathersName, setFathersName] = useState("")
  const [dob, setDob] = useState("")
  const [nationality, setNationality] = useState("Indian")
  const [uid, setUid] = useState("")
  const [idProofType, setIdProofType] = useState("")
  const [idProofNumber, setIdProofNumber] = useState("")
  const [occupation, setOccupation] = useState("")
  const [mobile, setMobile] = useState("")
  const [currentAddress, setCurrentAddress] = useState("")
  const [permanentAddress, setPermanentAddress] = useState("")
  const [sameAddress, setSameAddress] = useState(false)

  // ── Step 4: Accused ──────────────────────────────────────────────────────────
  const [accused, setAccused] = useState<AccusedRow[]>([{ name: "", alias: "", relativeName: "", address: "" }])
  const [unknownAccused, setUnknownAccused] = useState(false)

  const addAccusedRow = () => setAccused((prev) => [...prev, { name: "", alias: "", relativeName: "", address: "" }])
  const removeAccusedRow = (i: number) => setAccused((prev) => prev.filter((_, idx) => idx !== i))
  const updateAccused = (i: number, field: keyof AccusedRow, val: string) =>
    setAccused((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  // ── Step 5: Narrative ────────────────────────────────────────────────────────
  const [firstInformationContents, setFirstInformationContents] = useState("")
  const [delayReason, setDelayReason] = useState("")
  const [properties, setProperties] = useState<PropertyRow[]>([])

  const addPropertyRow = () => setProperties((prev) => [...prev, { category: "", type: "", description: "", value: "" }])
  const removePropertyRow = (i: number) => setProperties((prev) => prev.filter((_, idx) => idx !== i))
  const updateProperty = (i: number, field: keyof PropertyRow, val: string) =>
    setProperties((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)))

  const totalPropertyValue = properties.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0)

  // ── Step 6: Evidence + Declaration ──────────────────────────────────────────
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [declarationChecked, setDeclarationChecked] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null)

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
    e.target.value = ""
  }

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id))

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // ── Navigation ────────────────────────────────────────────────────────────────

  const nextStep = () => {
    setCompletedSteps((prev) => new Set([...prev, step]))
    setStep((s) => Math.min(s + 1, STEPS.length))
  }

  const prevStep = () => setStep((s) => Math.max(s - 1, 1))

  // ── Submit ────────────────────────────────────────────────────────────────────

  const isStepComplete = (stepId: number): boolean => {
    if (stepId === 1) return !!(pincode && /^\d{6}$/.test(pincode) && incidentDate && location.trim())
    if (stepId === 2) return !!(title.trim())
    if (stepId === 5) return !!(firstInformationContents.trim())
    // Optional steps only show tick after the user has explicitly moved past them
    return completedSteps.has(stepId)
  }

  const handleSubmit = async () => {
    // Validate all required fields across all steps before submitting
    const missingFields: string[] = []
    if (!pincode || !/^\d{6}$/.test(pincode)) missingFields.push("Incident Details (Step 1): Valid 6-digit pincode")
    if (!incidentDate) missingFields.push("Incident Details (Step 1): Date of occurrence")
    if (!location.trim()) missingFields.push("Incident Details (Step 1): Area / locality name")
    if (!title.trim()) missingFields.push("Offence Details (Step 2): Brief description of offence")
    if (!firstInformationContents.trim()) missingFields.push("Narrative (Step 5): First Information Contents")
    if (!declarationChecked) missingFields.push("Declaration (Step 6): You must accept the truth declaration")
    if (!signatureFile) missingFields.push("Declaration (Step 6): Signature image (PNG or JPG) is required")
    if (missingFields.length > 0) {
      toast({
        title: `${missingFields.length} Required Field${missingFields.length > 1 ? "s" : ""} Missing`,
        description: missingFields.join(" • "),
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()

      // Core fields (required by API + used in integrity hash)
      formData.append("title", title)
      // description = summary of firstInformationContents for list views
      formData.append("description", firstInformationContents.slice(0, 500))
      formData.append("location", location)
      formData.append("incidentDate", incidentDate)
      formData.append("pincode", pincode)

      // Extended NCRB fields
      if (district) formData.append("district", district)
      if (policeStation) formData.append("policeStation", policeStation)
      if (incidentDateTo) formData.append("incidentDateTo", incidentDateTo)
      if (incidentTimeFrom) formData.append("incidentTimeFrom", incidentTimeFrom)
      if (incidentTimeTo) formData.append("incidentTimeTo", incidentTimeTo)
      formData.append("typeOfInformation", "written")
      if (placeAddress) formData.append("placeAddress", placeAddress)
      if (distanceFromPS) formData.append("distanceFromPS", distanceFromPS)
      if (delayReason) formData.append("delayReason", delayReason)
      if (firstInformationContents) formData.append("firstInformationContents", firstInformationContents)
      if (totalPropertyValue > 0) formData.append("totalPropertyValue", String(totalPropertyValue))

      // JSON sub-documents
      const validActs = acts.filter((a) => a.act.trim())
      if (validActs.length > 0) formData.append("acts", JSON.stringify(validActs))

      const validAccused = unknownAccused
        ? [{ name: "Unknown", alias: "", relativeName: "", address: "" }]
        : accused.filter((a) => a.name.trim())
      if (validAccused.length > 0) formData.append("accusedDetails", JSON.stringify(validAccused))

      const validProperties = properties.filter((p) => p.description.trim())
      if (validProperties.length > 0) formData.append("propertyDetails", JSON.stringify(validProperties))

      const cd = {
        fathersName: fathersName || undefined,
        dob: dob || undefined,
        nationality: nationality || undefined,
        occupation: occupation || undefined,
        mobile: mobile || undefined,
        currentAddress: currentAddress || undefined,
        permanentAddress: sameAddress ? currentAddress : (permanentAddress || undefined),
        idProofType: idProofType || undefined,
        idProofNumber: idProofNumber || undefined,
        uid: uid || undefined,
      }
      formData.append("complainantDetails", JSON.stringify(cd))

      // Declaration & signature image
      formData.append("declarationAccepted", "true")
      if (signatureFile) formData.append("signatureImage", signatureFile)

      // Evidence files
      for (const uploaded of files) {
        formData.append("files", uploaded.file)
      }

      const response = await fetch("/api/fir", { method: "POST", body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.details || data.error || "Server error")

      setResult(data as SubmissionResult)
      toast({ title: t("citizen.fileFir.firFiledTitle"), description: `FIR ${data.firId} ${t("citizen.fileFir.firRecorded")}` })
    } catch (error) {
      toast({
        title: t("citizen.fileFir.submissionFailed"),
        description: error instanceof Error ? error.message : t("citizen.fileFir.submissionFailedDesc"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
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
    toast({ title: t("common.copied"), description: `${label} copied to clipboard.` })
  }

  const handleCloseResult = () => {
    setResult(null)
    router.push("/dashboard/citizen/my-firs")
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("citizen.fileFir.title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("citizen.fileFir.pageDesc")}
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                step === s.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/20 text-primary hover:bg-primary/30"
              }`}
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                isStepComplete(s.id) ? "bg-green-500 text-white" : step === s.id ? "bg-primary-foreground text-primary" : ""
              }`}>
                {isStepComplete(s.id) ? "✓" : s.id}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <div className="w-4 h-px bg-border flex-shrink-0" />}
          </div>
        ))}
      </div>

      <div>
        <Card>
          {/* ── STEP 1: Incident Details ────────────────────────────────────── */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>{t("citizen.fileFir.stepIncidentDetails")}</CardTitle>
                <CardDescription>{t("citizen.fileFir.step1Desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* District / Police Station */}
                <div>
                  <SectionTitle num="A" title={t("citizen.fileFir.policeStationInfo")} />
                  <FieldRow className="sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="district">{t("citizen.fileFir.district")}</Label>
                      <Input id="district" placeholder="e.g. Ahmedabad" value={district} onChange={(e) => setDistrict(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="policeStation">{t("citizen.fileFir.policeStationLabel")}</Label>
                      <Input id="policeStation" placeholder="e.g. Navrangpura P.S." value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} />
                    </div>
                  </FieldRow>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="pincode">{t("citizen.fileFir.areaPincode")} <span className="text-destructive">*</span></Label>
                    <Input
                      id="pincode"
                      placeholder="6-digit pincode of the incident area (e.g. 400001)"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      inputMode="numeric"
                      pattern="\d{6}"
                    />
                    <p className="text-xs text-muted-foreground">{t("citizen.fileFir.pincodeRouteHint")}</p>
                  </div>
                </div>

                {/* Dates & Times */}
                <div>
                  <SectionTitle num="B" title={t("citizen.fileFir.dateTimeTitle")} />
                  <FieldRow className="sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="incidentDate">{t("citizen.fileFir.dateFrom")} <span className="text-destructive">*</span></Label>
                      <Input id="incidentDate" type="date" value={incidentDate} onChange={(e) => setIncidentDate(e.target.value)} onKeyDown={(e) => e.preventDefault()} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incidentDateTo">{t("citizen.fileFir.dateTo")}</Label>
                      <Input
                        id="incidentDateTo"
                        type="date"
                        value={incidentDateTo}
                        min={incidentDate}
                        onKeyDown={(e) => e.preventDefault()}
                        onChange={(e) => {
                          const val = e.target.value
                          if (val && incidentDate && val < incidentDate) {
                            toast({ title: t("citizen.fileFir.invalidDate"), description: t("citizen.fileFir.invalidDateDesc"), variant: "destructive" })
                            setIncidentDateTo("")
                            return
                          }
                          setIncidentDateTo(val)
                        }}
                      />
                    </div>
                  </FieldRow>
                  <FieldRow className="sm:grid-cols-2 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="incidentTimeFrom">{t("citizen.fileFir.timeFrom")}</Label>
                      <Input id="incidentTimeFrom" type="time" value={incidentTimeFrom} onChange={(e) => setIncidentTimeFrom(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incidentTimeTo">{t("citizen.fileFir.timeTo")}</Label>
                      <Input id="incidentTimeTo" type="time" value={incidentTimeTo} onChange={(e) => setIncidentTimeTo(e.target.value)} />
                    </div>
                  </FieldRow>
                </div>

                {/* Place */}
                <div>
                  <SectionTitle num="C" title={t("citizen.fileFir.placeTitle")} />
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">{t("citizen.fileFir.areaLocality")} <span className="text-destructive">*</span></Label>
                      <Input
                        id="location"
                        placeholder="e.g. Andheri West, Mumbai"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">{t("citizen.fileFir.areaLocalityHint")}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="placeAddress">{t("citizen.fileFir.fullAddress")}</Label>
                      <Textarea
                        id="placeAddress"
                        placeholder="Complete address: house no., street, landmark, area, city"
                        value={placeAddress}
                        onChange={(e) => setPlaceAddress(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="distanceFromPS">{t("citizen.fileFir.directionDistance")}</Label>
                      <Input id="distanceFromPS" placeholder="e.g. West, 0.1 km" value={distanceFromPS} onChange={(e) => setDistanceFromPS(e.target.value)} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* ── STEP 2: Offence ──────────────────────────────────────────────── */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>{t("citizen.fileFir.step2CardTitle")}</CardTitle>
                <CardDescription>{t("citizen.fileFir.step2Desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">{t("citizen.fileFir.offenceDescLabel")} <span className="text-destructive">*</span></Label>
                  <Input
                    id="title"
                    placeholder="e.g. Theft of mobile phone, Assault, Cheating under IPC"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">{t("citizen.fileFir.offenceHint")}</p>
                </div>


                {/* Acts & Sections table */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>{t("citizen.fileFir.actsLabel")}</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addActRow}>
                      <Plus className="h-3 w-3 mr-1" /> {t("citizen.fileFir.addRow")}
                    </Button>
                  </div>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">S.No.</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("citizen.fileFir.actAdhiniyam")}</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground w-36">{t("citizen.fileFir.sectionsKalam")}</th>
                          <th className="px-3 py-2 w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {acts.map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-2">
                              <Input
                                placeholder="e.g. Indian Penal Code, 1860"
                                value={row.act}
                                onChange={(e) => updateActRow(i, "act", e.target.value)}
                                className="h-8 border-0 shadow-none px-0 focus-visible:ring-0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input
                                placeholder="e.g. 420, 467"
                                value={row.sections}
                                onChange={(e) => updateActRow(i, "sections", e.target.value)}
                                className="h-8 border-0 shadow-none px-0 focus-visible:ring-0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              {acts.length > 1 && (
                                <button type="button" onClick={() => removeActRow(i)} className="text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("citizen.fileFir.commonActsHint")}
                  </p>
                </div>
              </CardContent>
            </>
          )}

          {/* ── STEP 3: Complainant ───────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>{t("citizen.fileFir.step3CardTitle")}</CardTitle>
                <CardDescription>{t("citizen.fileFir.step3Desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Name from session */}
                <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("citizen.fileFir.nameFromAccount")}</p>
                    <p className="font-medium">{user?.name}</p>
                  </div>
                  <Badge variant="secondary">{t("citizen.fileFir.autoFilled")}</Badge>
                </div>

                <FieldRow className="sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fathersName">{t("citizen.fileFir.fathersHusbandName")}</Label>
                    <Input id="fathersName" placeholder={t("citizen.fileFir.asPerIdProof")} value={fathersName} onChange={(e) => setFathersName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">{t("citizen.fileFir.dobYear")}</Label>
                    <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                </FieldRow>

                <FieldRow className="sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nationality">{t("citizen.fileFir.nationality")}</Label>
                    <Input id="nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="occupation">{t("citizen.fileFir.occupation")}</Label>
                    <Input id="occupation" placeholder="e.g. Farmer, Engineer, Student" value={occupation} onChange={(e) => setOccupation(e.target.value)} />
                  </div>
                </FieldRow>

                <FieldRow className="sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="mobile">{t("citizen.fileFir.mobileNumber")}</Label>
                    <Input id="mobile" type="tel" placeholder="10-digit mobile" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uid">{t("citizen.fileFir.uidLabel")}</Label>
                    <Input id="uid" placeholder="12-digit Aadhaar" value={uid} onChange={(e) => setUid(e.target.value.replace(/\D/g, "").slice(0, 12))} inputMode="numeric" />
                  </div>
                </FieldRow>

                {/* ID Proof */}
                <div>
                  <Label className="mb-3 block">{t("citizen.fileFir.idProofDetails")}</Label>
                  <FieldRow className="sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="idProofType">{t("citizen.fileFir.idType")}</Label>
                      <select
                        id="idProofType"
                        value={idProofType}
                        onChange={(e) => setIdProofType(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">{t("citizen.fileFir.selectIdType")}</option>
                        <option>{t("citizen.fileFir.idAadhaar")}</option>
                        <option>{t("citizen.fileFir.idVoter")}</option>
                        <option>{t("citizen.fileFir.idPan")}</option>
                        <option>{t("citizen.fileFir.idPassport")}</option>
                        <option>{t("citizen.fileFir.idDriving")}</option>
                        <option>{t("citizen.fileFir.idRation")}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="idProofNumber">{t("citizen.fileFir.idNumber")}</Label>
                      <Input id="idProofNumber" placeholder="ID card number" value={idProofNumber} onChange={(e) => setIdProofNumber(e.target.value)} />
                    </div>
                  </FieldRow>
                </div>

                {/* Addresses */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentAddress">{t("citizen.fileFir.currentAddress")}</Label>
                    <Textarea id="currentAddress" placeholder="House No., Street, Area, City, State, PIN" value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} rows={3} />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={sameAddress} onChange={(e) => setSameAddress(e.target.checked)} className="accent-primary" />
                    {t("citizen.fileFir.sameAddressCheck")}
                  </label>
                  {!sameAddress && (
                    <div className="space-y-2">
                      <Label htmlFor="permanentAddress">{t("citizen.fileFir.permanentAddress")}</Label>
                      <Textarea id="permanentAddress" placeholder="House No., Street, Area, City, State, PIN" value={permanentAddress} onChange={(e) => setPermanentAddress(e.target.value)} rows={3} />
                    </div>
                  )}
                </div>
              </CardContent>
            </>
          )}

          {/* ── STEP 4: Accused ────────────────────────────────────────────────── */}
          {step === 4 && (
            <>
              <CardHeader>
                <CardTitle>{t("citizen.fileFir.step4CardTitle")}</CardTitle>
                <CardDescription>{t("citizen.fileFir.step4Desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={unknownAccused}
                    onChange={(e) => setUnknownAccused(e.target.checked)}
                    className="accent-primary"
                  />
                  {t("citizen.fileFir.accusedUnknown")}
                </label>

                {!unknownAccused && (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border overflow-x-auto">
                      <table className="w-full text-sm min-w-[600px]">
                        <thead className="bg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">S.No.</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("citizen.fileFir.accusedName")}</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("citizen.fileFir.accusedAlias")}</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("citizen.fileFir.accusedRelativeName")}</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("citizen.fileFir.accusedAddress")}</th>
                            <th className="px-3 py-2 w-8" />
                          </tr>
                        </thead>
                        <tbody>
                          {accused.map((row, i) => (
                            <tr key={i} className="border-t border-border">
                              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2">
                                <Input placeholder="Full name" value={row.name} onChange={(e) => updateAccused(i, "name", e.target.value)} className="h-8 border-0 shadow-none px-0 focus-visible:ring-0 min-w-[120px]" />
                              </td>
                              <td className="px-3 py-2">
                                <Input placeholder="Alias / उर्फनाव" value={row.alias} onChange={(e) => updateAccused(i, "alias", e.target.value)} className="h-8 border-0 shadow-none px-0 focus-visible:ring-0 min-w-[100px]" />
                              </td>
                              <td className="px-3 py-2">
                                <Input placeholder="Father / spouse" value={row.relativeName} onChange={(e) => updateAccused(i, "relativeName", e.target.value)} className="h-8 border-0 shadow-none px-0 focus-visible:ring-0 min-w-[120px]" />
                              </td>
                              <td className="px-3 py-2">
                                <Input placeholder="Current address" value={row.address} onChange={(e) => updateAccused(i, "address", e.target.value)} className="h-8 border-0 shadow-none px-0 focus-visible:ring-0 min-w-[150px]" />
                              </td>
                              <td className="px-3 py-2">
                                {accused.length > 1 && (
                                  <button type="button" onClick={() => removeAccusedRow(i)} className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addAccusedRow}>
                      <Plus className="h-3 w-3 mr-1" /> {t("citizen.fileFir.addAccused")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </>
          )}

          {/* ── STEP 5: Narrative ─────────────────────────────────────────────── */}
          {step === 5 && (
            <>
              <CardHeader>
                <CardTitle>{t("citizen.fileFir.step5CardTitle")}</CardTitle>
                <CardDescription>{t("citizen.fileFir.step5Desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Narrative */}
                <div>
                  <SectionTitle num={12} title={t("citizen.fileFir.step5CardTitle")} />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t("citizen.fileFir.narrativeLabel")} <span className="text-destructive">*</span></Label>
                    <Textarea
                      placeholder={t("citizen.fileFir.narrativePlaceholder")}
                      className="min-h-48"
                      value={firstInformationContents}
                      onChange={(e) => setFirstInformationContents(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground text-right">{firstInformationContents.length} / 10000 characters</p>
                  </div>
                </div>

                {/* Delay reason */}
                <div>
                  <SectionTitle num={8} title={t("citizen.fileFir.delayReasonLabel")} />
                  <Textarea
                    placeholder={t("citizen.fileFir.delayReasonPlaceholder")}
                    rows={3}
                    value={delayReason}
                    onChange={(e) => setDelayReason(e.target.value)}
                  />
                </div>

                {/* Property details */}
                <div>
                  <SectionTitle num={9} title={t("citizen.fileFir.propertyTitle")} />
                  <div className="space-y-4">
                    {properties.length > 0 && (
                      <div className="rounded-lg border border-border overflow-x-auto">
                        <table className="w-full text-sm min-w-[500px]">
                          <thead className="bg-muted">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">S.No.</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("citizen.fileFir.propertyCategory")}</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("citizen.fileFir.propertyType")}</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("citizen.fileFir.propertyDescCol")}</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">{t("citizen.fileFir.propertyValue")}</th>
                              <th className="px-3 py-2 w-8" />
                            </tr>
                          </thead>
                          <tbody>
                            {properties.map((row, i) => (
                              <tr key={i} className="border-t border-border">
                                <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                <td className="px-3 py-2">
                                  <select value={row.category} onChange={(e) => updateProperty(i, "category", e.target.value)}
                                    className="h-8 rounded border border-input bg-background px-2 text-xs min-w-[100px]">
                                    <option value="">{t("common.select")}</option>
                                    <option>{t("citizen.fileFir.propMovable")}</option>
                                    <option>{t("citizen.fileFir.propImmovable")}</option>
                                    <option>{t("citizen.fileFir.propDocuments")}</option>
                                    <option>{t("citizen.fileFir.propElectronic")}</option>
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <Input placeholder="e.g. Cash, Jewellery" value={row.type} onChange={(e) => updateProperty(i, "type", e.target.value)} className="h-8 border-0 shadow-none px-0 focus-visible:ring-0 min-w-[100px]" />
                                </td>
                                <td className="px-3 py-2">
                                  <Input placeholder="Describe the property" value={row.description} onChange={(e) => updateProperty(i, "description", e.target.value)} className="h-8 border-0 shadow-none px-0 focus-visible:ring-0 min-w-[150px]" />
                                </td>
                                <td className="px-3 py-2">
                                  <Input type="number" placeholder="0" value={row.value} onChange={(e) => updateProperty(i, "value", e.target.value)} className="h-8 border-0 shadow-none px-0 focus-visible:ring-0 min-w-[80px]" />
                                </td>
                                <td className="px-3 py-2">
                                  <button type="button" onClick={() => removePropertyRow(i)} className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          {properties.length > 0 && (
                            <tfoot className="border-t border-border bg-muted/50">
                              <tr>
                                <td colSpan={4} className="px-3 py-2 text-right text-sm font-medium">{t("citizen.fileFir.totalValue")}</td>
                                <td className="px-3 py-2 font-bold text-sm">{totalPropertyValue.toLocaleString("en-IN")}</td>
                                <td />
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}
                    <Button type="button" variant="outline" size="sm" onClick={addPropertyRow}>
                      <Plus className="h-3 w-3 mr-1" /> {t("citizen.fileFir.addProperty")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* ── STEP 6: Evidence ──────────────────────────────────────────────── */}
          {step === 6 && (
            <>
              <CardHeader>
                <CardTitle>{t("citizen.fileFir.step6CardTitle")}</CardTitle>
                <CardDescription>{t("citizen.fileFir.step6Desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center rounded-lg border-2 border-dashed border-border p-8">
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    {t("citizen.fileFir.dragDropText")}
                    <br />
                    <span className="text-xs">{t("citizen.fileFir.acceptedFilesText")}</span>
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
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                        <div className="flex items-center gap-3">
                          <FileIcon className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary before submission */}
                <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-2 text-sm">
                  <p className="font-medium text-foreground">{t("citizen.fileFir.reviewSummary")}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{t("citizen.fileFir.reviewOffence")}</span><span className="text-foreground font-medium truncate">{title || "—"}</span>
                    <span>{t("citizen.fileFir.reviewDate")}</span><span className="text-foreground">{incidentDate || "—"}{incidentDateTo ? ` → ${incidentDateTo}` : ""}</span>
                    <span>{t("citizen.fileFir.reviewLocation")}</span><span className="text-foreground">{location || "—"}</span>
                    <span>{t("citizen.fileFir.reviewPincode")}</span><span className="text-foreground">{pincode || "—"}</span>
                    <span>{t("citizen.fileFir.reviewActs")}</span><span className="text-foreground">{acts.filter(a => a.act).length} act(s)</span>
                    <span>{t("citizen.fileFir.reviewAccused")}</span><span className="text-foreground">{unknownAccused ? t("citizen.fileFir.reviewUnknown") : `${accused.filter(a => a.name).length} person(s)`}</span>
                    <span>{t("citizen.fileFir.reviewEvidence")}</span><span className="text-foreground">{files.length} file(s)</span>
                  </div>
                </div>

                {/* Truth Declaration */}
                <div className="rounded-lg border border-border p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Declaration</h4>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={declarationChecked}
                      onChange={(e) => setDeclarationChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-primary flex-shrink-0"
                    />
                    <span className="text-sm text-foreground leading-relaxed">
                      I hereby declare that the information provided in this First Information Report is true and correct to the best of my knowledge and belief. I understand that providing false information is a punishable offence under applicable law.
                    </span>
                  </label>

                  <div className="space-y-2">
                    <Label>
                      Signature Image <span className="text-destructive">*</span>
                    </Label>
                    {signaturePreview ? (
                      <div className="relative inline-block">
                        <img
                          src={signaturePreview}
                          alt="Signature preview"
                          className="max-h-24 max-w-xs rounded border border-border bg-white p-2 object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => { setSignatureFile(null); setSignaturePreview(null) }}
                          className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center text-xs leading-none"
                          title="Remove signature"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-input rounded-md cursor-pointer hover:border-primary transition-colors bg-muted/30">
                        <span className="text-sm text-muted-foreground">Click to upload signature image</span>
                        <span className="text-xs text-muted-foreground mt-1">PNG or JPG, max 1 MB</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setSignatureFile(file)
                            setSignaturePreview(URL.createObjectURL(file))
                          }}
                        />
                      </label>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Upload a clear image of your handwritten signature. It will be stored on IPFS and permanently linked to this FIR.
                    </p>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {/* ── Navigation buttons ────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 pb-6 pt-2">
            <Button type="button" variant="outline" onClick={step === 1 ? () => router.back() : prevStep}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step === 1 ? t("citizen.fileFir.cancel") : t("citizen.fileFir.previous")}
            </Button>

            {step < STEPS.length ? (
              <Button type="button" onClick={nextStep}>
                {t("common.next")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !declarationChecked || !signatureFile}
                title={!declarationChecked ? "Accept the declaration first" : !signatureFile ? "Upload your signature image" : undefined}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("citizen.fileFir.submittingFir")}</>
                ) : (
                  t("citizen.fileFir.submit")
                )}
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* ── Success Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={!!result} onOpenChange={handleCloseResult}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {t("citizen.fileFir.firFiledTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("citizen.fileFir.firFiledDesc")}
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-4">
              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground mb-1">{t("citizen.fileFir.firNumber")}</p>
                <p className="font-mono font-semibold text-foreground text-lg">{result.firId}</p>
              </div>

              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground mb-1">{t("citizen.fileFir.txHashLabel")}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs break-all">{result.txHash}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(result.txHash, "Tx Hash")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Block #{result.blockNumber}</p>
              </div>

              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground mb-1">{t("citizen.fileFir.ipfsCidFull")}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs break-all">{result.ipfsCid}</code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => copyToClipboard(result.ipfsCid, "IPFS CID")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                  <a href={`https://gateway.pinata.cloud/ipfs/${result.ipfsCid}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground mb-1">{t("citizen.fileFir.integrityHash")}</p>
                <code className="text-xs break-all">{result.storedHash}</code>
              </div>

              {result.evidenceCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {result.evidenceCount} {t("citizen.fileFir.evidenceUploadedText")}
                </p>
              )}

              <Button onClick={handleCloseResult} className="w-full">{t("citizen.fileFir.viewMyFirs")}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
