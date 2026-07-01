"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { useLanguage } from "@/lib/i18n/language-context"
import { User, Mail, Phone, Shield, BadgeCheck, Building2, Calendar, Loader2, Save, ArrowLeft, KeyRound, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

interface ProfileData {
  userId: string
  email: string
  name: string
  role: string
  phone: string | null
  gender: string | null
  dateOfBirth: string | null
  badgeNumber: string | null
  policeStation: string | null
  pincode: string | null
  walletAddress: string | null
  emailVerified: boolean
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const { toast } = useToast()
  const { t } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login")
  }, [isLoading, isAuthenticated, router])

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Change password fields
  const [pwForm, setPwForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" })
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  // Editable fields
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [gender, setGender] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [badgeNumber, setBadgeNumber] = useState("")
  const [policeStation, setPoliceStation] = useState("")

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/auth/profile")
        if (!res.ok) throw new Error("Failed to load profile")
        const data: ProfileData = await res.json()
        setProfile(data)
        setName(data.name ?? "")
        setPhone(data.phone ?? "")
        setGender(data.gender ?? "")
        setDateOfBirth(data.dateOfBirth ?? "")
        setBadgeNumber(data.badgeNumber ?? "")
        setPoliceStation(data.policeStation ?? "")
      } catch {
        toast({ title: t("common.error"), description: t("profile.loadError"), variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [toast, t])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, string> = { name, phone }
      if (profile?.role === "citizen") {
        body.gender = gender
        body.dateOfBirth = dateOfBirth
      }
      if (profile?.role === "police") {
        body.badgeNumber = badgeNumber
        body.policeStation = policeStation
      }

      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Update failed")
      }
      toast({ title: t("profile.updateSuccess"), description: t("profile.updateSuccessDesc") })
    } catch (err) {
      toast({ title: t("profile.updateFailed"), description: err instanceof Error ? err.message : t("common.error"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirmPassword) {
      toast({ title: t("auth.validationError"), description: t("sidebar.allFieldsRequired"), variant: "destructive" })
      return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast({ title: t("auth.validationError"), description: t("sidebar.passwordsNotMatch"), variant: "destructive" })
      return
    }
    if (pwForm.newPassword.length < 8) {
      toast({ title: t("auth.validationError"), description: t("sidebar.passwordMinLength"), variant: "destructive" })
      return
    }
    setSavingPw(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast({ title: t("sidebar.passwordChanged"), description: t("sidebar.passwordUpdated") })
      setPwForm({ oldPassword: "", newPassword: "", confirmPassword: "" })
    } catch (e) {
      toast({ title: t("common.error"), description: e instanceof Error ? e.message : t("common.error"), variant: "destructive" })
    } finally {
      setSavingPw(false)
    }
  }

  const dashboardHref = user?.role ? `/dashboard/${user.role}` : "/dashboard"

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile) return null

  const roleLabel = profile.role === "citizen" ? t("auth.citizen") : profile.role === "police" ? t("auth.policeOfficer") : t("auth.adminAuditor")

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={dashboardHref}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("profile.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("profile.desc")}</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-8 w-8" />
            </div>
            <div>
              <CardTitle>{profile.name}</CardTitle>
              <CardDescription className="flex items-center gap-1.5 mt-1">
                <Shield className="h-3.5 w-3.5" />
                {roleLabel}
                {profile.emailVerified && (
                  <span className="flex items-center gap-1 text-success text-xs ml-2">
                    <BadgeCheck className="h-3.5 w-3.5" /> {t("profile.verified")}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Account Info (read-only) */}
          <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("profile.accountInfo")}</p>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t("profile.email")}</p>
                <p className="font-medium text-foreground">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">{t("profile.userId")}</p>
                <p className="font-mono text-xs text-foreground">{profile.userId}</p>
              </div>
            </div>
            {profile.pincode && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("profile.jurisdictionPincode")}</p>
                  <p className="font-medium text-foreground">{profile.pincode}</p>
                </div>
              </div>
            )}
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("profile.personalDetails")}</p>

            <div className="space-y-2">
              <Label htmlFor="name">{t("auth.fullName")}</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" placeholder={t("profile.fullNamePlaceholder")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("auth.phone")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="pl-9"
                  placeholder={t("auth.phonePlaceholder")}
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Citizen-specific fields */}
            {profile.role === "citizen" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="gender">{t("auth.gender")}</Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">{t("auth.selectGender")}</option>
                    <option value="male">{t("auth.male")}</option>
                    <option value="female">{t("auth.female")}</option>
                    <option value="other">{t("auth.other")}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">{t("auth.dateOfBirth")}</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dob"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="pl-9"
                      onKeyDown={(e) => e.preventDefault()}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Police-specific fields */}
            {profile.role === "police" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="badge">{t("profile.badgeLabel")}</Label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="badge" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} className="pl-9" placeholder={t("profile.badgePlaceholder")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="station">{t("admin.users.policeStation")}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="station" value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} className="pl-9" placeholder={t("profile.stationPlaceholder")} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Save button */}
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("profile.saving")}</> : <><Save className="mr-2 h-4 w-4" /> {t("profile.saveChanges")}</>}
          </Button>


        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> {t("sidebar.changePassword")}
          </CardTitle>
          <CardDescription>{t("profile.changePwDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="old-password">{t("sidebar.currentPassword")}</Label>
            <div className="relative">
              <Input
                id="old-password"
                type={showOld ? "text" : "password"}
                value={pwForm.oldPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, oldPassword: e.target.value }))}
                placeholder={t("sidebar.enterCurrentPassword")}
                className="pr-10"
              />
              <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowOld((v) => !v)}>
                {showOld ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">{t("sidebar.newPassword")}</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNew ? "text" : "password"}
                value={pwForm.newPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder={t("sidebar.atLeast8Chars")}
                className="pr-10"
              />
              <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowNew((v) => !v)}>
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t("sidebar.confirmNewPassword")}</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? "text" : "password"}
                value={pwForm.confirmPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder={t("sidebar.reEnterNewPassword")}
                className="pr-10"
              />
              <button type="button" className="absolute right-3 top-2.5 text-muted-foreground" onClick={() => setShowConfirm((v) => !v)}>
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
              <p className="text-xs text-destructive">{t("profile.pwMismatch")}</p>
            )}
          </div>

          <Button onClick={handleChangePassword} disabled={savingPw} className="w-full">
            {savingPw ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("profile.updating")}</> : <><KeyRound className="mr-2 h-4 w-4" /> {t("sidebar.updatePassword")}</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
