"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { User, Mail, Phone, Shield, BadgeCheck, Building2, Calendar, Loader2, Save, ArrowLeft } from "lucide-react"
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
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login")
  }, [isLoading, isAuthenticated, router])

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
        toast({ title: "Error", description: "Could not load profile.", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [toast])

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
      toast({ title: "Profile Updated", description: "Your profile has been saved successfully." })
    } catch (err) {
      toast({ title: "Update Failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" })
    } finally {
      setSaving(false)
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

  const roleLabel = profile.role === "citizen" ? "Citizen" : profile.role === "police" ? "Police Officer" : "Administrator"

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={dashboardHref}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground text-sm">View and update your account details</p>
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
                    <BadgeCheck className="h-3.5 w-3.5" /> Verified
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Account Info (read-only) */}
          <div className="rounded-lg bg-muted/50 border border-border p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Account Information</p>
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">User ID</p>
                <p className="font-mono text-xs text-foreground">{profile.userId}</p>
              </div>
            </div>
            {profile.pincode && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Jurisdiction Pincode</p>
                  <p className="font-medium text-foreground">{profile.pincode}</p>
                </div>
              </div>
            )}
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Details</p>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="pl-9" placeholder="Your full name" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="pl-9"
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                />
              </div>
            </div>

            {/* Citizen-specific fields */}
            {profile.role === "citizen" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
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
                  <Label htmlFor="badge">Badge Number</Label>
                  <div className="relative">
                    <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="badge" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} className="pl-9" placeholder="e.g. MP/2024/001" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="station">Police Station</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="station" value={policeStation} onChange={(e) => setPoliceStation(e.target.value)} className="pl-9" placeholder="e.g. Navrangpura P.S." />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Save button */}
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="w-full">
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            To change your password, use the <strong>Change Password</strong> option in the sidebar.
          </p>

        </CardContent>
      </Card>
    </div>
  )
}
